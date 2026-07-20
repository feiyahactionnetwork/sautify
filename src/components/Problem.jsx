import Reveal from './Reveal'
import AnimatedText from './AnimatedText'

const stats = [
  { value: '50,000+', label: 'Bars, hotels & venues across Kenya' },
  { value: 'KES 2B+', label: "Historically collected annually by Kenya's CMOs" },
  { value: '0%', label: 'Of song plays ever recorded' },
]

export default function Problem() {
  return (
    <section id="problem" className="py-24 md:py-32 px-6 bg-ink scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-center text-fg max-w-3xl mx-auto leading-tight"
          segments={[
            { text: 'The Royalty Gap Is Not a Legal Problem. ' },
            { text: "It's a Data Problem.", className: 'text-gold' },
          ]}
        />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div className="rounded-xl border border-line bg-card p-8 text-center h-full transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-lg hover:shadow-gold/5">
                <div className="text-4xl md:text-5xl font-extrabold text-gold">{s.value}</div>
                <div className="mt-3 text-sm md:text-base text-muted">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <AnimatedText
          as="p"
          stagger={16}
          baseDelay={200}
          className="mt-16 max-w-3xl mx-auto text-center text-lg text-muted leading-relaxed"
          segments={[
            {
              text: "Every bar, hotel, club, and radio station in Kenya pays an annual licence fee to a KECOBO-licensed collective management organisation, such as PAVRISK. But because no mechanism exists to record which songs are actually played, royalties are distributed based on surveys and estimates. Artists receive what the system guesses they're owed, with no way to see or dispute it. ",
            },
            { text: 'Sautify fixes the data layer.', className: 'text-fg font-medium' },
          ]}
        />
      </div>
    </section>
  )
}
