import { useEffect, useState } from 'react'

/**
 * Tracks `prefers-reduced-motion: reduce`. Live-updated — a settings change
 * while the page is open takes effect on next render. SSR-safe (returns
 * `false` when `window`/`matchMedia` is unavailable).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
