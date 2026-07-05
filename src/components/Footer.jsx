import { CONTACT_EMAIL, mailto } from '../constants'

const links = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Venues', href: '#for-venues' },
  { label: 'For Artists', href: '#for-artists' },
  { label: 'Pilot Programme', href: '#pilot' },
]

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink px-6 py-16">
      <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-3 md:items-start text-center md:text-left">
        <div>
          <span className="text-xl font-extrabold tracking-tight text-gold">Sautify</span>
          <p className="mt-2 text-sm text-muted">Every Play. Every Artist. Every Shilling.</p>
        </div>

        <nav className="flex flex-col md:items-center gap-3">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted hover:text-fg transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="md:text-right">
          <a href={mailto('General Inquiry')} className="text-sm text-muted hover:text-gold transition-colors">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-line max-w-7xl mx-auto text-center">
        <p className="text-xs text-muted">© 2025 Sautify. Nairobi, Kenya.</p>
      </div>
    </footer>
  )
}
