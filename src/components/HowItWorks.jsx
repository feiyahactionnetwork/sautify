import Reveal from './Reveal'

const steps = [
  {
    n: 1,
    title: 'Listen',
    desc: 'A plug-in device captures 10-second audio clips every 30 seconds at your venue. No technical setup required.',
  },
  {
    n: 2,
    title: 'Identify',
    desc: "ACRCloud's audio fingerprinting API matches the audio against 100M+ tracks and returns the artist, title, and ISRC code.",
  },
  {
    n: 3,
    title: 'Log',
    desc: 'Every play is recorded to a cloud dashboard with venue, timestamp, artist, and metadata. An offline buffer ensures no plays are missed.',
  },
  {
    n: 4,
    title: 'Pay',
    desc: 'Royalty reports are generated automatically. Artists receive M-Pesa payouts based on actual evidence — not estimates.',
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
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-center text-fg">
            From Audio to Artist Payout — <span className="text-gold">Automatically</span>
          </h2>
        </Reveal>

        <div className="mt-20 flex flex-col md:flex-row md:items-start gap-2">
          {steps.flatMap((step, i) => {
            const items = [
              <Reveal key={`step-${step.n}`} delay={i * 120} className="flex-1">
                <div className="flex flex-col items-center text-center h-full mx-auto max-w-xs md:max-w-none">
                  <div className="w-14 h-14 flex-shrink-0 rounded-full bg-emerald/15 border border-emerald/40 flex items-center justify-center text-emeraldLight text-xl font-bold mb-5">
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
