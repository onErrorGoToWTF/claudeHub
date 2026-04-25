import type { StateContext, StateRuntime, StraightStateConfig, Vec3 } from './types'

/**
 * Straight — linear travel from prev.endPos (or nucleus when starting fresh)
 * to target. The line is *drawn by the electron*; trails are autonomous.
 *
 * Scale is identity.
 */
export const straightRuntime: StateRuntime<StraightStateConfig> = {
  positionFn: (t: number, ctx: StateContext, c: StraightStateConfig): Vec3 => {
    const start = ctx.prev?.endPos ?? ctx.nucleus
    return [
      start[0] + (c.target[0] - start[0]) * t,
      start[1] + (c.target[1] - start[1]) * t,
      start[2] + (c.target[2] - start[2]) * t,
    ]
  },
  scaleFn: () => 1,
}
