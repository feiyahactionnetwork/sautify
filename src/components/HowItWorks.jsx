import Reveal from './Reveal'
import AnimatedText from './AnimatedText'

const steps = [
  {
    n: 1,
    title: 'Capture',
    desc: 'A plug-in venue device or broadcast monitor samples audio around the clock. Offline buffering means no play goes missing.',
  },
  {
    n: 2,
    title: 'Match',
    desc: 'Audio fingerprinting (ACRCloud) identifies each play — artist, title, ISRC — structured for cross-checking against NRR-compatible works records.',
  },
  {
    n: 3,
    title: 'Tariff',
    desc: "Kenya's gazetted Consolidated Tariffs are applied by user category and venue class, so every play log carries the licence-fee context it was collected under.",
  },
  {
    n: 4,
    title: 'Report',
    desc: "Per-rightsholder reports with KECOBO's 70/30 split fields, hash-chained for tamper-evidence and formatted for CMO distribution and regulator review.",
  },
  {
    n: 5,
    title: 'Reconcile',
    desc: 'Built for eCitizen reconciliation: computed liabilities lined up against collection records, so under-collection is visible instead of invisible.',
  },
]

function DownArrow() {
  return (
    <svg className="md:hidden" width="16" height="32" viewBox="0 0 16 32" fill="none" aria-hidden="true">
      <path d="M8 1V30M8 30L1 23M8 30L15 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RightArrow() {
  return (
    <svg className="hidden md:block" width="32" height="16" viewBox="0 0 32 16" fill="none" aria-hidden="true">
      <path d="M1 8H30M30 8L23 1M30 8L23 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 bg-ink border-y border-line scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-center text-fg"
          segments={[
            { text: 'From Capture to ' },
            { text: 'Reconciliation', className: 'text-gold' },
          ]}
        />

        <div className="mt-20 flex flex-col md:flex-row md:items-start gap-2">
          {steps.flatMap((step, i) => {
            const items = [
              <Reveal key={`step-${step.n}`} delay={i * 120} className="flex-1">
                <div className="flex flex-col items-center text-center h-full mx-auto max-w-xs md:max-w-none group">
                  <div className="w-14 h-14 flex-shrink-0 rounded-full bg-emerald/15 border border-emerald/40 flex items-center justify-center text-emeraldLight text-xl font-bold mb-5 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:bg-emerald/25">
                    {step.n}
                  </div>
                  <h3 className="text-xl font-bold text-fg mb-3">{step.title}</h3>
                  <p className="text-muted leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>,
            ]
            if (i < steps.length - 1) {
              items.push(
                <div
                  key={`arrow-${step.n}`}
                  className="flex md:flex-col items-center justify-center py-2 md:py-0 md:pt-6 text-gold/40 flex-shrink-0"
                >
                  <DownArrow />
                  <RightArrow />
                </div>,
              )
            }
            return items
          })}
        </div>
      </div>
    </section>
  )
}
