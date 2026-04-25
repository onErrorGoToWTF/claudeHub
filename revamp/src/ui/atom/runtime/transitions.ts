/*
 * Transition math — currently a stage placeholder.
 *
 * The states-lab work in Chunks 1-3 builds the diagnostic stage. The
 * transition blending math (smoothstep on curve↔curve, Hermite cubic on
 * curve↔straight, fillet arc on straight↔straight, speed-shaping in all
 * cases) is iterated on top of that stage in follow-up work.
 *
 * For now this module exposes:
 *   - the locked windowMs formula (atom-system-plan.md §"Window length formula")
 *   - composition-rule validation (which (A, B) pairs are legal)
 *
 * The actual seam-blending happens in `runSequence` in LabsAtomTransitions
 * — and today is concat-only so the diagnostic chips can measure the
 * baseline kink. That kink is the thing the blending math removes.
 */
import type { StateConfig } from './types'

type StateType = StateConfig['type']

/** Floor on the transition window — never zero (per locked design,
 *  "sharp turns will likely never be ZERO rounded corners"). */
export const MIN_WINDOW_MS = 40

/** windowMs = transitionWindow · 0.5 · min(durLeft, durRight),
 *  clamped to MIN_WINDOW_MS. Locked formula. */
export function computeWindowMs(
  transitionWindow: number,
  durLeft: number,
  durRight: number,
): number {
  const w = transitionWindow * 0.5 * Math.min(durLeft, durRight)
  return Math.max(MIN_WINDOW_MS, w)
}

/** Composition-rule check. Returns null when the pair is legal, or a
 *  short reason string when it's not. The transitions lab grays out
 *  illegal B options based on A. */
export function checkComposition(
  a: StateConfig,
  b: StateConfig,
): string | null {
  // spiral.inward must follow an orbit state — it needs an existing
  // nucleus center to spiral into.
  if (b.type === 'spiral' && b.direction === 'inward' && a.type !== 'orbit') {
    return 'spiral.inward must follow an orbit state'
  }
  // spiral.outward must follow an at-point state (pause, pulsate, end of
  // straight, end of spiral.inward) — needs a stationary launch point.
  if (b.type === 'spiral' && b.direction === 'outward') {
    const validPredecessors: StateType[] = ['pause', 'pulsate', 'straight', 'spiral']
    if (!validPredecessors.includes(a.type)) {
      return 'spiral.outward must follow an at-point state'
    }
    if (a.type === 'spiral' && a.direction !== 'inward') {
      return 'spiral.outward after a spiral requires the prior spiral to be inward'
    }
  }
  return null
}
