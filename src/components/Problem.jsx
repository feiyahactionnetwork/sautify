import Reveal from './Reveal'

const stats = [
  { value: '80,000+', label: 'Licensed music venues in Kenya' },
  { value: 'KES 2B+', label: 'Collected annually by MCSK' },
  { value: '0%', label: 'Of song plays ever recorded' },
]

export default function Problem() {
  return (
    <section id="problem" className="py-24 md:py-32 px-6 bg-ink scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-center text-fg max-w-3xl mx-auto leading-tight">
            The Royalty Gap Is Not a Legal Problem. <span className="text-gold">It's a Data Problem.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div className="rounded-xl border border-line bg-card p-8 text-center h-full">
                <div className="text-4xl md:text-5xl font-extrabold text-gold">{s.value}</div>
                <div className="mt-3 text-sm md:text-base text-muted">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <p className="mt-16 max-w-3xl mx-auto text-center text-lg text-muted leading-relaxed">
            Every bar, hotel, club, and radio station in Kenya pays an annual licence fee to MCSK —
            the music copyright society. But because no mechanism exists to record which songs are
            actually played, royalties are distributed based on surveys and estimates. Artists
            receive what the system guesses they're owed, with no way to see or dispute it.{' '}
            <span className="text-fg font-medium">Sautify fixes the data layer.</span>
          </p>
        </Reveal>
      </div>
    </section>
  )
}
