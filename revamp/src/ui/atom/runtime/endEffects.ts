/*
 * Moment-accent runtime — start + end effects.
 *
 * Per atom-system-plan.md §"End effects" + §"Start effects":
 *   burst   — electron-only, both-side (start + end). scale + glow pulse.
 *   fade    — electron-only, end-only. head + halo opacity → 0.
 *   appear  — electron-only, start-only. fade played in reverse.
 *   target-hit / activate — DEFERRED (need target DOM ref; land with consumer).
 *
 * Each evaluator returns an `ElectronOverlay` — multiplicative tweaks on
 * the electron's base scale / opacity / halo glow / color. Layers cleanly
 * on top of the state's positionFn/scaleFn output.
 */

export type ElectronOverlay = {
  /** Multiplier on the electron's base scale. 1.0 = no change. */
  scaleMult: number
  /** Multiplier on head + halo opacity. Locked-default 1.0. */
  opacityMult: number
  /** Additional multiplier on halo opacity only (lets burst pump glow
   *  without touching head opacity). 1.0 = no change. */
  glowMult: number
  /** When set, overrides the electron's head color. Hex `#rrggbb`. */
  colorOverride?: string
}

export const IDENTITY_OVERLAY: ElectronOverlay = {
  scaleMult: 1,
  opacityMult: 1,
  glowMult: 1,
}

/* ----------------------------- Configs ----------------------------- */

/** burst — size + glow pulse on the electron. Position-locked.
 *  decay shape locked = sin(π·t) (peaks at t=0.5, zero at edges). */
export type BurstConfig = {
  type: 'burst'
  /** Peak scale multiplier at t=0.5. [0, 2]. 0=collapse, 1=no change, 2=double. */
  scaleIntensity: number
  /** Peak halo bloom multiplier. [0, 2]. */
  glowIntensity: number
  /** Optional peak color override. Defaults to electron head color. */
  color?: string
  /** Optional terminal color — animates `color → colorTo` across duration. */
  colorTo?: string
  duration: number
}

/** fade — head + halo opacity ramp 1 → 0. Trail is autonomous (locked
 *  invariant). withShrink also collapses scale. curve locked = smoothstep. */
export type FadeConfig = {
  type: 'fade'
  withShrink: boolean
  duration: number
}

/** appear — fade reversed, played at sequence start.
 *  opacity 0 → 1; with withShrink, scale 0 → 1 too. */
export type AppearConfig = {
  type: 'appear'
  withShrink: boolean
  duration: number
}

export type EndEffectConfig = BurstConfig | FadeConfig
export type StartEffectConfig = AppearConfig | BurstConfig

/* --------------------------- Evaluators --------------------------- */

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function smoothstep(x: number): number {
  const u = clamp01(x)
  return u * u * (3 - 2 * u)
}

function mixHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  const u = clamp01(t)
  const r = Math.round(ar + (br - ar) * u)
  const g = Math.round(ag + (bg - ag) * u)
  const bv = Math.round(ab + (bb - ab) * u)
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(bv)}`
}

export function evalBurst(c: BurstConfig, t: number): ElectronOverlay {
  const u = clamp01(t)
  const env = Math.sin(Math.PI * u)
  const scaleMult = 1 + (c.scaleIntensity - 1) * env
  const glowMult = 1 + (c.glowIntensity - 1) * env
  const colorOverride =
    c.color && c.colorTo ? mixHex(c.color, c.colorTo, u) : c.color
  return { scaleMult, opacityMult: 1, glowMult, colorOverride }
}

export function evalFade(c: FadeConfig, t: number): ElectronOverlay {
  const k = 1 - smoothstep(t)
  return {
    scaleMult: c.withShrink ? k : 1,
    opacityMult: k,
    glowMult: k,
  }
}

export function evalAppear(c: AppearConfig, t: number): ElectronOverlay {
  const k = smoothstep(t)
  return {
    scaleMult: c.withShrink ? k : 1,
    opacityMult: k,
    glowMult: k,
  }
}

export function evalEndEffect(c: EndEffectConfig, t: number): ElectronOverlay {
  if (c.type === 'burst') return evalBurst(c, t)
  return evalFade(c, t)
}

export function evalStartEffect(c: StartEffectConfig, t: number): ElectronOverlay {
  if (c.type === 'appear') return evalAppear(c, t)
  return evalBurst(c, t)
}

/* ----------------------------- Defaults ----------------------------- */

export function defaultEndEffect(type: EndEffectConfig['type']): EndEffectConfig {
  if (type === 'burst') {
    return { type: 'burst', scaleIntensity: 1.6, glowIntensity: 1.8, duration: 600 }
  }
  return { type: 'fade', withShrink: false, duration: 800 }
}

export function defaultStartEffect(type: StartEffectConfig['type']): StartEffectConfig {
  if (type === 'appear') {
    return { type: 'appear', withShrink: false, duration: 400 }
  }
  return { type: 'burst', scaleIntensity: 1.4, glowIntensity: 1.5, duration: 400 }
}
