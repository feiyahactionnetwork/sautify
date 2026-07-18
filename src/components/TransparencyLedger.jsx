import { useEffect, useState } from 'react'
import Reveal from './Reveal'
import AnimatedText from './AnimatedText'

const GENESIS_HASH = '0'.repeat(64)

const DEMO_VENUES = [
  { name: 'Havana Bar & Grill', sbpReference: 'SBP-2026-00412' },
  { name: 'Skylux Rooftop', sbpReference: 'SBP-2026-00877' },
  { name: 'The Alchemist Nairobi', sbpReference: 'SBP-2026-01203' },
]

const DEMO_TRACKS = [
  { isrc: 'KEA1P2600123', title: 'Sura Yako', artist: 'Sauti Sol' },
  { isrc: 'KEA2B2600456', title: 'Mwaki', artist: 'Zerb & Sofiya Nzau' },
  { isrc: 'KEA3C2600789', title: 'Anguka Nayo', artist: 'Ethic Entertainment' },
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function buildDemoPayload() {
  const venue = DEMO_VENUES[Math.floor(Math.random() * DEMO_VENUES.length)]
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 30)

  const plays = DEMO_TRACKS.map((t) => ({
    isrc: t.isrc,
    title: t.title,
    artist: t.artist,
    playedAt: new Date(end.getTime() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString(),
    confidence: Math.round((0.9 + Math.random() * 0.09) * 100) / 100,
  }))

  const totalPlays = 400 + Math.floor(Math.random() * 600)
  const uniqueTracks = 30 + Math.floor(Math.random() * 90)
  const unmatched = Math.floor(Math.random() * 6)

  return {
    venue,
    reportingPeriod: { start: isoDate(start), end: isoDate(end) },
    plays,
    playCountSummary: { totalPlays, uniqueTracks },
    nrrCrossCheck: { matched: uniqueTracks - unmatched, unmatched },
  }
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyChain(entries) {
  let expectedPrev = GENESIS_HASH
  for (const entry of entries) {
    const actualPrev = entry.prevHash ?? GENESIS_HASH
    if (actualPrev !== expectedPrev) {
      return { ok: false, brokenAt: entry.id, reason: 'prevHash does not match the previous entry' }
    }
    const recomputed = await sha256Hex(actualPrev + entry.evidenceHash)
    if (recomputed !== entry.chainHash) {
      return { ok: false, brokenAt: entry.id, reason: 'chainHash does not match prevHash + evidenceHash' }
    }
    expectedPrev = entry.chainHash
  }
  return { ok: true }
}

function truncateHash(hash) {
  if (!hash) return 'none'
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

export default function TransparencyLedger() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [settlingId, setSettlingId] = useState(null)
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)

  async function loadEntries() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ledger')
      if (!res.ok) throw new Error(`Failed to load ledger (${res.status})`)
      const data = await res.json()
      setEntries(data.entries)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  async function handleSimulatePlay() {
    setSubmitting(true)
    setError(null)
    setVerifyResult(null)
    try {
      const res = await fetch('/api/ledger/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDemoPayload()),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to submit evidence (${res.status})`)
      }
      await loadEntries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSettle(id) {
    setSettlingId(id)
    setError(null)
    try {
      const demoClasses = ['bar_medium', 'bar_large', 'nightclub', 'restaurant']
      const res = await fetch(`/api/ledger/${id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCategory: 'venue',
          venueClass: demoClasses[Math.floor(Math.random() * demoClasses.length)],
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to settle entry ${id} (${res.status})`)
      }
      await loadEntries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSettlingId(null)
    }
  }

  async function handleVerifyChain() {
    setVerifying(true)
    try {
      const result = await verifyChain(entries)
      setVerifyResult(result)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <section id="ledger" className="py-24 md:py-32 px-6 bg-ink border-y border-line scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-center text-fg max-w-3xl mx-auto leading-tight"
          segments={[
            { text: 'A Public, ' },
            { text: 'Tamper-Evident', className: 'text-gold' },
            { text: ' Ledger' },
          ]}
        />

        <AnimatedText
          as="p"
          stagger={12}
          baseDelay={300}
          className="mt-8 max-w-3xl mx-auto text-center text-lg text-muted leading-relaxed"
          text="This is a live, working prototype of the interoperability contract described above: every submitted evidence batch is hash-chained to the one before it, stored publicly, and independently verifiable, right here, by anyone."
        />

        <Reveal delay={200}>
          <div className="mt-8 max-w-3xl mx-auto rounded-xl border border-gold/30 bg-card p-6 text-center">
            <p className="text-sm text-muted leading-relaxed">
              This is a live technical demo running on Sautify's own infrastructure. It is{' '}
              <span className="text-fg font-medium">not connected to KECOBO's or eCitizen's live systems.</span>{' '}
              "Verify Chain Integrity" confirms the ledger's hash-chain linkage hasn't been tampered with, not that
              every raw play was fingerprinted from a real venue.
            </p>
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleSimulatePlay}
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-gold px-7 py-3.5 text-base font-semibold text-ink transition-all duration-200 ease-out hover:bg-gold/90 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {submitting ? 'Submitting…' : 'Simulate a Play Event'}
            </button>
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={verifying || entries.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-line px-7 py-3.5 text-base font-semibold text-fg transition-all duration-200 ease-out hover:border-emeraldLight/50 hover:text-emeraldLight hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {verifying ? 'Verifying…' : 'Verify Chain Integrity'}
            </button>
          </div>
        </Reveal>

        {verifyResult && (
          <Reveal>
            <div
              className={`mt-6 max-w-xl mx-auto rounded-lg border p-4 text-center text-sm font-medium ${
                verifyResult.ok
                  ? 'border-emerald/40 bg-emerald/10 text-emeraldLight'
                  : 'border-red-500/40 bg-red-500/10 text-red-400'
              }`}
            >
              {verifyResult.ok
                ? `✓ Chain verified: all ${entries.length} entries link correctly, genesis to tip.`
                : `✗ Chain broken at entry ${verifyResult.brokenAt}: ${verifyResult.reason}`}
            </div>
          </Reveal>
        )}

        {error && (
          <Reveal>
            <div className="mt-6 max-w-xl mx-auto rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-400">
              {error}
            </div>
          </Reveal>
        )}

        <div className="mt-14">
          {loading ? (
            <p className="text-center text-muted">Loading ledger…</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted">
              No entries yet. Click "Simulate a Play Event" to submit the first one.
            </p>
          ) : (
            <div className="grid gap-4">
              {entries
                .slice()
                .reverse()
                .map((entry, i) => (
                  <Reveal key={entry.id} delay={Math.min(i, 6) * 80}>
                    <div className="rounded-xl border border-line bg-card p-6 transition-all duration-300 ease-out hover:border-gold/30">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-fg font-bold">#{entry.id}</span>
                            <span className="text-fg font-medium">{entry.venue.name}</span>
                            <span
                              className={`text-xs rounded-full px-2.5 py-1 border ${
                                entry.settlementStatus === 'settled'
                                  ? 'bg-emerald/15 text-emeraldLight border-emerald/30'
                                  : 'bg-gold/10 text-gold border-gold/30'
                              }`}
                            >
                              {entry.settlementStatus === 'settled' ? 'Settled' : 'Pending'}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-muted">
                            {entry.reportingPeriod.start} → {entry.reportingPeriod.end} ·{' '}
                            {entry.playCountSummary.totalPlays} plays · {entry.nrrCrossCheck.matched} matched /{' '}
                            {entry.nrrCrossCheck.unmatched} unmatched
                          </div>
                          <div className="mt-2 font-mono text-xs text-muted">
                            evidence {truncateHash(entry.evidenceHash)} · prev {truncateHash(entry.prevHash)} · chain{' '}
                            {truncateHash(entry.chainHash)}
                          </div>
                          {entry.settlement && (
                            <div className="mt-2 text-xs text-emeraldLight">
                              KES {entry.settlement.artistAmountKes} to artists · KES {entry.settlement.adminAmountKes}{' '}
                              admin · ref {entry.settlement.cmoDisbursementRef}
                            </div>
                          )}
                        </div>

                        {entry.settlementStatus !== 'settled' && (
                          <button
                            type="button"
                            onClick={() => handleSettle(entry.id)}
                            disabled={settlingId === entry.id}
                            className="flex-shrink-0 inline-flex items-center justify-center rounded-md border border-emerald/40 bg-emerald/10 px-4 py-2 text-sm font-semibold text-emeraldLight transition-all duration-200 ease-out hover:bg-emerald/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {settlingId === entry.id ? 'Settling…' : 'Simulate eCitizen Settlement'}
                          </button>
                        )}
                      </div>
                    </div>
                  </Reveal>
                ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
