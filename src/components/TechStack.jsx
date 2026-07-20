import Reveal from './Reveal'
import AnimatedText from './AnimatedText'

const tags = [
  'Sautify App (Android)',
  'ACRCloud API',
  'Netlify Functions',
  'Supabase (Postgres)',
  'React',
  'Locked-down low-cost device',
  'Offline-first architecture',
]

export default function TechStack() {
  return (
    <section id="tech" className="py-24 md:py-32 px-6 bg-ink scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-center text-fg mb-16"
          segments={[
            { text: 'Built to Scale ' },
            { text: 'Across Africa', className: 'text-gold' },
          ]}
        />

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-wrap gap-3">
            {tags.map((t, i) => (
              <Reveal key={t} as="span" delay={i * 60}>
                <span className="inline-block rounded-full border border-line bg-card px-4 py-2 text-sm text-fg transition-all duration-200 ease-out hover:border-gold/50 hover:text-gold hover:-translate-y-0.5">
                  {t}
                </span>
              </Reveal>
            ))}
          </div>

          <AnimatedText
            as="p"
            stagger={14}
            baseDelay={200}
            className="text-lg text-muted leading-relaxed"
            text="Sautify runs as software on a low-cost, locked-down device we provide and control, not the venue's own phone, so the play data stays independently verifiable. It works on WiFi or cellular, buffers plays offline, and syncs automatically when connectivity is restored. We're piloting with our first 10 venues in Nairobi, with the architecture built to scale well beyond that."
          />
        </div>
      </div>
    </section>
  )
}
