import useInView from './useInView'

export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const [ref, visible] = useInView()

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
