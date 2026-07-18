import Reveal from './Reveal'
import AnimatedText from './AnimatedText'
import { mailto } from '../constants'

const features = [
  {
    title: 'Distribution Data You Can Defend',
    desc: 'Per-rightsholder play counts with 70/30 split fields on every line, ready for CMO distribution runs and member queries alike.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19V5M4 19H20M8 15V9M12.5 15V6M17 15V11" stroke="#26A65B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Regulator-Ready Oversight',
    desc: 'Read-only audit views over a hash-chained ledger. Anyone — including KECOBO — can independently verify that no entry was altered after the fact.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" stroke="#26A65B" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12l2.2 2.2L15.5 9.7" stroke="#26A65B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Built for eCitizen Reconciliation',
    desc: 'Computed liabilities under the gazetted tariffs, structured to line up against eCitizen collection records — so owed vs. paid is a report, not a debate.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h9" stroke="#26A65B" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16.5 15.5l1.8 1.8L21.5 14" stroke="#26A65B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function ForCMOs() {
  return (
    <section id="for-cmos" className="py-24 md:py-32 px-6 bg-ink border-y border-line scroll-mt-16">
      <div className="max-w-6xl mx-auto text-center">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-fg"
          segments={[
            { text: 'For CMOs and Regulators: ' },
            { text: 'Evidence, Not Estimates', className: 'text-gold' },
          ]}
        />

        <AnimatedText
          as="p"
          stagger={16}
          baseDelay={400}
          className="mt-6 max-w-2xl mx-auto text-lg text-muted leading-relaxed"
          text="Distribution disputes start where data ends. Sautify gives licensed CMOs verifiable play evidence to distribute against, and gives the regulator an independent audit trail — designed to KECOBO's ICT-system requirements and the National Rights Registry's data model."
        />

        <div className="mt-16 grid sm:grid-cols-3 gap-6 text-left">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={200 + i * 120}>
              <div className="h-full rounded-xl border border-line bg-card p-8 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-lg hover:shadow-gold/5 group">
                <div className="w-11 h-11 rounded-lg bg-emerald/15 border border-emerald/30 flex items-center justify-center mb-5 transition-transform duration-300 ease-out group-hover:scale-110">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-fg mb-2">{f.title}</h3>
                <p className="text-muted leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={600}>
          <a
            href={mailto('CMO / Regulator Briefing')}
            className="mt-12 inline-flex items-center justify-center rounded-md border border-gold/50 px-8 py-4 text-base font-semibold text-gold transition-all duration-200 ease-out hover:bg-gold/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            Request a CMO / Regulator Briefing
          </a>
        </Reveal>
      </div>
    </section>
  )
}
