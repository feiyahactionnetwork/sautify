import Reveal from './Reveal'

const stats = [
  { value: '70%', label: 'Minimum artist payout under the eCitizen royalty directive' },
  { value: '2026–28', label: "KECOBO's Consolidated Tariffs period our reporting is built around" },
  { value: 'KSh 30,000', label: 'Sample annual tariff — mobile DJs, under the new consolidated fee schedule' },
]

export default function Compliance() {
  return (
    <section id="compliance" className="py-24 md:py-32 px-6 bg-ink border-y border-line scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-center text-fg max-w-3xl mx-auto leading-tight">
            Built for Kenya's <span className="text-gold">New Royalty Framework</span>
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mt-8 max-w-3xl mx-auto text-center text-lg text-muted leading-relaxed">
            In 2026, a presidential directive moved music royalty collection onto the eCitizen
            platform, with a minimum 70% of collections ring-fenced for artists under KECOBO's
            Consolidated Tariffs. Sautify's evidence layer is designed to plug directly into that
            pipeline — feeding verified play logs to licensed Collective Management Organisations
            such as PAVRISK, and cross-referencing tracks against KECOBO's National Rights
            Registry — so payouts are based on what was actually played, not estimates.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={200 + i * 100}>
              <div className="rounded-xl border border-line bg-card p-8 text-center h-full">
                <div className="text-3xl md:text-4xl font-extrabold text-gold">{s.value}</div>
                <div className="mt-3 text-sm md:text-base text-muted">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={500}>
          <p className="mt-10 max-w-3xl mx-auto text-center text-sm text-muted leading-relaxed">
            Sautify doesn't set tariffs or collect on KECOBO's behalf — we provide the verified
            play-log evidence that CMOs and the National Rights Registry use to calculate what
            each artist is owed.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
