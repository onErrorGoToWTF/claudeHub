/*
 * travel.ts — gravity-shaped S-curve between two orbits.
 *
 * One canonical transition between any two orbits: a symmetric S composed
 * of two cubic Hermite arcs joined at the midpoint. C1 in TIME at both
 * orbit boundaries (the cubic's velocity matches the orbit's velocity at
 * the exit/entry instant), C1 at the midpoint. Distance scales the shape
 * implicitly — short distance keeps the S bowed; long distance straightens
 * the middle.
 *
 * Math-checked formulation (see plan + advisor 2026-04-25):
 *   - Endpoint Hermite tangent magnitudes are tied to orbital speed *
 *     half-duration, NOT to inter-nucleus distance. Tying them to distance
 *     creates a velocity jump at handoff (the jagged symptom on the old
 *     orbit↔straight Hermite blend). Pin to v · (T/2) and the handoff is
 *     C1 in time, not just C1 in direction.
 *   - Midpoint tangent direction = P_A → P_B; magnitude = κ · |P_B − P_A|
 *     (single artistic knob, default 0.5).
 */
import type { Vec3 } from './types'
import { applyTilt, planeLift } from './types'
import type { Plane } from '../Electron'

/** Orbit description for the gravity-handoff stage. */
export type OrbitDesc = {
  /** Nucleus position in scene-local coords. */
  center: Vec3
  /** Plane of the orbit. */
  plane: Plane
  /** Optional pitch tilt around X (radians). */
  tiltX?: number
  /** Optional yaw tilt around Y (radians). */
  tiltY?: number
  /** Semi-major axis (rx). */
  size: number
  /** ry / rx — 1.0 = circle. */
  aspect: number
  /** Angular velocity in rad/s. Sign chooses rotation direction:
   *  positive = CCW around the plane normal, negative = CW. */
  omega: number
  /** Phase offset at t=0 (radians). */
  phase: number
}

/** Position on an orbit at orbit-frame angle θ (post-tilt, world-aligned). */
export function orbitPosAt(orbit: OrbitDesc, theta: number): Vec3 {
  const u = orbit.size * Math.cos(theta)
  const v = orbit.size * orbit.aspect * Math.sin(theta)
  const lifted = planeLift(orbit.plane, u, v)
  const tilted = applyTilt(lifted, orbit.tiltX ?? 0, orbit.tiltY ?? 0)
  return [
    orbit.center[0] + tilted[0],
    orbit.center[1] + tilted[1],
    orbit.center[2] + tilted[2],
  ]
}

/** dPosition/dt on an orbit at orbit-frame angle θ. Sign carried by
 *  orbit.omega (positive = CCW). Magnitude in scene-units / second. */
export function orbitVelocityAt(orbit: OrbitDesc, theta: number): Vec3 {
  const du = -orbit.size * Math.sin(theta) * orbit.omega
  const dv = orbit.size * orbit.aspect * Math.cos(theta) * orbit.omega
  const lifted = planeLift(orbit.plane, du, dv)
  return applyTilt(lifted, orbit.tiltX ?? 0, orbit.tiltY ?? 0)
}

/** Find the orbit-frame angle where the orbit point is closest to a
 *  target world position. For aspect=1 (circle) this has a closed form;
 *  for aspect != 1 we sample N candidates. N=64 is over-resolved for
 *  visuals — exit/entry geometry doesn't need sub-degree precision. */
export function closestPointAngle(orbit: OrbitDesc, target: Vec3): number {
  const N = 64
  let best = 0
  let bestD2 = Infinity
  for (let i = 0; i < N; i++) {
    const theta = (2 * Math.PI * i) / N
    const p = orbitPosAt(orbit, theta)
    const dx = p[0] - target[0]
    const dy = p[1] - target[1]
    const dz = p[2] - target[2]
    const d2 = dx * dx + dy * dy + dz * dz
    if (d2 < bestD2) {
      bestD2 = d2
      best = theta
    }
  }
  return best
}

/** Standard cubic Hermite, evaluated component-wise on Vec3.
 *  P(u) = h00·P0 + h10·m0 + h01·P1 + h11·m1
 *  Yields P(0)=P0, P'(0)=m0, P(1)=P1, P'(1)=m1. */
export function cubicHermite(
  P0: Vec3, P1: Vec3, m0: Vec3, m1: Vec3, u: number,
): Vec3 {
  const u2 = u * u
  const u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2
  return [
    h00 * P0[0] + h10 * m0[0] + h01 * P1[0] + h11 * m1[0],
    h00 * P0[1] + h10 * m0[1] + h01 * P1[1] + h11 * m1[1],
    h00 * P0[2] + h10 * m0[2] + h01 * P1[2] + h11 * m1[2],
  ]
}

