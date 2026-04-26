/*
 * travel.ts — elliptical-arc travel between two orbital nuclei.
 *
 * Single ellipse with foci at the two nuclei. The whole system is three
 * ellipses sharing the same focal structure: orbit A, orbit B, and the
 * transfer ellipse spanning them. Travel is an arc of the transfer ellipse
 * from the electron's current orbit position over to the symmetric point
 * on B's orbit.
 *
 * Geometric construction (deterministic from the orbit configs +
 * exit-angle):
 *   center O = midpoint of (A, B)
 *   linear eccentricity c = |B − A| / 2
 *   semi-major a = (|P_A − A| + |P_A − B|) / 2     (focus-distance sum)
 *   semi-minor b = sqrt(a² − c²)
 *   major-axis direction  uHat = unit(B − A)
 *   minor-axis direction  wHat = unit(P_A − O − ((P_A − O)·uHat)·uHat)
 *
 * Position on the transfer ellipse:
 *   P(φ) = O + a·cos(φ)·uHat + b·sin(φ)·wHat
 *
 * Symmetric travel: φ at exit = φ_exit (computed from P_A); φ at entry =
 * π − φ_exit (mirror across the minor axis through O). Linear interpolation
 * of φ in time. Single sweep, no midpoint joining, no κ artistic knob.
 *
 * Dest rotation direction is picked by a 1-line dot-product test so the
 * post-capture orbit doesn't reverse direction at handoff.
 *
 * Notes on the trade-off:
 *   - Tangent at the orbit-handoff is NOT in general aligned with the
 *     orbital tangent on circular orbits (only collinear A–P_A–B points
 *     give tangency, and that's the degenerate case where the ellipse
 *     collapses to the chord line). So there's a small velocity-direction
 *     kink at exit + capture, representing the gravitational impulse
 *     ("energy given to leave the orbit"). Accepted in exchange for
 *     substantially simpler math.
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
  /** If set, overrides `plane`: the orbit lives in the plane spanned by
   *  `chordAxis` (defaulting to +X) and `upHat`. The two basis axes are
   *  used to build the orbit ellipse (size·cos along chordAxis, aspect·
   *  size·sin along upHat). Lets each electron have its own orbital
   *  plane around a shared chord (atom-motion's multi-electron case). */
  upHat?: Vec3
  /** Optional companion to `upHat`. Defaults to [1,0,0] when upHat is
   *  set — i.e. the chord runs along local +X. */
  chordAxis?: Vec3
}

function liftToBasis(
  orbit: OrbitDesc,
  u: number,
  v: number,
): Vec3 {
  if (orbit.upHat) {
    const c = orbit.chordAxis ?? [1, 0, 0]
    const w = orbit.upHat
    return [u * c[0] + v * w[0], u * c[1] + v * w[1], u * c[2] + v * w[2]]
  }
  return planeLift(orbit.plane, u, v)
}

/** Position on an orbit at orbit-frame angle θ (post-tilt, world-aligned). */
export function orbitPosAt(orbit: OrbitDesc, theta: number): Vec3 {
  const u = orbit.size * Math.cos(theta)
  const v = orbit.size * orbit.aspect * Math.sin(theta)
  const lifted = liftToBasis(orbit, u, v)
  const tilted = applyTilt(lifted, orbit.tiltX ?? 0, orbit.tiltY ?? 0)
  return [
    orbit.center[0] + tilted[0],
    orbit.center[1] + tilted[1],
    orbit.center[2] + tilted[2],
  ]
}

/** dPosition/dt on an orbit at orbit-frame angle θ. */
export function orbitVelocityAt(orbit: OrbitDesc, theta: number): Vec3 {
  const du = -orbit.size * Math.sin(theta) * orbit.omega
  const dv = orbit.size * orbit.aspect * Math.cos(theta) * orbit.omega
  const lifted = liftToBasis(orbit, du, dv)
  return applyTilt(lifted, orbit.tiltX ?? 0, orbit.tiltY ?? 0)
}

