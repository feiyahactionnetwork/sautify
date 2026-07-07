import Reveal from './Reveal'
import AnimatedText from './AnimatedText'
import { PILOT_MAILTO } from '../constants'

const perks = [
  'Free device installation',
  '3 months free subscription',
  'Priority onboarding and support',
  'First access to the full dashboard',
]

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="flex-shrink-0 mt-0.5">
      <path
        d="M9 1.5L11.1 6.3L16.2 6.9L12.4 10.3L13.5 15.5L9 12.8L4.5 15.5L5.6 10.3L1.8 6.9L6.9 6.3L9 1.5Z"
        fill="#D4AF37"
        fillOpacity="0.9"
      />
    </svg>
  )
}

export default function Pilot() {
  return (
    <section id="pilot" className="py-24 md:py-32 px-6 bg-ink scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="rounded-2xl border-2 border-gold/40 bg-card p-10 md:p-16 text-center shadow-[0_0_80px_-20px_rgba(212,175,55,0.25)] transition-shadow duration-500 ease-out hover:shadow-[0_0_100px_-15px_rgba(212,175,55,0.4)]">
            <AnimatedText
              as="h2"
              stagger={30}
              className="text-3xl md:text-5xl font-bold text-fg leading-tight"
              segments={[
                { text: "We're Accepting Our First " },
                { text: '10 Pilot Venues', className: 'text-gold' },
                { text: ' in Nairobi' },
              ]}
            />

            <AnimatedText
              as="p"
              stagger={16}
              baseDelay={400}
              className="mt-6 max-w-2xl mx-auto text-lg text-muted leading-relaxed"
              text="If you run a bar, hotel, club, or radio station in Nairobi and want to be part of making Kenya's music industry fairer, we want to hear from you."
            />

            <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
              {perks.map((p, i) => (
                <Reveal key={p} delay={900 + i * 90} className="flex items-start gap-3">
                  <StarIcon />
                  <span className="text-fg">{p}</span>
                </Reveal>
              ))}
            </div>

            <Reveal delay={1300}>
              <a
                href={PILOT_MAILTO}
                className="mt-12 inline-flex items-center justify-center rounded-md bg-gold px-10 py-5 text-lg font-bold text-ink transition-all duration-200 ease-out hover:bg-gold/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/30 active:translate-y-0 active:scale-95"
              >
                Apply for the Pilot Programme
              </a>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
