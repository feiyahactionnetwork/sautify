import { useState } from 'react'
import { PILOT_MAILTO } from '../constants'

const links = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Venues', href: '#for-venues' },
  { label: 'For Artists', href: '#for-artists' },
  { label: 'About', href: '#about' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-ink/80 backdrop-blur-md border-b border-line">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#hero" className="flex flex-col leading-none" onClick={() => setOpen(false)}>
          <span className="text-xl font-extrabold tracking-tight text-gold">Sautify</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted hover:text-fg transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href={PILOT_MAILTO}
            className="inline-flex items-center rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-gold/90 transition-colors"
          >
            Request Pilot
          </a>
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-fg"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-line bg-ink px-6 py-4 flex flex-col gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="py-3 text-base font-medium text-muted hover:text-fg"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href={PILOT_MAILTO}
            className="mt-2 inline-flex justify-center rounded-md bg-gold px-4 py-3 text-sm font-semibold text-ink"
            onClick={() => setOpen(false)}
          >
            Request Pilot
          </a>
        </div>
      )}
    </header>
  )
}
