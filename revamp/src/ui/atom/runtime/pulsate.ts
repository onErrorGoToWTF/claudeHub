import type { PulsateStateConfig, StateContext, StateRuntime, Vec3 } from './types'

/**
 * Pulsate — stationary scale-pulse in place. Position is locked to either
 * `prev.endPos` (transitions lab) or the nucleus (states lab in isolation).
 *
 * Scale wave (LOCKED): smooth N-peak cosine envelope so each pulse rises
 * from 1 → intensity → 1 once per cycle:
 *
 *   scale(t) = 1 + (intensity - 1) · 0.5 · (1 - cos(2π · pulses · t))
 *
 * Endpoints scale=1 (continuous handoff in/out of pulsate is therefore
 * trivial — no pop). `intensity` is the peak multiplier, not the delta;
 * `intensity = 1.5` peaks at 1.5×, returns to 1×.
 */
export const pulsateRuntime: StateRuntime<PulsateStateConfig> = {
  positionFn: (_t: number, ctx: StateContext): Vec3 => {
    return ctx.prev?.endPos ?? ctx.nucleus
  },
  scaleFn: (t: number, _ctx: StateContext, c: PulsateStateConfig): number => {
    const peak = Math.max(c.intensity, 1)
    const env = 0.5 * (1 - Math.cos(2 * Math.PI * c.pulses * t))
    return 1 + (peak - 1) * env
  },
}
