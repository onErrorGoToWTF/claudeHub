import type { SpiralStateConfig, StateContext, StateRuntime, Vec3 } from './types'
import { planeLift } from './types'

/**
 * Spiral — orbit with shrinking (inward) or growing (outward) radius.
 *
 * Composition rules (enforced upstream by the transitions lab + presets,
 * NOT by this fn — runtime is permissive so the states lab can preview a
 * spiral in isolation):
 *   spiral.inward  must follow an `orbit` state.
 *   spiral.outward must follow an at-point state (pause / pulsate / end of
 *                  straight or spiral.inward).
 *
 * Math:
 *   theta(t) = 2π · revolutions · t
 *   r(t)     = inward  → size · (1 - t)
 *              outward → size · t
 *   position = nucleus + lift(plane, r·cos θ, r·aspect·sin θ).
 */
export const spiralRuntime: StateRuntime<SpiralStateConfig> = {
  positionFn: (t: number, ctx: StateContext, c: SpiralStateConfig): Vec3 => {
    const theta = 2 * Math.PI * c.revolutions * t
    const r = c.direction === 'inward' ? c.size * (1 - t) : c.size * t
    const u = r * Math.cos(theta)
    const v = r * c.aspect * Math.sin(theta)
    const [lx, ly, lz] = planeLift(c.plane, u, v)
    return [ctx.nucleus[0] + lx, ctx.nucleus[1] + ly, ctx.nucleus[2] + lz]
  },
  scaleFn: () => 1,
}
