import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import LiveMonitor from './components/LiveMonitor'
import Sources from './components/Sources'
import Distribution from './components/Distribution'
import Reconciliation from './components/Reconciliation'
import EvidenceLedger from './components/EvidenceLedger'
import KecoboReport from './components/KecoboReport'

const TABS = [
  { id: 'live', label: 'Live monitor', el: LiveMonitor },
  { id: 'sources', label: 'Sources & devices', el: Sources },
  { id: 'distribution', label: 'Distribution', el: Distribution },
  { id: 'reconciliation', label: 'Reconciliation', el: Reconciliation },
  { id: 'ledger', label: 'Evidence ledger', el: EvidenceLedger },
  { id: 'report', label: 'KECOBO report', el: KecoboReport },
]

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export default function App() {
  const [tab, setTab] = useState('live')
  const [svc, setSvc] = useState({ state: 'checking', mock: false })
  const [paused, setPaused] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const reduced = useReducedMotion()
  const now = useClock()

  useEffect(() => {
    let alive = true
    async function check() {
      try {
        const res = await fetch('/api/health')
        const data = await res.json()
        if (alive) setSvc({ state: data.configured ? 'ok' : 'unconfigured', mock: Boolean(data.mock) })
      } catch {
        if (alive) setSvc({ state: 'down', mock: false })
      }
    }
    check()
    const t = setInterval(check, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const onKey = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    const n = parseInt(e.key, 10)
    if (n >= 1 && n <= 6) setTab(TABS[n - 1].id)
    else if (e.key === 'p' || e.key === 'P') setPaused((p) => !p)
    else if (e.key === 'f' || e.key === 'F') {
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen?.()
    } else if (e.key === '?') setShowKeys((s) => !s)
    else if (e.key === 'Escape') setShowKeys(false)
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const Active = TABS.find((t) => t.id === tab).el
  const eat = now.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false })

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">
          <strong>Sautify</strong>
          <span>Operations console</span>
        </div>
        <span className="demo-badge">Live demo · simulated data</span>
        <div className="topbar-right">
          <span
            className={`svc-chip ${svc.state === 'ok' ? 'ok' : svc.state === 'checking' ? '' : 'down'}`}
            title={svc.mock ? 'Recognition service in local mock mode — matches are NOT real detections' : undefined}
          >
            <span className="dot" />
            {svc.state === 'ok' && !svc.mock && 'recognition ready'}
            {svc.state === 'ok' && svc.mock && 'recognition MOCK'}
            {svc.state === 'checking' && 'checking…'}
            {svc.state === 'unconfigured' && 'no ACR keys'}
            {svc.state === 'down' && 'simulated only'}
          </span>
          <span className="clock">{eat} EAT</span>
        </div>
      </header>

      <nav
        className="tabs"
        role="tablist"
        aria-label="Console sections"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
          const i = TABS.findIndex((t) => t.id === tab)
          const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
          setTab(next.id)
          e.currentTarget.querySelectorAll('.tab')[TABS.indexOf(next)]?.focus()
        }}
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className="tab"
            onClick={() => setTab(t.id)}
          >
            <span className="key-hint">{i + 1}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            role="tabpanel"
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Active paused={paused} svc={svc} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="foot">
        <p>
          <strong>Demonstration environment.</strong> All feed events, venues, play counts, allocations and
          reconciliation rows on this screen are simulated unless individually labelled "LIVE MATCH — real
          detection". This console runs on Sautify's own infrastructure and is not connected to KECOBO's,
          eCitizen's, or any CMO's live systems. Sautify does not set tariffs or collect on KECOBO's behalf; we
          provide the verified play-log evidence that CMOs and the National Rights Registry can use to calculate
          what each artist is owed. Reporting is NRR-compatible, built for eCitizen reconciliation, and designed
          around published CMO licence conditions (KECOBO Consolidated Tariffs 2026–28).
        </p>
        <p className="mono" style={{ marginTop: 6 }}>
          © 2026 Sautify · Nairobi, Kenya · Sauti zote zasikizwa, zalipwa. · Press <kbd>?</kbd> for presenter shortcuts
        </p>
      </footer>

      {showKeys && (
        <div className="overlay" onClick={() => setShowKeys(false)} role="dialog" aria-label="Keyboard shortcuts">
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <h2>Presenter shortcuts</h2>
            <dl>
              <dt>1–6</dt><dd>Switch tabs</dd>
              <dt>P</dt><dd>{paused ? 'Resume' : 'Pause'} simulated feed</dd>
              <dt>F</dt><dd>Toggle fullscreen</dd>
              <dt>?</dt><dd>Toggle this overlay</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}
