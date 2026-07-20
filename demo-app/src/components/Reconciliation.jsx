import { RECON_ROWS } from '../data'

const STATUS = {
  reconciled: { pill: 'green', label: 'reconciled' },
  variance: { pill: 'amber', label: 'variance' },
  awaiting: { pill: '', label: 'awaiting venue report' },
}

export default function Reconciliation() {
  return (
    <div className="grid">
      <div className="grid cols-3">
        <div className="panel kpi">
          <div className="kpi-value" style={{ color: 'var(--green)' }}>3<span className="dim">/5</span></div>
          <div className="kpi-label">Venues fully reconciled · June 2026 (simulated)</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>1</div>
          <div className="kpi-label">Variance flagged</div>
          <div className="kpi-sub">6 plays logged but not in venue report</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-value">1</div>
          <div className="kpi-label">Awaiting venue report</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          Play-log vs venue-report reconciliation (simulated)
          <span className="spacer" />
          <span className="pill">built for eCitizen reconciliation</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Period</th><th>Venue</th><th className="mono">Invoice ref</th>
                <th className="num">Plays logged</th><th className="num">Plays reported</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {RECON_ROWS.map((r) => (
                <tr key={r.invoice}>
                  <td className="mono dim">{r.period}</td>
                  <td style={{ fontWeight: 600 }}>{r.venue}</td>
                  <td className="mono dim">{r.invoice}</td>
                  <td className="num">{r.logged.toLocaleString('en-KE')}</td>
                  <td className="num">{typeof r.reported === 'number' ? r.reported.toLocaleString('en-KE') : r.reported}</td>
                  <td><span className={`pill ${STATUS[r.status].pill}`}>{STATUS[r.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Each row cross-checks Sautify's independently captured play log against what the venue self-reported for
          the same licence period. Variances become an evidence trail the CMO can act on, instead of an argument.
        </p>
      </div>
    </div>
  )
}