/** Cubic Hermite derivative dP/du. */
export function cubicHermiteDerivative(
  P0: Vec3, P1: Vec3, m0: Vec3, m1: Vec3, u: number,
): Vec3 {
  const u2 = u * u
  const dh00 = 6 * u2 - 6 * u
  const dh10 = 3 * u2 - 4 * u + 1
  const dh01 = -6 * u2 + 6 * u
  const dh11 = 3 * u2 - 2 * u
  return [
    dh00 * P0[0] + dh10 * m0[0] + dh01 * P1[0] + dh11 * m1[0],
    dh00 * P0[1] + dh10 * m0[1] + dh01 * P1[1] + dh11 * m1[1],
    dh00 * P0[2] + dh10 * m0[2] + dh01 * P1[2] + dh11 * m1[2],
  ]
}

/** A precomputed travel from orbit A to orbit B. Built once per travel
 *  event from the orbit descriptors + endpoint angles + duration. */
export type TravelDesc = {
  /** Total wall-clock travel duration in seconds. */
  duration: number
  /** Exit point on A's orbit (world). */
  P_A: Vec3
  /** Entry point on B's orbit (world). */
  P_B: Vec3
  /** Midpoint of P_A and P_B (world). */
  M: Vec3
  /** Hermite m-vector at u=0 of cubic 1 (= v_orbit_A · halfT). */
  m_A: Vec3
  /** Hermite m-vector shared at midpoint (same vector for both cubics
   *  ensures C1 at the midpoint). */
  m_M: Vec3
  /** Hermite m-vector at u=1 of cubic 2 (= v_orbit_B · halfT). */
  m_B: Vec3
  /** Source-orbit angle at exit (for resuming source-orbit math, debug). */
  exitAngle: number
  /** Dest-orbit angle at capture (so the receiving orbit phase is
   *  C0-continuous at handoff). */
  entryAngle: number
  /** Dest orbit as actually used by this travel (potentially with omega
   *  sign flipped from the caller's hint to make endpoint tangents
   *  anti-parallel — see "rotation policy" note in buildTravel). The lab
   *  / consumer should use THIS for the post-capture orbit so the
   *  rotation direction visually agrees with what the curve already
   *  resolved to. */
  destOrbit: OrbitDesc
}

/** Build a TravelDesc from source orbit, destination orbit, and total
 *  duration (seconds).
 *
 *  IMPORTANT: each cubic Hermite arc is parameterized over u ∈ [0, 1]
 *  but spans half the wall-clock duration (T/2). Therefore, to make the
 *  cubic's velocity at u=0 equal the orbit's velocity in world units/sec,
 *  the m-vector must equal v_orbit · (T/2):
 *
 *    dP/dt = dP/du · du/dt = dP/du · (1 / halfT)
 *    So  dP/du @ u=0  must equal  v_orbit · halfT.
 */
