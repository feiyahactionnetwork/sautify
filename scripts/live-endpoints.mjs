// Live endpoint tests — drives every Netlify function handler in-process
// against a real Supabase database, covering the database-backed happy paths
// that `npm test` (pure unit tests, no network) cannot reach.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:live
//
// ⚠️ DESTRUCTIVE. It TRUNCATES ledger_entries, catalog_works,
// catalog_fingerprints and ledger_submission_log before seeding known
// fixtures, so it is deterministic and re-runnable. NEVER point it at
// production — use a disposable test project.
//
// Not covered here: POST /api/ledger/evidence, which additionally writes the
// evidence blob to Netlify Blobs and so needs a real Netlify token. Its
// validation and x402 behaviour are covered by the offline tests.

const ROOT = '/home/user/sautify/netlify/functions'
const results = []
let group = ''
const setGroup = (g) => (group = g)

async function check(name, run, verify) {
  try {
    const res = await run()
    let body = null
    try {
      body = JSON.parse(res.body)
    } catch {
      body = res.body
    }
    const verdict = verify(res, body)
    results.push({ group, name, ok: verdict === true, got: res.statusCode, detail: verdict === true ? '' : verdict })
  } catch (err) {
    results.push({ group, name, ok: false, got: 'THREW', detail: err.message.slice(0, 90) })
  }
}

let n = 0
const load = async (f) => (await import(`${ROOT}/${f}?v=${n++}`)).handler
const ev = (o = {}) => ({ httpMethod: 'GET', path: '/', headers: { host: 'sautify.co.ke' }, body: null, ...o })

// Reset to a known state so the run is deterministic and repeatable.
const { getSupabaseAdmin } = await import(`${ROOT}/_shared/supabaseAdmin.js`)
const db = getSupabaseAdmin()
for (const t of ['catalog_fingerprints', 'catalog_works', 'ledger_entries', 'ledger_submission_log']) {
  const { error } = await db.from(t).delete().gte('id', 0)
  if (error) throw new Error(`reset ${t}: ${error.message}`)
}
{
  const { error } = await db.rpc('append_ledger_entry', {
    p_venue_name: 'Havana Bar & Grill',
    p_venue_sbp_reference: 'SBP-2026-00412',
    p_reporting_period_start: '2026-01-01',
    p_reporting_period_end: '2026-01-31',
    p_total_plays: 412,
    p_unique_tracks: 37,
    p_nrr_matched: 30,
    p_nrr_unmatched: 7,
    p_payload_hash: 'a'.repeat(64),
    p_blob_key: 'blob-a',
  })
  if (error) throw new Error(`seed ledger: ${error.message}`)
}
{
  const { error } = await db.rpc('ingest_catalog_work', {
    p_isrc: 'KEA1P2600123',
    p_title: 'Sura Yako',
    p_artist_name: 'Sauti Sol',
    p_rights_grant_type: 'artist_onboarding',
    p_rights_granted_by: 'test-harness@sautify.test',
    p_rights_grant_ref: 'TEST-001',
    p_fingerprint_version: 'olaf-test',
    p_fingerprints: Array.from({ length: 40 }, (_, i) => ({ hash: 1001 + i, offset: (i + 1) * 10 })),
  })
  if (error) throw new Error(`seed catalogue: ${error.message}`)
}
const SEED_ID = (await db.from('ledger_entries').select('id').order('id').limit(1).single()).data.id

// ---- list-ledger -----------------------------------------------------------
setGroup('GET /api/ledger  (list-ledger)')
{
  const h = await load('list-ledger.js')
  await check('returns the seeded chain', () => h(ev({ path: '/api/ledger' })), (r, b) => {
    if (r.statusCode !== 200) return `status ${r.statusCode}: ${b?.error}`
    if (!Array.isArray(b.entries) || b.entries.length < 1) return 'no entries'
    const e = b.entries[0]
    if (e.venue?.name !== 'Havana Bar & Grill') return `venue ${JSON.stringify(e.venue)}`
    if (e.playCountSummary?.totalPlays !== 412) return 'totalPlays wrong'
    if (!/^[0-9a-f]{64}$/.test(e.chainHash)) return 'chainHash malformed'
    if (e.settlementStatus !== 'pending') return `status ${e.settlementStatus}`
    if (e.settlement !== null) return 'unsettled entry must have null settlement'
    return true
  })
}

