import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, type Transition } from 'framer-motion'

/**
 * Lift-to-modal primitive — the reliable version of "tap a card and it grows
 * to a modal." Avoids layoutId morphing, which fights page scroll, parent
 * transforms, and mobile repaints. Approach:
 *
 *   1. Modal renders at its FINAL size/position in a portal (out of any
 *      parent's transform/overflow context).
 *   2. Initial frame: transform = translate(dx, dy) scale(anchorW/modalW).
 *   3. Animate to transform: none, opacity: 1.
 *   4. Close: reverse + scrim fades.
 *
 * Because only `transform` + `opacity` animate, the GPU composites it; no
 * layout or paint thrash. Scroll position outside the modal never shifts.
 *
 * Use the same primitive for sub-category expands or any "dive-in" interaction.
 */
export function LiftModal({
  open,
  anchorRect,
  onClose,
  children,
  ariaLabel,
  maxWidth = 680,
}: {
  open: boolean
  /** getBoundingClientRect of the source card at tap-time. Null on close. */
  anchorRect: DOMRect | null
  onClose: () => void
  children: ReactNode
  ariaLabel?: string
  /** Desktop max width; on mobile modal clamps to viewport less margin. */
  maxWidth?: number
}) {
  // Internally track whether to keep the DOM mounted during the close
  // animation. `open` drops to false immediately; the DOM removes after the
  // exit animation settles.
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null
      setMounted(true)
      // Next frame so the initial transform lands before the target.
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  // Scroll-lock + Esc-to-close + focus the modal on open. Unlock + restore on close.
  useEffect(() => {
    if (!mounted) return
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    // Defer focus so framer has a chance to paint.
    requestAnimationFrame(() => modalRef.current?.focus())

    return () => {
      document.documentElement.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      prevFocusRef.current?.focus?.()
    }
  }, [mounted, onClose])

  if (!mounted) return null

  // Compute initial transform so the modal visually starts at the anchor.
  // If no anchor (shouldn't happen for `open=true`), fall back to a simple
  // scale-up from center.
  const initialTransform = visible ? anchorTransform(anchorRect, modalRef.current) : 'none'

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  const baseTransition: Transition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }

  return createPortal(
    <>
      {/* Scrim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={baseTransition}
        onAnimationComplete={() => {
          if (!visible) setMounted(false)
        }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 120,
          background: 'var(--bg-overlay)',
          WebkitBackdropFilter: 'blur(4px)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal shell. Centered on screen via fixed + top/left 50% + translate.
          Initial transform overrides with the anchor position for the lift
          effect; animates to identity when visible. */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? 'Details'}
        tabIndex={-1}
        initial={{
          opacity: 0,
          transform: anchorTransform(anchorRect, null),
        }}
        animate={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translate(-50%, -50%) scale(1)' : initialTransform,
        }}
        transition={baseTransition}
        style={{
          position: 'fixed',
          zIndex: 121,
          top: '50%',
          left: '50%',
          width: `min(${maxWidth}px, calc(100vw - 2 * var(--space-4)))`,
          maxHeight: 'calc(100vh - 2 * var(--space-8))',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--hair)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-3, 0 16px 48px rgba(0, 0, 0, 0.22))',
          transformOrigin: 'center center',
          outline: 'none',
          willChange: 'transform, opacity',
        }}
      >
        {children}
      </motion.div>
    </>,
    document.body,
  )
}

/** Build the "start from anchor rect" transform. Sits the modal visually at
 *  the anchor rect (same size, same position) before animating to identity. */
function anchorTransform(anchor: DOMRect | null, modalEl: HTMLDivElement | null): string {
  if (!anchor) return 'translate(-50%, -50%) scale(0.9)'
  // Viewport center that the modal is docked to.
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const ax = anchor.left + anchor.width / 2
  const ay = anchor.top + anchor.height / 2
  // dx/dy shift the modal's center to the anchor's center.
  const dx = ax - cx
  const dy = ay - cy
  // Scale factor: match the anchor's smaller dimension to the modal's
  // measured size if we have it, otherwise use a sane default.
  let scale = 0.28
  if (modalEl) {
    const rect = modalEl.getBoundingClientRect()
    if (rect.width > 0) {
      scale = Math.max(anchor.width / rect.width, 0.18)
    }
  }
  // Note: the modal uses `top: 50%; left: 50%` so its "identity" transform
  // is translate(-50%, -50%). We compose the anchor delta on top of that.
  return `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`
}
