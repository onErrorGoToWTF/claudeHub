import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, type Transition } from 'framer-motion'

/**
 * Lift-to-modal primitive — reliable "tap a card → grows to centered modal."
 * Avoids layoutId morphing (which fights page scroll, parent transforms,
 * mobile repaints). Approach:
 *
 *   - Modal renders in a portal, out of any parent transform/overflow context.
 *   - Only `transform` + `opacity` animate — GPU composites, no layout thrash.
 *   - Initial transform parks the modal visually at the anchor rect's
 *     position + approximate size; animates to `translate(-50%, -50%) scale(1)`.
 *   - Close reverses the transform; scrim fades; modal unmounts AFTER the
 *     scrim's animation settles (tracked on the scrim, not the modal, so it
 *     fires exactly once per open/close cycle).
 *
 * Same primitive powers sub-category expands or any other "dive-in" interaction.
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
  /** getBoundingClientRect of the source card at tap-time. */
  anchorRect: DOMRect | null
  onClose: () => void
  children: ReactNode
  ariaLabel?: string
  /** Desktop max width; on mobile the modal clamps to viewport less margin. */
  maxWidth?: number
}) {
  // `shouldRender` = DOM presence. Stays true through the close animation;
  // flips false on scrim animation-complete ONLY when `open` is false.
  const [shouldRender, setShouldRender] = useState(open)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // Whenever open flips true, mount immediately (so the anchor transform
  // can read the current anchorRect).
  useEffect(() => {
    if (open) setShouldRender(true)
  }, [open])

  // While mounted: scroll-lock, Esc-close, focus-restore.
  useEffect(() => {
    if (!shouldRender) return
    prevFocusRef.current = document.activeElement as HTMLElement | null

    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    // Let framer paint first, then focus.
    requestAnimationFrame(() => modalRef.current?.focus())

    return () => {
      document.documentElement.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      prevFocusRef.current?.focus?.()
    }
  }, [shouldRender, onClose])

  if (!shouldRender) return null

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  const transition: Transition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }

  const anchorT = anchorTransform(anchorRect)
  const identityT = 'translate(-50%, -50%) scale(1)'

  return createPortal(
    <>
      {/* Scrim — dims the background + absorbs tap-to-close. The scrim owns
          the "unmount after close animation" side-effect. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={transition}
        onAnimationComplete={() => {
          // Only unmount when the scrim's animation settles AT the closed
          // target. Reading `open` at callback-time (via functional setState)
          // avoids closure staleness between open/close cycles.
          if (!open) setShouldRender(false)
        }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 120,
          background: 'var(--bg-overlay)',
          WebkitBackdropFilter: 'blur(4px)',
          backdropFilter: 'blur(4px)',
          cursor: 'default',
        }}
      />

      {/* Modal shell. Docked via fixed + top:50% + left:50%; identity transform
          is translate(-50%, -50%). The anchor transform composes that offset
          with the anchor delta + scale. */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? 'Details'}
        tabIndex={-1}
        initial={{ opacity: 0, transform: anchorT }}
        animate={{
          opacity: open ? 1 : 0,
          transform: open ? identityT : anchorT,
        }}
        transition={transition}
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

/** Compose the "start at anchor" transform. The modal is docked to viewport
 *  center via top:50% left:50%, so identity is translate(-50%, -50%). Anchor
 *  transform adds a delta (to shift center-to-center) and a scale (so the
 *  modal starts at roughly the anchor's size). */
function anchorTransform(anchor: DOMRect | null): string {
  if (!anchor) {
    // No anchor — fall back to a simple scale-up from center.
    return 'translate(-50%, -50%) scale(0.9)'
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cx = vw / 2
  const cy = vh / 2
  const ax = anchor.left + anchor.width / 2
  const ay = anchor.top + anchor.height / 2
  const dx = ax - cx
  const dy = ay - cy
  // Approximate scale from anchor vs target width. The modal's final width is
  // ~min(680, vw - margins); dividing anchor width by that gives a close-
  // enough starting size. 0.2 floor so cards off-screen don't micro-dot.
  const approxModalWidth = Math.min(680, vw - 32)
  const scale = Math.max(anchor.width / approxModalWidth, 0.2)
  return `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`
}
