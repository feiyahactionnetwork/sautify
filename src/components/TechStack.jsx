import Reveal from './Reveal'

const tags = [
  'Raspberry Pi Zero 2W',
  'ACRCloud API',
  'FastAPI',
  'PostgreSQL',
  'React',
  'M-Pesa API',
  'Offline-first architecture',
  'Tailscale VPN',
]

export default function TechStack() {
  return (
    <section id="tech" className="py-24 md:py-32 px-6 bg-ink scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-center text-fg mb-16">
            Built to Scale <span className="text-gold">Across Africa</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="flex flex-wrap gap-3">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line bg-card px-4 py-2 text-sm text-fg"
                >
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="text-lg text-muted leading-relaxed">
              Sautify's IoT device works on WiFi or cellular, buffers plays offline, and syncs
              automatically when connectivity is restored. Our cloud backend is built for scale —
              from 3 venues in Nairobi to 80,000 across Kenya.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
