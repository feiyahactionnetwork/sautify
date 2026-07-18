import Reveal from './Reveal'
import AnimatedText from './AnimatedText'

const stats = [
  { value: '70%', label: 'Minimum artist payout under the eCitizen royalty directive' },
  { value: '2026–28', label: "KECOBO's Consolidated Tariffs period our reporting is built around" },
  { value: 'KSh 30,000', label: 'Sample annual tariff for mobile DJs, under the new consolidated fee schedule' },
]

export default function Compliance() {
  return (
    <section id="compliance" className="py-24 md:py-32 px-6 bg-ink border-y border-line scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-center text-fg max-w-3xl mx-auto leading-tight"
          segments={[
            { text: "Built for Kenya's " },
            { text: 'New Royalty Framework', className: 'text-gold' },
          ]}
        />

        <AnimatedText
          as="p"
          stagger={12}
          baseDelay={300}
          className="mt-8 max-w-3xl mx-auto text-center text-lg text-muted leading-relaxed"
          text="In 2026, a presidential directive moved music royalty collection onto the eCitizen platform, with a minimum 70% of collections ring-fenced for artists under KECOBO's Consolidated Tariffs. Sautify's evidence layer is designed for that pipeline: play logs built for eCitizen reconciliation, works records that carry NRR-compatible identifiers, and regulator-ready reporting shaped to KECOBO's ICT-system requirements — so payouts can be based on what was actually played, not estimates."
        />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={200 + i * 100}>
              <div className="rounded-xl border border-line bg-card p-8 text-center h-full transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-lg hover:shadow-gold/5">
                <div className="text-3xl md:text-4xl font-extrabold text-gold">{s.value}</div>
                <div className="mt-3 text-sm md:text-base text-muted">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <AnimatedText
          as="p"
          stagger={12}
          baseDelay={200}
          className="mt-10 max-w-3xl mx-auto text-center text-sm text-muted leading-relaxed"
          text="Sautify doesn't set tariffs or collect on KECOBO's behalf, and has no affiliation with KECOBO, eCitizen, or any CMO. We produce verifiable play-log evidence in a format licensed CMOs and regulators can use to calculate what each artist is owed."
        />
      </div>
    </section>
  )
}
