import type { OrbitStateConfig, StateContext, StateRuntime, Vec3 } from './types'
import { planeLift } from './types'

/**
 * Orbit — circle (aspect=1) or ellipse around the nucleus.
 *
 * angle θ(t) = 2π · revolutions · t.
 * position = nucleus + lift(plane, size · cos θ, size · aspect · sin θ).
 *
 * Scale is identity (orbit doesn't pulse).
 */
export const orbitRuntime: StateRuntime<OrbitStateConfig> = {
  positionFn: (t: number, ctx: StateContext, c: OrbitStateConfig): Vec3 => {
    const theta = 2 * Math.PI * c.revolutions * t
    const u = c.size * Math.cos(theta)
    const v = c.size * c.aspect * Math.sin(theta)
    const [lx, ly, lz] = planeLift(c.plane, u, v)
    return [ctx.nucleus[0] + lx, ctx.nucleus[1] + ly, ctx.nucleus[2] + lz]
  },
  scaleFn: () => 1,
}
