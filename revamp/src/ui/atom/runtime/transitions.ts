/*
 * Transition math — universal Hermite-cubic seam blend.
 *
 * This module exposes:
 *   - the locked windowMs formula (atom-system-plan.md §"Window length formula")
 *   - composition-rule validation (which (A, B) pairs are legal)
 *   - `evalSequence()` — a unified A→B evaluator that applies a Hermite
 *     cubic blend across the window region using the analytical tangent
 *     of each state's positionFn at the window edges. C1 continuous at
 *     both u=0 (window entry) and u=1 (window exit) by construction.
 *
 * Why Hermite for everything (vs the plan's per-boundary table of
 * smoothstep / Hermite / fillet-arc): given that we already have each
 * state's positionFn, we have its tangent for free via central finite-
 * difference. A single Hermite cubic with those tangents:
 *   - reduces to a smooth curve↔curve blend when both tangents are
 *     non-aligned but continuous (smoothstep-equivalent)
 *   - acts as a corner fillet for straight↔straight at angle (the cubic
 *     bows through the angle bisector — speed shaping is implicit)
 *   - degenerates to a zero-tangent ease-in/out when pause or pulsate is
 *     on either side (since their positional tangent is 0)
 * One algorithm, all five-state pairings, C1 by construction.
 */
import type { StateConfig, StateContext, Vec3 } from './types'
import { evalState } from './index'

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

/* =========================================================================
   Hermite-cubic seam blend
   ========================================================================= */

/** Half-window of the central-finite-difference probe, in normalized-t units.
 *  Small enough that the secant approximates the analytical derivative to
 *  ~6 digits for any state's positionFn; large enough to dodge float noise
 *  near domain edges. */
const TANGENT_EPS = 1e-3

/** Estimate dP/dt_norm at t (normalized [0,1]) for a single state.
 *  Returns scene-units per *normalized t unit* (1.0 = full state duration). */
function stateTangentNormalized(
  c: StateConfig,
  t: number,
  ctx: StateContext,
): Vec3 {
  const tA = Math.max(0, t - TANGENT_EPS)
  const tB = Math.min(1, t + TANGENT_EPS)
  const a = evalState(c, tA, ctx).position
  const b = evalState(c, tB, ctx).position
  const dt = tB - tA
  if (dt <= 0) return [0, 0, 0]
  return [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt, (b[2] - a[2]) / dt]
}

export type SequenceEvalCtx = {
  a: StateConfig
  b: StateConfig
  ctxA: StateContext
  ctxB: StateContext
  /** Window in elapsed-ms (already passed through computeWindowMs). */
  windowMs: number
}

export type SequenceEvalResult = {
  /** Which region the elapsed time falls in. `window` = inside the
   *  Hermite blend region at the seam. */
  phase: 'A' | 'window' | 'B'
  position: Vec3
  scale: number
  /** Local progress within the active region, [0, 1]. */
  tLocal: number
}

/**
 * Evaluate the A→B sequence at `elapsedMs`. Outside the window: pure A
 * (elapsed ≤ D_A − h) or pure B (elapsed ≥ D_A + h). Inside: Hermite
 * cubic in `u = (elapsedMs − (D_A − h)) / (2h)` between:
 *   - p0 = state-A position at t_a0 = (D_A − h)/D_A
 *   - p1 = state-B position at t_b1 = h/D_B
 *   - m0 = tangent_A(t_a0) · (2h/D_A)   (per-u tangent at u=0)
 *   - m1 = tangent_B(t_b1) · (2h/D_B)   (per-u tangent at u=1)
 *
 * Velocity continuity holds at u=0 and u=1 (verified algebraically — see
 * the file header). Scale uses smoothstep instead of Hermite since scale
 * tangents aren't well-defined at general boundaries (smoothstep is C1
 * with zero derivative at both ends, fine for a scalar blend).
 */
export function evalSequence(
  seq: SequenceEvalCtx,
  elapsedMs: number,
): SequenceEvalResult {
  const { a, b, ctxA, ctxB, windowMs } = seq
  const D_A = Math.max(1, a.duration)
  const D_B = Math.max(1, b.duration)
  const seam = D_A
  // Locked formula already caps windowMs at min(D_A, D_B); guard regardless.
  const h = Math.min(windowMs * 0.5, D_A * 0.5, D_B * 0.5)

  // Pre-window — pure A.
  if (elapsedMs <= seam - h) {
    const t = Math.min(1, Math.max(0, elapsedMs / D_A))
    const r = evalState(a, t, ctxA)
    return { phase: 'A', position: r.position, scale: r.scale, tLocal: t }
  }

  // Post-window — pure B.
  if (elapsedMs >= seam + h) {
    const t = Math.min(1, Math.max(0, (elapsedMs - seam) / D_B))
    const r = evalState(b, t, ctxB)
    return { phase: 'B', position: r.position, scale: r.scale, tLocal: t }
  }

  // Window — Hermite cubic blend.
  const u = (elapsedMs - (seam - h)) / (2 * h)

  const t_a0 = (seam - h) / D_A
  const t_b1 = h / D_B

  const a_state = evalState(a, t_a0, ctxA)
  const b_state = evalState(b, t_b1, ctxB)
  const p0 = a_state.position
  const p1 = b_state.position

  const tan_a = stateTangentNormalized(a, t_a0, ctxA)
  const tan_b = stateTangentNormalized(b, t_b1, ctxB)
  const sA = (2 * h) / D_A
  const sB = (2 * h) / D_B
  const m0: Vec3 = [tan_a[0] * sA, tan_a[1] * sA, tan_a[2] * sA]
  const m1: Vec3 = [tan_b[0] * sB, tan_b[1] * sB, tan_b[2] * sB]

  const u2 = u * u
  const u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2

  const px = h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0]
  const py = h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1]
  const pz = h00 * p0[2] + h10 * m0[2] + h01 * p1[2] + h11 * m1[2]

  // Smoothstep on scale — zero-derivative ends, C1, no overshoot.
  const ss = u * u * (3 - 2 * u)
  const scale = a_state.scale + (b_state.scale - a_state.scale) * ss

  return { phase: 'window', position: [px, py, pz], scale, tLocal: u }
}
