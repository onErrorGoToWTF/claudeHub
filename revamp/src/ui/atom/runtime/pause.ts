import type { PauseStateConfig, StateContext, StateRuntime, Vec3 } from './types'

/**
 * Pause — stationary hold. Both position and scale are constant; the only
 * effect is that wall-clock time elapses. Useful as a beat between states.
 */
export const pauseRuntime: StateRuntime<PauseStateConfig> = {
  positionFn: (_t: number, ctx: StateContext): Vec3 => {
    return ctx.prev?.endPos ?? ctx.nucleus
  },
  scaleFn: () => 1,
}
