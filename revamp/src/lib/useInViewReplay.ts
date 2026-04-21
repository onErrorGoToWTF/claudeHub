import { useEffect, useRef, useState } from 'react'

/**
 * Returns [ref, key] where `key` increments each time the ref's element
 * re-enters the viewport. Use the key on an animated child to restart its
 * CSS keyframes (React remounts it, animation replays from frame 0).
 *
 * Reduced-motion: key increments once on mount, then never again — static end state.
 */
export function useInViewReplay<T extends Element = HTMLDivElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null)
  const [playKey, setPlayKey] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      // Intentional: one synchronous bump on mount so the consumer renders
      // the end state without animation. No further state transitions.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlayKey(k => k + 1)
      return
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) setPlayKey(k => k + 1)
      }
    }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return [ref, playKey] as const
}