export function buildTravel(
  source: OrbitDesc,
  dest: OrbitDesc,
  duration: number,
  options: {
    /** Exit angle on source. Default = closest-to-dest-center. */
    exitAngle?: number
    /** Entry angle on dest. Default = closest-to-source-center. */
    entryAngle?: number
    /** Midpoint tangent magnitude scale. Default 0.5. */
    kappa?: number
  } = {},
): TravelDesc {
  const exitAngle = options.exitAngle ?? closestPointAngle(source, dest.center)
  const entryAngle = options.entryAngle ?? closestPointAngle(dest, source.center)
  const kappa = options.kappa ?? 0.5
  const halfT = duration / 2

  const P_A = orbitPosAt(source, exitAngle)
  const P_B = orbitPosAt(dest, entryAngle)
  const v_A = orbitVelocityAt(source, exitAngle)

  // ROTATION POLICY (geometric, not blanket-reverse):
  //
  // For the S-curve to be smooth at both ends, the endpoint orbital
  // tangents v_A and v_B must be roughly anti-parallel (dot < 0). With
  // parallel tangents the cubic forces a tight end-loop to reconcile
  // direction — visually this is the "bang into orbit" symptom.
  //
  // Whether reversing the dest rotation gives anti-parallel depends on
  // the plane geometry:
  //   - When closest-points sit on opposing arcs (xy/xz planes with
  //     nuclei on the x-axis), the orbital tangents at those points are
  //     already anti-parallel under SAME rotation; reversing flips them
  //     to parallel.
  //   - When closest-points sit on the same side (yz plane perpendicular
  //     to the chord), the tangents are parallel under same rotation;
  //     reversing flips them anti-parallel.
  //
  // So we don't blanket-reverse. We compute v_B for the caller's hint
  // direction; if dot(v_A, v_B) > 0 (parallel), we flip the dest
  // rotation. The selected dest orbit is returned in TravelDesc so the
  // post-capture orbit math agrees with the curve that was actually
  // built.
  let destResolved = dest
  let v_B = orbitVelocityAt(destResolved, entryAngle)
  if (v_A[0] * v_B[0] + v_A[1] * v_B[1] + v_A[2] * v_B[2] > 0) {
    destResolved = { ...dest, omega: -dest.omega }
    v_B = orbitVelocityAt(destResolved, entryAngle)
  }

  const M: Vec3 = [
    (P_A[0] + P_B[0]) / 2,
    (P_A[1] + P_B[1]) / 2,
    (P_A[2] + P_B[2]) / 2,
  ]

  // Endpoint m-vectors: v · halfT yields C1 in time at the orbit handoff.
  const m_A: Vec3 = [v_A[0] * halfT, v_A[1] * halfT, v_A[2] * halfT]
  const m_B: Vec3 = [v_B[0] * halfT, v_B[1] * halfT, v_B[2] * halfT]

  // Midpoint m-vector: direction (P_B − P_A) scaled by κ. Algebraically
  // this is `unit(P_B − P_A) · κ · |P_B − P_A|` which collapses to the
  // chord vector times κ. Single artistic knob; orbital speed has no
  // effect here on purpose — keeps the middle's bow under user control.
  const dx = P_B[0] - P_A[0]
  const dy = P_B[1] - P_A[1]
  const dz = P_B[2] - P_A[2]
  const m_M: Vec3 = [dx * kappa, dy * kappa, dz * kappa]

  return {
    duration, P_A, P_B, M, m_A, m_M, m_B,
    exitAngle, entryAngle,
    destOrbit: destResolved,
  }
}

/** Find the next wall-clock time-since-anchor at which the electron's
 *  orbital phase reaches `targetAngle`. Used to delay travel-trigger
 *  until the electron's current position aligns with the geometric-
 *  optimum exit point — combined with the closest-point exit angle, this
 *  guarantees the cubic's exit position AND velocity match the
 *  electron's actual motion (no snap, no velocity jump).
 *
 *  theta(t) = initialPhase + omega · (t − anchor). Solve theta ≡
 *  targetAngle (mod 2π) with t ≥ anchor + minOffset. */
export function nextPhaseAlignmentOffset(
  initialPhase: number,
  omega: number,
  targetAngle: number,
  minOffset: number,
): number {
  if (omega === 0) return minOffset
  const period = (2 * Math.PI) / Math.abs(omega)
  // Solve omega·dt ≡ (targetAngle − initialPhase) (mod 2π) for dt ≥ minOffset.
  let dt = (targetAngle - initialPhase) / omega
  // Normalize into [minOffset, minOffset + period).
  while (dt < minOffset - 1e-9) dt += period
  return dt
}

/** Evaluate a travel at wall-clock time t ∈ [0, duration]. Clamps outside. */
export function evalTravel(travel: TravelDesc, t: number): Vec3 {
  if (t <= 0) return travel.P_A
  if (t >= travel.duration) return travel.P_B
  const halfT = travel.duration / 2
  if (t < halfT) {
    const u = t / halfT
    return cubicHermite(travel.P_A, travel.M, travel.m_A, travel.m_M, u)
  }
  const u = (t - halfT) / halfT
  return cubicHermite(travel.M, travel.P_B, travel.m_M, travel.m_B, u)
}

/** Analytical dP/dt on a travel, in world units/sec. Used for boundary-
 *  continuity diagnostics and, optionally, for explicit speed metrics. */
export function evalTravelVelocity(travel: TravelDesc, t: number): Vec3 {
  const halfT = travel.duration / 2
  if (t <= 0) return scale(travel.m_A, 1 / halfT)
  if (t >= travel.duration) return scale(travel.m_B, 1 / halfT)
  if (t < halfT) {
    const u = t / halfT
    const m = cubicHermiteDerivative(travel.P_A, travel.M, travel.m_A, travel.m_M, u)
    return scale(m, 1 / halfT)
  }
  const u = (t - halfT) / halfT
  const m = cubicHermiteDerivative(travel.M, travel.P_B, travel.m_M, travel.m_B, u)
  return scale(m, 1 / halfT)
}

function scale(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k]
}
