import { REPORT_SUMMARY } from '../data'

export default function KecoboReport() {
  return (
    <div className="grid">
      <div className="panel">
        <div className="panel-title">
          Monthly evidence report · June 2026 (simulated)
          <span className="spacer" />
          <span className="pill">NRR-compatible format</span>
        </div>
        <div className="table-scroll">
          <table>
            <tbody>
              {REPORT_SUMMARY.map((r) => (
                <tr key={r.metric}>
                  <td className="dim" style={{ width: '55%' }}>{r.metric}</td>
                  <td className="mono">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">What this report is — and is not</div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 760 }}>
          This is the evidence package Sautify prepares for a licensed CMO each period: verified play logs,
          catalogue match rates, and the hash-chain references that make the underlying data independently
          auditable. It is formatted to be NRR-compatible and designed around published CMO licence conditions
          (KECOBO Consolidated Tariffs 2026–28). It is <strong>not</strong> a KECOBO filing, and Sautify does not
          set tariffs or collect royalties — distribution decisions remain with the licensed CMO.
        </p>
      </div>
    </div>
  )
}
