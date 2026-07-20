import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

// Counts up once on mount (i.e. on tab entry), ≤300ms, instant under
// prefers-reduced-motion.
export default function CountUp({ value, format = (n) => n.toLocaleString('en-KE') }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  const raf = useRef()

  useEffect(() => {
    if (reduced) { setDisplay(value); return }
    const start = performance.now()
    const dur = 300
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, reduced])

  return <>{format(display)}</>
}
