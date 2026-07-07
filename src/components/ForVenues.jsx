import Reveal from './Reveal'
import AnimatedText from './AnimatedText'
import { PILOT_MAILTO } from '../constants'

const bullets = [
  'Plug in and forget: the device runs itself',
  'No internet? Plays are buffered and synced automatically',
  'Proof of what you played, useful for licence renewals',
  'KES 2,500/month, less than your WiFi bill',
]

const samplePlays = [
  { title: 'Sura Yako', artist: 'Sauti Sol', time: '21:14' },
  { title: 'Mwaki', artist: 'Zerb & Sofiya Nzau', time: '21:09' },
  { title: 'Anguka Nayo', artist: 'Ethic Entertainment', time: '20:58' },
]

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="flex-shrink-0 mt-0.5">
      <circle cx="10" cy="10" r="9" fill="#1A7A3F" fillOpacity="0.15" stroke="#26A65B" strokeWidth="1.2" />
      <path d="M6 10.2L8.6 12.8L14 7" stroke="#26A65B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DeviceMockup() {
  const bars = Array.from({ length: 28 })
  return (
    <div className="relative rounded-2xl border border-line bg-card p-6 sm:p-8 overflow-hidden transition-all duration-300 ease-out hover:border-emerald/40 hover:shadow-xl hover:shadow-emerald/5">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-2.5 h-2.5 rounded-full bg-emeraldLight animate-pulse" aria-hidden="true" />
        <span className="text-sm font-medium text-muted">Sautify Device: Live</span>
      </div>

      <div className="rounded-lg bg-ink border border-line p-5 mb-6">
        <div className="flex items-end gap-1 h-16" aria-hidden="true">
          {bars.map((_, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-full bg-gradient-to-t from-emerald to-emeraldLight animate-wave origin-bottom"
              style={{
                height: `${25 + Math.abs(Math.sin(i * 0.5)) * 65}%`,
                animationDelay: `${(i % 10) * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {samplePlays.map((p) => (
          <div key={p.title} className="flex items-center justify-between text-sm transition-transform duration-200 ease-out hover:translate-x-1">
            <div>
              <div className="text-fg font-medium">{p.title}</div>
              <div className="text-muted text-xs mt-0.5">
                {p.artist} · {p.time}
              </div>
            </div>
            <span className="text-xs rounded-full bg-emerald/15 text-emeraldLight px-2.5 py-1 border border-emerald/30">
              Logged
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ForVenues() {
  return (
    <section id="for-venues" className="py-24 md:py-32 px-6 bg-ink scroll-mt-16">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <AnimatedText
            as="h2"
            stagger={30}
            className="text-3xl md:text-5xl font-bold text-fg leading-tight"
            segments={[
              { text: 'Simple for Venues. ' },
              { text: 'Powerful for Everyone.', className: 'text-gold' },
            ]}
          />

          <ul className="mt-8 space-y-4">
            {bullets.map((b, i) => (
              <Reveal key={b} as="li" delay={200 + i * 90} className="flex items-start gap-3 text-muted text-base md:text-lg">
                <CheckIcon />
                <span>{b}</span>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={600}>
            <a
              href={PILOT_MAILTO}
              className="mt-10 inline-flex items-center justify-center rounded-md bg-gold px-7 py-4 text-base font-semibold text-ink transition-all duration-200 ease-out hover:bg-gold/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/20 active:translate-y-0 active:scale-95"
            >
              Request a Device for Your Venue
            </a>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <DeviceMockup />
        </Reveal>
      </div>
    </section>
  )
}
