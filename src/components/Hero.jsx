import Reveal from './Reveal'
import AnimatedText from './AnimatedText'
import { PILOT_MAILTO } from '../constants'

function Waveform() {
  const bars = Array.from({ length: 56 })
  return (
    <div
      className="absolute inset-0 flex items-end justify-center gap-1 sm:gap-1.5 px-4 pb-0 opacity-[0.18] overflow-hidden"
      aria-hidden="true"
    >
      {bars.map((_, i) => (
        <span
          key={i}
          className="w-1.5 sm:w-2 rounded-t-full bg-gradient-to-t from-emerald to-gold animate-wave origin-bottom"
          style={{
            height: `${18 + Math.abs(Math.sin(i * 0.35)) * 55}%`,
            animationDelay: `${(i % 14) * 0.09}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 scroll-mt-16"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink to-[#0a0d12]" aria-hidden="true" />
      <Waveform />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/70" aria-hidden="true" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-emeraldLight mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emeraldLight animate-pulse" />
            Now accepting pilot venues in Nairobi
          </span>
        </Reveal>

        <AnimatedText
          as="h1"
          mode="letter"
          stagger={22}
          baseDelay={100}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] text-fg"
          segments={[
            { text: 'Every Play. Every Artist. ' },
            { text: 'Every Shilling.', className: 'text-gold' },
          ]}
        />

        <AnimatedText
          as="p"
          mode="word"
          stagger={18}
          baseDelay={500}
          className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed"
          text="Kenya's music venues play millions of songs every day. None of them are tracked. Sautify is the infrastructure that changes that."
        />

        <Reveal delay={300}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={PILOT_MAILTO}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-gold px-8 py-4 text-base font-semibold text-ink transition-all duration-200 ease-out hover:bg-gold/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/20 active:translate-y-0 active:scale-95"
            >
              Request a Pilot
            </a>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-line px-8 py-4 text-base font-semibold text-fg transition-all duration-200 ease-out hover:border-gold/50 hover:text-gold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              See How It Works
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
