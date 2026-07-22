import Reveal from './Reveal'
import AnimatedText from './AnimatedText'
import { CONTACT_EMAIL, mailto } from '../constants'

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 px-6 bg-ink scroll-mt-16">
      <div className="max-w-3xl mx-auto text-center">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-fg"
          segments={[
            { text: 'Built in Nairobi, ' },
            { text: "for Africa's Music", className: 'text-gold' },
          ]}
        />

        <AnimatedText
          as="p"
          stagger={16}
          baseDelay={400}
          className="mt-6 text-lg text-muted leading-relaxed"
          text="Sautify was founded in Nairobi by a team that saw firsthand how Kenya's music artists were being shortchanged by a system that had no data. We built the infrastructure that makes royalty data transparent, auditable, and fair, starting with Kenya."
        />

        <Reveal delay={900}>
          <a
            href={mailto('General Inquiry')}
            className="mt-8 inline-block text-gold font-medium transition-all duration-200 ease-out hover:text-gold/80 hover:-translate-y-0.5"
          >
            {CONTACT_EMAIL}
          </a>
        </Reveal>
      </div>
    </section>
  )
}
