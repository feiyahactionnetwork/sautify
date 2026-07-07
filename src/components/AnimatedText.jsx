import useInView from './useInView'

function splitWords(str) {
  return str.split(/(\s+)/).filter((s) => s.length > 0)
}

/**
 * Reveals text word-by-word (or letter-by-letter) as it scrolls into view.
 * `segments` lets a heading mix plain text with an accent-colored span while
 * keeping a single continuous stagger sequence across both.
 * The visible split spans are aria-hidden; the full string is exposed via
 * aria-label on the wrapping tag so screen readers get the plain sentence.
 */
export default function AnimatedText({
  as: Tag = 'span',
  segments,
  text,
  mode = 'word',
  stagger = 40,
  baseDelay = 0,
  className = '',
}) {
  const [ref, visible] = useInView()

  const resolvedSegments = segments || [{ text: text || '' }]
  const ariaLabel = resolvedSegments.map((s) => s.text).join('')

  let unitIndex = 0

  return (
    <Tag ref={ref} className={className} aria-label={ariaLabel}>
      {resolvedSegments.map((seg, segIdx) => (
        <span key={segIdx} className={seg.className} aria-hidden="true">
          {splitWords(seg.text).map((word, wIdx) => {
            if (/^\s+$/.test(word)) return <span key={wIdx}>{word}</span>

            const units = mode === 'letter' ? word.split('') : [word]
            return (
              <span key={wIdx} className="inline-block overflow-hidden align-bottom pb-[0.15em] -mb-[0.15em]">
                <span className="inline-block">
                  {units.map((unit, uIdx) => {
                    const delay = baseDelay + unitIndex * stagger
                    unitIndex += 1
                    return (
                      <span
                        key={uIdx}
                        className={`inline-block transition-all duration-500 ease-out will-change-transform ${
                          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[110%]'
                        }`}
                        style={{ transitionDelay: `${delay}ms` }}
                      >
                        {unit}
                      </span>
                    )
                  })}
                </span>
              </span>
            )
          })}
        </span>
      ))}
    </Tag>
  )
}