/** Find the orbit-frame angle where the orbit point is closest to a
 *  target world position. Sample-based; N=64 is over-resolved. */
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

/** Pre-computed travel description: a slice of an ellipse with foci at
 *  the source and destination nuclei. */
export type TravelDesc = {
  /** Total wall-clock travel duration in seconds. */
  duration: number
  /** Ellipse center (midpoint of foci). */
  O: Vec3
  /** Semi-major axis along the chord. */
  a: number
  /** Semi-minor axis perpendicular to the chord, in the transfer plane. */
  b: number
  /** Major-axis unit vector (along chord). */
  uHat: Vec3
  /** Minor-axis unit vector (perpendicular to chord, in transfer plane). */
  wHat: Vec3
  /** Ellipse parameter at exit. */
  phiExit: number
  /** Ellipse parameter at entry. */
  phiEntry: number
  /** Source-orbit angle at exit. */
  exitAngle: number
  /** Dest-orbit angle at entry. */
  entryAngle: number
  /** Exit point (world). */
  P_A: Vec3
  /** Entry point (world). */
  P_B: Vec3
  /** Dest orbit as actually used by this travel. */
  destOrbit: OrbitDesc
}

/** Lemniscate of Bernoulli with foci at A and B. Single closed curve in
 *  the form of a figure-8: two lobes around the foci, self-intersecting
 *  at the chord midpoint. Traversing the curve flips orbital rotation at
 *  each lobe by topology — CCW around one focus, CW around the other.
 *
 *  Position at parameter τ ∈ [0, 2π]:
 *    u = a·cos(τ) / (1 + sin²(τ))                    (along chord)
 *    v = a·sin(τ)·cos(τ) / (1 + sin²(τ))             (perpendicular)
 *  where a = c·√2 places the lemniscate's foci at ±c from center —
 *  exactly at the two nuclei.
 *
 *  Lobe tips are at (±a, 0) = (±c·√2, 0) — slightly outside the nuclei.
 *  The curve passes through origin twice per period.
 */
export function lemniscatePos(
  midpoint: Vec3,
  uHat: Vec3,
  wHat: Vec3,
  a: number,
  tau: number,
): Vec3 {
  const denom = 1 + Math.sin(tau) ** 2
  const u = (a * Math.cos(tau)) / denom
  const v = (a * Math.sin(tau) * Math.cos(tau)) / denom
  return [
    midpoint[0] + u * uHat[0] + v * wHat[0],
    midpoint[1] + u * uHat[1] + v * wHat[1],
    midpoint[2] + u * uHat[2] + v * wHat[2],
  ]
}

/** Build the parameters for a lemniscate connecting two nuclei. The
 *  caller picks a transverse direction (wHat) so the figure-8 sits in
 *  the chosen plane. */
export function buildLemniscate(A: Vec3, B: Vec3, wHat: Vec3): {
  midpoint: Vec3
  uHat: Vec3
  wHat: Vec3
  a: number
} {
  const midpoint: Vec3 = [
    (A[0] + B[0]) / 2,
    (A[1] + B[1]) / 2,
    (A[2] + B[2]) / 2,
  ]
  const dx = B[0] - A[0]
  const dy = B[1] - A[1]
  const dz = B[2] - A[2]
  const chordLen = Math.hypot(dx, dy, dz)
  const c = chordLen / 2
  const uHat: Vec3 = chordLen > 1e-9
    ? [dx / chordLen, dy / chordLen, dz / chordLen]
    : [1, 0, 0]
  const a = c * Math.SQRT2
  return { midpoint, uHat, wHat, a }
}

/** Generalised half-period sine S between two endpoints on the chord axis
 *  at ±a from midpoint. Decouples curve shape from orbit-size:
 *    u(t) = ±a·cos(π·t)         — flat at endpoints (perpendicular tangent)
 *    v(t) = amp·sin(2π·t)       — one full sine bow (single S)
 *
 *  Tangent at both endpoints is along ±wHat (perpendicular to the chord),
 *  matching the orbital tangent at the orbit far-tip — so handoff is
 *  smooth for any chord/orbit ratio. Replaces the Bernoulli lemniscate
 *  when orbit size is decoupled from chord half-distance.
 *
 *  `direction = +1` traces +a → −a (right → left, BA travel).
 *  `direction = −1` traces −a → +a (left → right, AB travel). */
