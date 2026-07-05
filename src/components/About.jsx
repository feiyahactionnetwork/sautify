import Reveal from './Reveal'
import { CONTACT_EMAIL, mailto } from '../constants'

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 px-6 bg-ink scroll-mt-16">
      <div className="max-w-3xl mx-auto text-center">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold text-fg">
            Built in Nairobi, <span className="text-gold">for Africa's Music</span>
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mt-6 text-lg text-muted leading-relaxed">
            Sautify was founded in Nairobi by a team that saw firsthand how Kenya's music artists
            were being shortchanged by a system that had no data. We built the infrastructure that
            makes royalty collection transparent, auditable, and fair — starting with Kenya.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <a
            href={mailto('General Inquiry')}
            className="mt-8 inline-block text-gold font-medium hover:text-gold/80 transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </Reveal>
      </div>
    </section>
  )
}
