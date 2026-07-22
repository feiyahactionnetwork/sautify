// DDEX-DSR-aligned export.
//
// Emits a tab-separated, record-typed flat file loosely following the DDEX
// Digital Sales Reporting (DSR) Royalty Reporting profile: one usage line per
// distinct ISRC, grouped under the reporting outlet (the licensed venue), with
// a period summary and a footer. Every line carries the evidence ledger's
// chain hash so a recipient CMO can independently verify the batch the report
// was derived from.
//
// This is a v0, human-inspectable export — DSR-*aligned*, not a certified DDEX
// message. It intentionally uses DSR-style record types (HEAD/OU/RU/SU/FOOT)
// and controlled-vocabulary-style values so the shape maps cleanly onto a real
// DSR pipeline later, but it should not be presented as a conformant DDEX file
// until validated against the DSR profile schema.

const TAB = '\t'
const PROFILE = 'RoyaltyReporting'
const PROFILE_VERSION = '3'
const USE_TYPE = 'PublicPerformance'
// No DSR standard CommercialModelType maps cleanly to a Kenyan venue blanket
// licence, so this is a Sautify-local code, clearly namespaced.
const COMMERCIAL_MODEL = 'SFY-PublicPerformanceLicence'

// Flat fields are tab-delimited, so any tab/newline inside a value would
// corrupt the record. Collapse whitespace to single spaces.
function esc(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[\t\r\n]+/g, ' ').trim()
}

function isoDateTime(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// Group the itemised plays[] payload into one usage record per ISRC.
function aggregateByIsrc(plays) {
  const byIsrc = new Map()
  for (const p of plays) {
    if (!p || !p.isrc) continue
    const existing = byIsrc.get(p.isrc)
    if (existing) {
      existing.count += 1
    } else {
      byIsrc.set(p.isrc, { isrc: p.isrc, title: p.title || '', artist: p.artist || '', count: 1 })
    }
  }
  // Deterministic ordering so the export is byte-stable for a given input.
  return Array.from(byIsrc.values()).sort((a, b) => a.isrc.localeCompare(b.isrc))
}

/**
 * Build a DSR-aligned flat file from a formatted ledger entry and its evidence
 * payload.
 *
 * @param {object} entry   formatEntry() output (summary + hashes).
 * @param {object|null} payload  full evidence payload from the blob store
 *                               (carries the itemised plays[]); may be null for
 *                               older entries, in which case a summary-only file
 *                               is emitted.
 * @param {object} [opts]
 * @param {string} [opts.sender='Sautify']
 * @param {string} [opts.recipient='LicensedCMO']
 * @param {string} [opts.territory='KE']  ISO 3166-1 alpha-2.
 * @param {Date}   [opts.now=new Date()]  message-creation timestamp (injectable
 *                                        for deterministic tests).
 * @returns {string} the flat-file body.
 */
export function buildDsrFlatFile(entry, payload, opts = {}) {
  const sender = esc(opts.sender || 'Sautify')
  const recipient = esc(opts.recipient || 'LicensedCMO')
  const territory = esc(opts.territory || 'KE')
  const now = opts.now instanceof Date ? opts.now : new Date()

  const period = entry.reportingPeriod || {}
  const venue = entry.venue || {}
  const summary = entry.playCountSummary || {}
  const nrr = entry.nrrCrossCheck || {}
  const chainHash = esc(entry.chainHash)

  const plays = Array.isArray(payload?.plays) ? payload.plays : []
  const usageRows = aggregateByIsrc(plays)

  const messageId = `SFY-DSR-${entry.id}-${isoDateTime(now).slice(0, 10).replace(/-/g, '')}`

  const records = []

  // Provenance line — ignored by strict parsers (leading '#'), read by humans.
  records.push(
    `# DDEX-DSR-aligned usage report (Royalty Reporting profile) — Sautify v0. ` +
      `Not a certified DDEX file. RU lines itemise the plays carried in this evidence batch; ` +
      `SU reflects the period summary. Verify against evidence chain hash ${chainHash}.`,
  )

  // HEAD — message header.
  records.push(
    [
      'HEAD',
      messageId,
      isoDateTime(now),
      sender,
      recipient,
      PROFILE,
      PROFILE_VERSION,
      territory,
      esc(period.start),
      esc(period.end),
    ].join(TAB),
  )

  // OU — reporting outlet (the licensed premises), keyed on its SBP reference.
  records.push(['OU', esc(venue.sbpReference), esc(venue.name)].join(TAB))

  // RU — one usage record per distinct ISRC.
  for (const row of usageRows) {
    records.push(
      [
        'RU',
        esc(row.isrc),
        esc(row.title),
        esc(row.artist),
        USE_TYPE,
        COMMERCIAL_MODEL,
        String(row.count),
        territory,
        chainHash,
      ].join(TAB),
    )
  }

  // SU — period summary (matches the on-chain evidence totals).
  records.push(
    [
      'SU',
      String(usageRows.length),
      String(summary.totalPlays ?? ''),
      String(summary.uniqueTracks ?? ''),
      String(nrr.matched ?? ''),
      String(nrr.unmatched ?? ''),
    ].join(TAB),
  )

  // FOOT — count of typed records (HEAD, OU, RU*, SU, FOOT), excluding the '#'
  // provenance line, plus the evidence anchor. records currently holds the
  // comment + every typed record except FOOT, so: (records.length - 1) typed
  // records so far, + 1 for FOOT itself.
  const typedRecordCount = records.length - 1 /* '#' provenance line */ + 1 /* FOOT itself */
  records.push(['FOOT', String(typedRecordCount), chainHash].join(TAB))

  return records.join('\n') + '\n'
}
