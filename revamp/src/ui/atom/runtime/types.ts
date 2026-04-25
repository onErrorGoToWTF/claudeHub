/*
 * Runtime contract for the 5 atom states (LOCKED in atom-system-plan.md).
 *
 * Per state: a `positionFn(t, ctx) → Vec3` and `scaleFn(t, ctx) → number` pair.
 * Both take a normalized `t` in [0, 1] (state-internal time). Most states are
 * no-ops on one side — pulsate varies scale, orbit varies position, etc.
 *
 * This file is shared by the states lab (one state at a time) and the
 * transitions lab (two states sequenced); the transitions lab supplies the
 * prev-state handoff via `ctx.prev`.
 */
import type { Plane } from '../Electron'

export type Vec3 = readonly [number, number, number]

export const ZERO: Vec3 = [0, 0, 0]

/**
 * Per-state tunable configs. Discriminated by `type`. The lab page renders a
 * controls panel based on the active variant.
 *
 * Coordinates are in R3F local units (scene-canvas frame). The full
 * `TargetSpec = { space, value }` from the plan is deferred until a consumer
 * use case needs DOM-ref / viewport / canvas-absolute targets — for the lab
 * `straight.target` is just a Vec3 in scene-local coords.
 */
export type OrbitStateConfig = {
  type: 'orbit'
  size: number          // semi-major axis (rx)
  aspect: number        // ry / rx — 1.0 = circle, <1 squat, >1 tall
  revolutions: number   // laps before exiting the state
  duration: number      // ms
  plane: Plane
  /** Pitch rotation around the X axis, radians. Default 0. Tilts the
   *  orbit plane up/down out of its base xy/yz/xz frame. */
  tiltX?: number
  /** Yaw rotation around the Y axis, radians. Default 0. Rotates the
   *  orbit plane around the vertical. */
  tiltY?: number
}

export type StraightStateConfig = {
  type: 'straight'
  target: Vec3
  duration: number
}

export type SpiralStateConfig = {
  type: 'spiral'
  direction: 'inward' | 'outward'
  size: number          // outer radius — inward starts here / outward ends here
  aspect: number
  revolutions: number
  duration: number
  plane: Plane
  /** Pitch rotation around the X axis, radians. Default 0. */
  tiltX?: number
  /** Yaw rotation around the Y axis, radians. Default 0. */
  tiltY?: number
}

export type PulsateStateConfig = {
  type: 'pulsate'
  intensity: number     // peak scale multiplier (>= 1; e.g. 1.5)
  pulses: number        // number of peaks in the duration
  duration: number
}

export type PauseStateConfig = {
  type: 'pause'
  duration: number
}

export type StateConfig =
  | OrbitStateConfig
  | StraightStateConfig
  | SpiralStateConfig
  | PulsateStateConfig
  | PauseStateConfig

export type StateContext = {
  /** Nucleus position for orbit / spiral anchoring. Defaults to origin. */
  nucleus: Vec3
  /** Previous-state end position + tangent for smooth handoff. Optional in the states lab. */
  prev?: {
    endPos: Vec3
    endTangent: Vec3
  }
}

export type StateRuntime<C extends StateConfig = StateConfig> = {
  positionFn: (t: number, ctx: StateContext, config: C) => Vec3
  scaleFn: (t: number, ctx: StateContext, config: C) => number
}

/** Plane-axis basis: orbit math computes (cos, aspect·sin) in 2D; this lifts
 *  it to a Vec3 for the requested plane. */
export function planeLift(plane: Plane, u: number, v: number): Vec3 {
  if (plane === 'xy') return [u, v, 0]
  if (plane === 'yz') return [0, u, v]
  return [u, 0, v] // 'xz'
}

/** Apply pitch (around X) then yaw (around Y) to a 3D point. Used by
 *  orbit + spiral to tilt the orbit plane off the base xy/yz/xz frame. */
export function applyTilt(p: Vec3, tiltX: number, tiltY: number): Vec3 {
  if (tiltX === 0 && tiltY === 0) return p
  const [x, y, z] = p
  // Rotate around X axis: (x, y·cos − z·sin, y·sin + z·cos)
  const cx = Math.cos(tiltX), sx = Math.sin(tiltX)
  const y1 = y * cx - z * sx
  const z1 = y * sx + z * cx
  // Rotate around Y axis: (x·cos + z·sin, y, −x·sin + z·cos)
  const cy = Math.cos(tiltY), sy = Math.sin(tiltY)
  const x2 = x * cy + z1 * sy
  const z2 = -x * sy + z1 * cy
  return [x2, y1, z2]
}
