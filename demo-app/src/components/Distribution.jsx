import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DISTRIBUTION_ROWS, SAMPLE_TARIFF } from '../data'
import CountUp from './CountUp'

export default function Distribution() {
  const reduced = useReducedMotion()
  const artistShare = SAMPLE_TARIFF.artistPct
  const artistKsh = (SAMPLE_TARIFF.totalKsh * artistShare) / 100
  const adminKsh = SAMPLE_TARIFF.totalKsh - artistKsh
  const [filled, setFilled] = useState(reduced)

  useEffect(() => {
    const t = requestAnimationFrame(() => setFilled(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div className="grid">
      <div className="panel">
        <div className="panel-title">
          Artist share — minimum 70% under the eCitizen royalty directive
          <span className="spacer" />
          <span className="pill">illustrative</span>
        </div>
        <div className="split-bar" role="img" aria-label={`${artistShare}% artist share, ${100 - artistShare}% administration`}>
          <div style={{ width: `${artistShare}%`, overflow: 'hidden' }}>
            <motion.div
              className="split-artist"
              style={{ height: '100%', transformOrigin: 'left' }}
              initial={false}
              animate={{ scaleX: filled ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.3, ease: [0.25, 1, 0.5, 1] }}
            />
          </div>
          <div className="split-admin" style={{ flex: 1 }} />
        </div>
        <div className="split-legend">
          <span>
            Artists · {artistShare}% · <span className="mono" style={{ color: 'var(--green)' }}>KSh <CountUp value={artistKsh} /></span>
          </span>
          <span>
            Administration · {100 - artistShare}% · <span className="mono">KSh <CountUp value={adminKsh} /></span>
          </span>
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Illustrative split of one published sample tariff — {SAMPLE_TARIFF.label}: KSh{' '}
          {SAMPLE_TARIFF.totalKsh.toLocaleString('en-KE')}. Actual distributions are computed by the licensed CMO
          from its published tariff schedule; Sautify supplies the play-log evidence.
        </p>
      </div>

      <div className="panel">
        <div className="panel-title">Play-weighted allocation · June 2026 (simulated)</div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Work</th><th>Artist</th><th className="mono">ISRC</th>
                <th className="num">Verified plays</th><th className="num">Share of pool</th>
              </tr>
            </thead>
            <tbody>
              {DISTRIBUTION_ROWS.map((r, i) => (
                <tr key={r.isrc}>
                  <td className="dim mono">{String(i + 1).padStart(2, '0')}</td>
                  <td style={{ fontWeight: 600 }}>{r.title}</td>
                  <td className="dim">{r.artist}</td>
                  <td className="mono dim">{r.isrc}</td>
                  <td className="num">{r.plays}</td>
                  <td className="num" style={{ color: 'var(--green)' }}>{r.sharePct}%</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="dim">Remaining 306 works (long tail)</td>
                <td className="num">5,420</td>
                <td className="num dim">21.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Shares are expressed as percentages of the distributable pool, not currency amounts — the CMO applies
          its own tariff schedule to convert shares into payouts.
        </p>
      </div>
    </div>
  )
}