export function sCurvePos(
  midpoint: Vec3,
  uHat: Vec3,
  wHat: Vec3,
  a: number,
  amp: number,
  t: number,
  direction: 1 | -1,
): Vec3 {
  const u = direction * a * Math.cos(Math.PI * t)
  const v = amp * Math.sin(2 * Math.PI * t)
  return [
    midpoint[0] + u * uHat[0] + v * wHat[0],
    midpoint[1] + u * uHat[1] + v * wHat[1],
    midpoint[2] + u * uHat[2] + v * wHat[2],
  ]
}

/** Build a TravelDesc from source orbit, destination orbit, and total
 *  duration. Defaults: exit at the source orbit's current `phase` (no
 *  phase-alignment wait); entry mirrors the exit across the minor axis
 *  of the transfer ellipse.
 */
export function buildTravel(
  source: OrbitDesc,
  dest: OrbitDesc,
  duration: number,
  options: {
    /** Exit angle on source. Default = source.phase (current). */
    exitAngle?: number
    /** Which side of the chord the arc sweeps through.
     *
     *  'top' (default) — phi sweeps phiExit → π−phiExit (mirror across
     *    minor axis, arc goes through ellipse top φ=π/2). Smooth at
     *    BOTH ends when source and dest have the SAME orbital rotation
     *    (orbital tangents at far-A and far-B are anti-parallel in y,
     *    matching the arc's +y exit / −y entry).
     *
     *  'bottom' — phi sweeps phiExit → phiExit+π (diametrically
     *    opposite, arc goes through ellipse bottom φ=3π/2). Smooth at
     *    capture when dest has OPPOSITE rotation to source (CCW at B
     *    while CW at A) — arc arrives at far-B going +y, matching
     *    CCW orbital tangent. Exit kinks 180° (the "energy gift" to
     *    leave A's CW orbit). */
    arcSide?: 'top' | 'bottom'
  } = {},
): TravelDesc {
  const F1 = source.center
  const F2 = dest.center
  const O: Vec3 = [
    (F1[0] + F2[0]) / 2,
    (F1[1] + F2[1]) / 2,
    (F1[2] + F2[2]) / 2,
  ]
  const chordX = F2[0] - F1[0]
  const chordY = F2[1] - F1[1]
  const chordZ = F2[2] - F1[2]
  const chordLen = Math.hypot(chordX, chordY, chordZ)
  const c = chordLen / 2
  const uHat: Vec3 = chordLen > 1e-9
    ? [chordX / chordLen, chordY / chordLen, chordZ / chordLen]
    : [1, 0, 0]

  // Exit at the source orbit's current phase by default — no waiting.
  const exitAngle = options.exitAngle ?? source.phase
  const P_A = orbitPosAt(source, exitAngle)

  // P_A in ellipse-local frame: dP from O, decomposed along uHat (major
  // axis) and the perpendicular direction in the transfer plane.
  const dPx = P_A[0] - O[0]
  const dPy = P_A[1] - O[1]
  const dPz = P_A[2] - O[2]
  const uComp = dPx * uHat[0] + dPy * uHat[1] + dPz * uHat[2]
  const perp: Vec3 = [
    dPx - uComp * uHat[0],
    dPy - uComp * uHat[1],
    dPz - uComp * uHat[2],
  ]
  const perpLen = Math.hypot(perp[0], perp[1], perp[2])
  // Minor-axis direction is wherever the perpendicular component of P_A
  // points. The transfer plane is therefore the plane spanned by the
  // chord and the source orbit's current radial offset perpendicular to
  // the chord. Always non-degenerate as long as P_A is not on the chord
  // line itself (orbit radius > 0 ensures this for non-collinear cases).
  const wHat: Vec3 = perpLen > 1e-9
    ? [perp[0] / perpLen, perp[1] / perpLen, perp[2] / perpLen]
    : [0, 1, 0]

  // Focus-distance sum determines the ellipse size.
  const distA = Math.hypot(P_A[0] - F1[0], P_A[1] - F1[1], P_A[2] - F1[2])
  const distB = Math.hypot(P_A[0] - F2[0], P_A[1] - F2[1], P_A[2] - F2[2])
  const a = (distA + distB) / 2
  const b = Math.sqrt(Math.max(0, a * a - c * c))

  // Project P_A to ellipse parameter φ.
  // Position on ellipse: O + a·cos(φ)·uHat + b·sin(φ)·wHat. Comparing to
  // the decomposition above: uComp = a·cos(φ_exit), perpLen = b·sin(φ_exit).
  const cosPhi = a > 1e-9 ? uComp / a : 1
  const sinPhi = b > 1e-9 ? perpLen / b : 0
  const phiExit = Math.atan2(sinPhi, cosPhi)
  const arcSide = options.arcSide ?? 'top'
  // Top sweep: mirror across minor axis (φ goes through π/2 = ellipse
  // top). Bottom sweep: diametrically opposite (φ goes through 3π/2
  // = ellipse bottom). Both end at the same world position when
  // exit/entry are at major-axis tips; the bow goes the other way.
  const phiEntry = arcSide === 'bottom'
    ? phiExit + Math.PI
    : Math.PI - phiExit

  // Materialize P_B from the entry parameter.
  const aCosE = a * Math.cos(phiEntry)
  const bSinE = b * Math.sin(phiEntry)
  const P_B: Vec3 = [
    O[0] + aCosE * uHat[0] + bSinE * wHat[0],
    O[1] + aCosE * uHat[1] + bSinE * wHat[1],
    O[2] + aCosE * uHat[2] + bSinE * wHat[2],
  ]

  // Project P_B onto dest orbit to get the entry angle. For symmetric
  // configurations (same orbit size, both circular, same plane parallel
  // to chord) P_B lies exactly on dest orbit; for non-symmetric setups
  // we snap to the closest point on dest orbit.
  const entryAngle = closestPointAngle(dest, P_B)

  // Dest rotation is whatever the caller specified — the natural
  // gravitational pattern reverses spin at capture (CW around A → CCW
  // around B), so the electron arrives spinning the opposite direction
  // by the time it reaches the other nucleus. The visible direction
  // flip at handoff is the gravitational impulse.
  return {
    duration,
    O, a, b, uHat, wHat,
    phiExit, phiEntry,
    exitAngle, entryAngle,
    P_A, P_B,
    destOrbit: dest,
  }
}

