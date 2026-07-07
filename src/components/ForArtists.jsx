import Reveal from './Reveal'
import AnimatedText from './AnimatedText'
import { ARTIST_WAITLIST_MAILTO } from '../constants'

const features = [
  {
    title: 'Play History',
    desc: 'Every venue, every date, every song',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10" stroke="#26A65B" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Royalty Tracking',
    desc: 'See your earnings build in real time',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19V5M4 19H20M8 15V11M12.5 15V8M17 15V13" stroke="#26A65B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Payout Status',
    desc: 'Track what your CMO has released to you, backed by evidence',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="#26A65B" strokeWidth="1.8" />
        <path d="M3 9h18" stroke="#26A65B" strokeWidth="1.8" />
        <circle cx="17" cy="14" r="1.4" fill="#26A65B" />
      </svg>
    ),
  },
]

export default function ForArtists() {
  return (
    <section id="for-artists" className="relative py-24 md:py-32 px-6 bg-[#0E1712] border-y border-emerald/20 scroll-mt-16">
      <div className="max-w-6xl mx-auto text-center">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-fg"
          segments={[
            { text: 'Finally See ' },
            { text: 'Every Play', className: 'text-emeraldLight' },
            { text: ' of Your Music' },
          ]}
        />

        <AnimatedText
          as="p"
          stagger={16}
          baseDelay={400}
          className="mt-6 max-w-2xl mx-auto text-lg text-muted leading-relaxed"
          text="Log in to your Sautify dashboard and see exactly where your music was played, how many times, and what you're owed, in real time."
        />

        <div className="mt-16 grid sm:grid-cols-3 gap-6 text-left">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={900 + i * 120}>
              <div className="h-full rounded-xl border border-emerald/25 bg-card p-8 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-emeraldLight/50 hover:shadow-lg hover:shadow-emerald/10 group">
                <div className="w-11 h-11 rounded-lg bg-emerald/15 border border-emerald/30 flex items-center justify-center mb-5 transition-transform duration-300 ease-out group-hover:scale-110">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-fg mb-2">{f.title}</h3>
                <p className="text-muted leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={1300}>
          <a
            href={ARTIST_WAITLIST_MAILTO}
            className="mt-12 inline-flex items-center justify-center rounded-md bg-emerald px-8 py-4 text-base font-semibold text-fg transition-all duration-200 ease-out hover:bg-emeraldLight hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald/20 active:translate-y-0 active:scale-95"
          >
            Join the Artist Waitlist
          </a>
        </Reveal>
      </div>
    </section>
  )
}