// ---- catalog-ingest --------------------------------------------------------
setGroup('POST /api/catalog/ingest  (catalog-ingest)')
{
  const h = await load('catalog-ingest.js')
  const fps = Array.from({ length: 30 }, (_, i) => ({ hash: 5000 + i, offset: i * 10 }))
  await check(
    'ingests a work with fingerprints',
    () =>
      h(
        ev({
          httpMethod: 'POST',
          path: '/api/catalog/ingest',
          body: JSON.stringify({
            isrc: 'KEA2B2600456',
            title: 'Mwaki',
            artistName: 'Zerb & Sofiya Nzau',
            rightsGrantType: 'artist_onboarding',
            rightsGrantedBy: 'test-harness@sautify.test',
            rightsGrantRef: 'TEST-002',
            rightsGrantAccepted: true,
            fingerprintVersion: 'olaf-test',
            fingerprints: fps,
          }),
        }),
      ),
    (r, b) => {
      if (r.statusCode !== 201 && r.statusCode !== 200) return `status ${r.statusCode}: ${b?.error}`
      if (b?.fingerprintCount !== 30 && b?.fingerprint_count !== 30) return `count ${JSON.stringify(b).slice(0, 120)}`
      return true
    },
  )
  await check(
    'rejects an unknown rights grant type',
    () =>
      h(
        ev({
          httpMethod: 'POST',
          path: '/api/catalog/ingest',
          body: JSON.stringify({
            title: 'X',
            artistName: 'Y',
            rightsGrantType: 'stolen',
            rightsGrantedBy: 'z',
            rightsGrantAccepted: true,
            fingerprints: [{ hash: 1, offset: 0 }],
          }),
        }),
      ),
    (r) => (r.statusCode === 400 ? true : `expected 400, got ${r.statusCode}`),
  )
}

// ---- catalog-match ---------------------------------------------------------
setGroup('POST /api/catalog/match  (catalog-match)')
{
  const h = await load('catalog-match.js')
  // Query aligned to the seeded work: same hashes, offsets shifted by a
  // constant, which is exactly the aligned-delta vote the RPC looks for.
  const aligned = Array.from({ length: 20 }, (_, i) => ({ hash: 1001 + i, offset: (i + 1) * 10 - 7 }))
  await check(
    'matches the seeded work by aligned votes',
    () => h(ev({ httpMethod: 'POST', path: '/api/catalog/match', body: JSON.stringify({ query: aligned }) })),
    (r, b) => {
      if (r.statusCode !== 200) return `status ${r.statusCode}: ${b?.error}`
      if (!b.matched) return `no match: ${JSON.stringify(b).slice(0, 140)}`
      if (b.best?.title !== 'Sura Yako') return `matched wrong work: ${b.best?.title}`
      if (b.best?.isrc !== 'KEA1P2600123') return `isrc ${b.best?.isrc}`
      if (b.best?.votes < 5) return `votes ${b.best?.votes}`
      return true
    },
  )
  await check(
    'returns no match for unknown hashes',
    () =>
      h(
        ev({
          httpMethod: 'POST',
          path: '/api/catalog/match',
          body: JSON.stringify({ query: Array.from({ length: 20 }, (_, i) => ({ hash: 999000 + i, offset: i })) }),
        }),
      ),
    (r, b) => {
      if (r.statusCode !== 200) return `status ${r.statusCode}: ${b?.error}`
      if (b.matched) return 'false positive match'
      return true
    },
  )
  await check(
    'respects minVotes',
    () =>
      h(
        ev({
          httpMethod: 'POST',
          path: '/api/catalog/match',
          body: JSON.stringify({ query: [{ hash: 1001, offset: 3 }], minVotes: 5 }),
        }),
      ),
    (r, b) => (r.statusCode === 200 && !b.matched ? true : `one hash should not out-vote minVotes: ${JSON.stringify(b).slice(0, 100)}`),
  )
}

// ---- simulate-settlement ---------------------------------------------------
setGroup('POST /api/ledger/:id/settle  (simulate-settlement)')
{
  const h = await load('simulate-settlement.js')
  await check(
    'settles the seeded entry with the 70/30 split',
    () => h(ev({ httpMethod: 'POST', path: `/api/ledger/${SEED_ID}/settle`, body: JSON.stringify({ invoiceAmountKes: 30000 }) })),
    (r, b) => {
      if (r.statusCode !== 200) return `status ${r.statusCode}: ${b?.error}`
      if (b.settlementStatus !== 'settled') return `status ${b.settlementStatus}`
      if (b.settlement?.artistAmountKes !== 21000) return `artist ${b.settlement?.artistAmountKes} (expected 21000)`
      if (b.settlement?.adminAmountKes !== 9000) return `admin ${b.settlement?.adminAmountKes} (expected 9000)`
      if (!b.settlement?.cmoDisbursementRef) return 'no disbursement ref'
      return true
    },
  )
  await check(
    'refuses to double-settle',
    () => h(ev({ httpMethod: 'POST', path: `/api/ledger/${SEED_ID}/settle`, body: '{}' })),
    (r, b) => (r.statusCode === 409 ? true : `expected 409, got ${r.statusCode}: ${b?.error}`),
  )
  await check(
    '404 for a missing entry',
    () => h(ev({ httpMethod: 'POST', path: '/api/ledger/9999/settle', body: '{}' })),
    (r) => (r.statusCode === 404 ? true : `expected 404, got ${r.statusCode}`),
  )
}

