import { DEVICES } from '../data'

const STATUS_PILL = { online: 'green', degraded: 'amber', offline: 'alert' }

export default function Sources() {
  return (
    <div className="grid">
      <div className="grid cols-3">
        <div className="panel kpi">
          <div className="kpi-value">5</div>
          <div className="kpi-label">Registered listeners (simulated fleet)</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-value" style={{ color: 'var(--green)' }}>4</div>
          <div className="kpi-label">Online now</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-value" style={{ color: 'var(--alert)' }}>1</div>
          <div className="kpi-label">Needs attention</div>
          <div className="kpi-sub">SFY-0176 · offline 2 h</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Device fleet (simulated)</div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Device</th><th>Venue</th><th>Model</th><th>Status</th>
                <th className="num">Uptime 30d</th><th>Last seen</th><th>Firmware</th>
              </tr>
            </thead>
            <tbody>
              {DEVICES.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.id}</td>
                  <td>{d.venue}</td>
                  <td className="dim">{d.model}</td>
                  <td><span className={`pill ${STATUS_PILL[d.status]}`}>{d.status}</span></td>
                  <td className="num">{d.uptime}</td>
                  <td className="dim">{d.lastSeen}</td>
                  <td className="mono dim">{d.firmware}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Capture model</div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 720 }}>
          Sautify is software-first: the Listener runs on commodity hardware at the venue, fingerprints ambient
          audio locally, and ships only compact acoustic fingerprints and match metadata — never raw recordings.
          Each device is bound to the venue's Single Business Permit reference so every detection is attributable
          to a licensed premises.
        </p>
      </div>
    </div>
  )
}
