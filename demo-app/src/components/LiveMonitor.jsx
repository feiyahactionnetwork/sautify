import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { initialFeed, makeFeedEvent } from '../data'
import IdentifyPanel from './IdentifyPanel'
import CountUp from './CountUp'

const MAX_ROWS = 14

function VUMeters({ paused }) {
  const [levels, setLevels] = useState(() => Array.from({ length: 12 }, () => Math.random()))
  useEffect(() => {
    if (paused) return
    let t
    const tick = () => {
      if (!document.hidden) {
        setLevels((prev) => prev.map((v) => Math.max(0.06, Math.min(1, v + (Math.random() - 0.5) * 0.5))))
      }
      t = setTimeout(tick, 140)
    }
    tick()
    return () => clearTimeout(t)
  }, [paused])
  return (
    <div className="vu-wrap" aria-hidden="true">
      {levels.map((v, i) => (
        <div key={i} className={`vu-bar ${v > 0.82 ? 'hot' : ''}`} style={{ transform: `scaleY(${v.toFixed(3)})` }} />
      ))}
    </div>
  )
}

function timeStr(d) {
  return d.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })
}

export default function LiveMonitor({ paused, svc }) {
  const [feed, setFeed] = useState(initialFeed)
  const reduced = useReducedMotion()
  const liveCount = useRef(0)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => {
      if (document.hidden) return
      setFeed((prev) => [makeFeedEvent(), ...prev].slice(0, MAX_ROWS))
    }, 6000 + Math.random() * 4000)
    return () => clearInterval(t)
  }, [paused])

  function onMatch(match) {
    liveCount.current += 1
    setFeed((prev) => [
      {
        id: `live-${liveCount.current}-${Date.now()}`,
        at: new Date(),
        title: match.title,
        artist: match.artist,
        isrc: match.acrid,
        venue: match.source === 'microphone' ? 'This room (live mic)' : 'Uploaded file',
        confidence: Math.round(match.score),
        kind: match.mock ? 'mock' : 'live',
      },
      ...prev,
    ].slice(0, MAX_ROWS))
  }

  return (
    <div className="grid live-grid">
      <div className="grid">
        <div className="grid cols-3">
          <div className="panel kpi">
            <div className="kpi-value"><CountUp value={7191} /></div>
            <div className="kpi-label">Verified plays · June 2026 (simulated)</div>
            <div className="kpi-sub up">97.4% matched to registered works</div>
          </div>
          <div className="panel kpi">
            <div className="kpi-value"><CountUp value={312} /></div>
            <div className="kpi-label">Unique works detected (simulated)</div>
            <div className="kpi-sub">across 5 venues</div>
          </div>
          <div className="panel kpi">
            <div className="kpi-value">4<span className="dim">/5</span></div>
            <div className="kpi-label">Listeners online</div>
            <div className="kpi-sub">1 offline — Eldoret Sports Bar</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            Detection feed
            <span className="spacer" />
            {paused && <span className="pill amber">paused (P)</span>}
            <span className="pill">simulated{svc.state === 'ok' && !svc.mock ? ' + live-capable' : ''}</span>
          </div>
          <div>
            <AnimatePresence initial={false}>
              {feed.map((ev) => (
                <motion.div
                  key={ev.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, x: -12 }}
                  animate={
                    reduced
                      ? { opacity: 1 }
                      : ev.kind === 'live'
                        ? {
                            opacity: 1, x: 0,
                            backgroundColor: ['rgba(255,178,36,0.18)', 'rgba(62,207,142,0.10)'],
                            transition: { duration: 0.3, backgroundColor: { duration: 0.6 } },
                          }
                        : { opacity: 1, x: 0, transition: { duration: 0.22 } }
                  }
                  exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
                  className={`feed-row ${ev.kind === 'live' || ev.kind === 'mock' ? 'live-match' : ''}`}
                >
                  <span className="t">{timeStr(ev.at)}</span>
                  <span>
                    <span className="title">{ev.title}</span>
                    {ev.kind === 'live' && <span className="live-badge">LIVE MATCH — real detection</span>}
                    {ev.kind === 'mock' && <span className="live-badge mock-badge">MOCK MATCH — pipeline test</span>}
                    <div className="sub">
                      {ev.artist} · {ev.venue} · <span className="mono">{ev.isrc}</span>
                    </div>
                  </span>
                  <span className="conf" style={{ color: ev.confidence >= 95 ? 'var(--green)' : 'var(--fg)' }}>
                    {ev.confidence}%
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid">
        <IdentifyPanel onMatch={onMatch} svc={svc} />
        <div className="panel">
          <div className="panel-title">Room level · Havana Bar & Grill (simulated)</div>
          <VUMeters paused={paused} />
        </div>
        <div className="panel">
          <div className="panel-title">Pipeline</div>
          <table>
            <tbody>
              <tr><td>Capture</td><td className="num"><span className="pill green">nominal</span></td></tr>
              <tr><td>Fingerprint match</td><td className="num"><span className="pill green">nominal</span></td></tr>
              <tr><td>Catalogue cross-check</td><td className="num"><span className="pill green">nominal</span></td></tr>
              <tr><td>Evidence batching</td><td className="num"><span className="pill amber">next batch 18:00</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