// ---- export-dsr ------------------------------------------------------------
setGroup('GET /api/ledger/:id/export.dsr  (export-dsr)')
{
  const h = await load('export-dsr.js')
  await check(
    'emits a DDEX-DSR flat file carrying the chain hash',
    () => h(ev({ path: `/api/ledger/${SEED_ID}/export.dsr` })),
    (r, b) => {
      if (r.statusCode !== 200) return `status ${r.statusCode}: ${typeof b === 'string' ? b.slice(0, 90) : b?.error}`
      const text = String(b)
      if (!/^HEAD\t/m.test(text)) return 'no HEAD record'
      if (!/^FOOT\t/m.test(text)) return 'no FOOT record'
      if (!/[0-9a-f]{64}/.test(text)) return 'no chain hash in file'
      if (!r.headers['Content-Type']?.includes('tab-separated')) return `content-type ${r.headers['Content-Type']}`
      if (!r.headers['Content-Disposition']?.includes(`sautify-dsr-${SEED_ID}.tsv`)) return 'bad filename'
      return true
    },
  )
  await check(
    '404 for a missing entry',
    () => h(ev({ path: '/api/ledger/9999/export.dsr' })),
    (r) => (r.statusCode === 404 ? true : `expected 404, got ${r.statusCode}`),
  )
}

// ---- rate limiter ----------------------------------------------------------
setGroup('rate limiter  (check_ledger_rate_limit)')
{
  const sb = db
  await check(
    'allows 5 then blocks the 6th in one window',
    async () => {
      const verdicts = []
      for (let i = 0; i < 6; i++) {
        const { data, error } = await sb.rpc('check_ledger_rate_limit', {
          p_ip_hash: 'test-harness-ip',
          p_max_count: 5,
          p_window_seconds: 600,
        })
        if (error) throw new Error(error.message)
        verdicts.push(data)
      }
      return { statusCode: 200, body: JSON.stringify(verdicts) }
    },
    (r, b) => {
      const expected = [true, true, true, true, true, false]
      return JSON.stringify(b) === JSON.stringify(expected) ? true : `got ${JSON.stringify(b)}`
    },
  )
}

// ---- keep-alive ------------------------------------------------------------
setGroup('scheduled  (keep-alive)')
{
  const h = await load('keep-alive.js')
  await check('pings the database successfully', () => h(), (r, b) =>
    r.statusCode === 200 && b?.ok === true ? true : `status ${r.statusCode}: ${JSON.stringify(b).slice(0, 80)}`,
  )
}

// ---- x402 on a live endpoint ----------------------------------------------
setGroup('x402 over a live database')
{
  process.env.SAUTIFY_X402_PAY_TO = '0x000000000000000000000000000000000000bEEF'
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, opts) => {
    const u = String(url)
    if (u.includes('/verify')) return { ok: true, json: async () => ({ isValid: true }) }
    if (u.includes('/settle'))
      return { ok: true, json: async () => ({ success: true, transaction: '0xLIVETX', network: 'base-sepolia' }) }
    return realFetch(url, opts)
  }

  const payment = Buffer.from(
    JSON.stringify({
      x402Version: 1,
      scheme: 'exact',
      network: 'base-sepolia',
      payload: { signature: '0xsig', authorization: { to: '0x0', value: '5000' } },
    }),
  ).toString('base64')

  const h = await load('list-ledger.js')
  await check(
    'unpaid request is refused',
    () => h(ev({ path: '/api/ledger' })),
    (r, b) => (r.statusCode === 402 && b.accepts?.[0]?.maxAmountRequired === '5000' ? true : `status ${r.statusCode}`),
  )
  await check(
    'paid request returns real ledger data and settles',
    () => h(ev({ path: '/api/ledger', headers: { host: 'sautify.co.ke', 'x-payment': payment } })),
    (r, b) => {
      if (r.statusCode !== 200) return `status ${r.statusCode}`
      if (!Array.isArray(b.entries) || !b.entries.length) return 'no data returned'
      const s = JSON.parse(Buffer.from(r.headers['X-PAYMENT-RESPONSE'], 'base64').toString())
      if (s.transaction !== '0xLIVETX') return 'settlement header missing'
      return true
    },
  )

  globalThis.fetch = realFetch
  delete process.env.SAUTIFY_X402_PAY_TO
}

// ---- report ----------------------------------------------------------------
let last = ''
let pass = 0
for (const r of results) {
  if (r.group !== last) {
    console.log(`\n\x1b[1m${r.group}\x1b[0m`)
    last = r.group
  }
  if (r.ok) pass++
  console.log(
    `  ${r.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${r.name.padEnd(48)} ${r.ok ? r.got : `\x1b[31m${r.detail}\x1b[0m`}`,
  )
}
console.log(`\n${pass}/${results.length} live checks passed\n`)
process.exit(pass === results.length ? 0 : 1)