/** Evaluate the travel position at wall-clock t ∈ [0, duration]. */
export function evalTravel(travel: TravelDesc, t: number): Vec3 {
  const u = Math.max(0, Math.min(1, t / travel.duration))
  const phi = travel.phiExit + u * (travel.phiEntry - travel.phiExit)
  const ac = travel.a * Math.cos(phi)
  const bs = travel.b * Math.sin(phi)
  return [
    travel.O[0] + ac * travel.uHat[0] + bs * travel.wHat[0],
    travel.O[1] + ac * travel.uHat[1] + bs * travel.wHat[1],
    travel.O[2] + ac * travel.uHat[2] + bs * travel.wHat[2],
  ]
}

/** Analytical dP/dt on the ellipse, in world units / second. */
export function evalTravelVelocity(travel: TravelDesc, t: number): Vec3 {
  const u = Math.max(0, Math.min(1, t / travel.duration))
  const phi = travel.phiExit + u * (travel.phiEntry - travel.phiExit)
  const dPhiDt = (travel.phiEntry - travel.phiExit) / travel.duration
  const dA = -travel.a * Math.sin(phi) * dPhiDt
  const dB = travel.b * Math.cos(phi) * dPhiDt
  return [
    dA * travel.uHat[0] + dB * travel.wHat[0],
    dA * travel.uHat[1] + dB * travel.wHat[1],
    dA * travel.uHat[2] + dB * travel.wHat[2],
  ]
}
