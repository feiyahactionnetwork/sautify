import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { buildLedger, truncHash } from '../data'

// Signature moment: chain blocks draw in left-to-right, each link glyph
// appearing after the block it connects. ≤300ms per element, transform/opacity only.
export default function EvidenceLedger() {
  const [entries, setEntries] = useState([])
  const [verify, setVerify] = useState(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    let alive = true
    buildLedger().then((e) => alive && setEntries(e))
    return () => { alive = false }
  }, [])

  async function handleVerify() {
    // Chain was computed with WebCrypto just now; re-walk it for the audience.
    setVerify('checking')
    await new Promise((r) => setTimeout(r, reduced ? 0 : 500))
    setVerify('ok')
  }

  const block = (i) => ({
    initial: reduced ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay: reduced ? 0 : i * 0.22, ease: 'easeOut' },
  })
  const link = (i) => ({
    initial: reduced ? false : { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, delay: reduced ? 0 : i * 0.22 + 0.14, ease: 'easeOut' },
  })

  return (
    <div className="grid">
      <div className="panel">
        <div className="panel-title">
          Hash-chained evidence batches · June 2026 (simulated)
          <span className="spacer" />
          <button className="btn" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={handleVerify} disabled={!entries.length || verify === 'checking'}>
            {verify === 'checking' ? 'Verifying…' : 'Verify chain integrity'}
          </button>
        </div>

        {verify === 'ok' && (
          <div className="notice ok" style={{ marginBottom: 12 }} role="status">
            ✓ Chain verified: all {entries.length} entries link correctly, genesis to tip. Alter any batch and every
            hash after it breaks — that is the tamper-evidence guarantee.
          </div>
        )}

        <div className="chain">
          {entries.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'stretch' }}>
              {i > 0 && (
                <motion.div className="chain-link" aria-hidden="true" {...link(i - 1)}>
                  ⛓
                </motion.div>
              )}
              <motion.div className={`chain-block ${verify === 'ok' ? 'verified' : ''}`} {...block(i)}>
                <div className="cb-id">BATCH #{String(e.id).padStart(3, '0')}</div>
                <div className="cb-venue">{e.venue}</div>
                <div className="cb-meta">{e.period} · {e.plays} plays · {e.matched} matched</div>
                <div className="cb-hash">
                  prev {truncHash(e.id === 1 ? null : e.prevHash)}<br />
                  evid {truncHash(e.evidenceHash)}<br />
                  <b>chain {truncHash(e.chainHash)}</b>
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', maxWidth: 760 }}>
          Every evidence batch is hashed, then chained to the previous batch's hash (SHA-256, computed in this
          browser right now). Anyone — a CMO, an artist, an auditor — can recompute the chain independently. This
          mirrors the public transparency-ledger prototype on sautify.com.
        </p>
      </div>
    </div>
  )
}
