/* State-runtime registry. Each entry implements positionFn + scaleFn for
 * the matching `StateConfig.type`. The lab pages dispatch through this map. */
import { orbitRuntime } from './orbit'
import { straightRuntime } from './straight'
import { spiralRuntime } from './spiral'
import { pulsateRuntime } from './pulsate'
import { pauseRuntime } from './pause'
import type {
  StateConfig,
  StateContext,
  StateRuntime,
  Vec3,
} from './types'

export type { Vec3, StateConfig, StateContext, StateRuntime }
export type {
  OrbitStateConfig,
  StraightStateConfig,
  SpiralStateConfig,
  PulsateStateConfig,
  PauseStateConfig,
} from './types'

export const STATE_TYPES = ['orbit', 'straight', 'spiral', 'pulsate', 'pause'] as const
export type StateType = StateConfig['type']

const RUNTIMES: Record<StateType, StateRuntime<never>> = {
  orbit: orbitRuntime as unknown as StateRuntime<never>,
  straight: straightRuntime as unknown as StateRuntime<never>,
  spiral: spiralRuntime as unknown as StateRuntime<never>,
  pulsate: pulsateRuntime as unknown as StateRuntime<never>,
  pause: pauseRuntime as unknown as StateRuntime<never>,
}

/** Resolve `position(t)` and `scale(t)` for an arbitrary StateConfig.
 *  The discriminant on `config.type` picks the right runtime. */
export function evalState(
  config: StateConfig,
  t: number,
  ctx: StateContext,
): { position: Vec3; scale: number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rt = RUNTIMES[config.type] as StateRuntime<any>
  return {
    position: rt.positionFn(t, ctx, config),
    scale: rt.scaleFn(t, ctx, config),
  }
}

/** Velocity-magnitude estimate via central finite difference in t-space.
 *  Returns units per *normalized t* (not per second). The HUD reports this
 *  raw — meaning velocity in scene-units per state-duration. */
export function evalVelocityMagnitude(
  config: StateConfig,
  t: number,
  ctx: StateContext,
  h: number = 1 / 240,
): number {
  const tA = Math.max(0, t - h)
  const tB = Math.min(1, t + h)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rt = RUNTIMES[config.type] as StateRuntime<any>
  const a = rt.positionFn(tA, ctx, config)
  const b = rt.positionFn(tB, ctx, config)
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dz = b[2] - a[2]
  const dt = tB - tA
  if (dt <= 0) return 0
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / dt
}

/** Default config factory per state type — used to seed the lab when the
 *  user picks a fresh state from the radio. Values are middle-of-range so
 *  the visual is immediately legible, never "everything at zero". */
export function defaultConfigFor(type: StateType): StateConfig {
  switch (type) {
    case 'orbit':
      return { type: 'orbit', size: 1.0, aspect: 1.0, revolutions: 1, duration: 2000, plane: 'xy' }
    case 'straight':
      return { type: 'straight', target: [1.2, 0.6, 0], duration: 1500 }
    case 'spiral':
      return { type: 'spiral', direction: 'inward', size: 1.0, aspect: 1.0, revolutions: 1.5, duration: 2200, plane: 'xy' }
    case 'pulsate':
      return { type: 'pulsate', intensity: 1.5, pulses: 3, duration: 1200 }
    case 'pause':
      return { type: 'pause', duration: 800 }
  }
}
