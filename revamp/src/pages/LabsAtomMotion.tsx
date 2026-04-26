/*
 * /labs/atom-motion — multi-electron gravity-handoff stage.
 *
 * Two draggable nuclei (A, B). 1, 2, or 3 electrons, each with its own
 * orbital plane (`upHat`, perpendicular to the shared chord axis).
 * Locked once Start fires:
 *   - A and B positions
 *   - Electron count
 *   - Tilt (3D perspective rotation)
 *   - Per-electron orbital plane assignment (derived from count)
 * Free during motion:
 *   - Speed, Loop ON/OFF
 *   - Start / End / Travel triggers
 *
 * Per-electron phase machine (autonomous):
 *   orbitA -> travelAB -> orbitB -> travelBA -> orbitA
 * Each electron tracks its own elapsed-in-phase. Far-tip wrap detection
 * (theta crossing pi for orbitA, 0 for orbitB) is the only phase-change
 * trigger for orbits — guarantees the lemniscate handoff at the chord-
 * line tip is position+tangent continuous in every plane independently.
 *
 * Travel button: round-robin per-electron counter. Each tap increments
 * the counter for the next index in [0..count); each electron's probe
 * consumes its own count at its own next far-tip wrap. So tap once per
 * electron to dispatch them sequentially.
 *
 * Loop ON: probes auto-advance at every far-tip wrap regardless of the
 * Travel counter — every electron just keeps cycling through the round-
 * trip on its own clock.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { ELECTRON } from '../ui/atom/constants'
import { makeFadeTexture } from '../ui/atom/Electron'
import { usePrefersReducedMotion } from '../ui/atom/usePrefersReducedMotion'
import { LabsNav } from '../ui/atom/LabsNav'
import type { Vec3 } from '../ui/atom/runtime/types'
import {
  buildLemniscate,
  sCurvePos,
  orbitPosAt,
  type OrbitDesc,
} from '../ui/atom/runtime/travel'
import s from './LabsAtomMotion.module.css'

extend({ MeshLineGeometry, MeshLineMaterial })

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module '@react-three/fiber' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements {
    meshLineGeometry: object
    meshLineMaterial: object
  }
}

// --- Constants -------------------------------------------------------------

const ORBIT_OMEGA_BASE = 2.4
const ORBIT_PERIOD = (2 * Math.PI) / ORBIT_OMEGA_BASE
const FADE_DUR = 0.55
const LEMNISCATE_PERIOD = 6.0
const TRANSIT_DUR = LEMNISCATE_PERIOD / 2
// Number of full orbital laps loop mode runs before triggering a
// transit. Manual travel-button taps still fire on the very next wrap.
const LOOP_LAPS_BEFORE_TRAVEL = 2
// Global multiplier applied on top of the user-selected speed. Halved so the
// labelled "1×" is half as fast as before.
const SPEED_SCALE = 0.5
// Orbits are always circular (aspect = 1). Visual ellipses are purely a
// camera-angle effect on a 3D circle, not an actual orbital aspect.
const ORBIT_ASPECT = 1.0
const CAMERA_Z = 22.0
const FOV_DEG = 50

const INITIAL_POINT_A: Vec3 = [-8, 3, 0]
const INITIAL_POINT_B: Vec3 = [8, 3, 0]

const COMMIT: string =
  (import.meta.env.VITE_GIT_COMMIT as string | undefined) ?? 'dev-local'

// --- Types -----------------------------------------------------------------

type Existence = 'idle' | 'visible'
type MotionPhase = 'orbitA' | 'travelAB' | 'orbitB' | 'travelBA'

type ElectronSpec = {
  upHat: Vec3
  cwAtA: boolean
  initialPhase: number
}

// --- Per-electron plane assignments ---------------------------------------
// A plane through the chord axis is determined by an upHat direction; +up
// and -up span the same plane. So unique planes only span [0, π) of
// rotation around the chord — 180° / count gives evenly-spaced *distinct*
// 4-electron pinwheel: 45° apart in [0°, 180°). At tilt 0° two of the
// planes project to the same ellipse (45° and 135° are mirrors, identical
// for circles); at tilt > 0 all four read distinctly, matching the
// classic atom-flower-petal pattern.
// Plane assignments are fixed by index — adding e2 doesn't shuffle e1.

const MAX_ELECTRONS = 4

// Electron-fill order across the four orbital planes (0°, 45°, 90°, 135°
// around the chord X-axis). Reordered so e2 (index 1) is perpendicular
// to e1 — same four planes as before, different sequencing.
const ELECTRON_SPECS: ElectronSpec[] = [0, 2, 1, 3].map((k) => {
  const upAngle = (Math.PI * k) / MAX_ELECTRONS
  const upHat: Vec3 = [0, Math.cos(upAngle), Math.sin(upAngle)]
  const initialPhase = Math.PI + (2 * Math.PI * k) / MAX_ELECTRONS
  return { upHat, cwAtA: true, initialPhase }
})

// --- Geometry helpers ------------------------------------------------------

function chordHalfFrom(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2
}
function midpointFrom(a: Vec3, b: Vec3): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]
}
function tiltZFrom(a: Vec3, b: Vec3): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

function makeOrbitADesc(
  spec: ElectronSpec,
  chordHalf: number,
  orbitSize: number,
  entryAngle: number,
): OrbitDesc {
  return {
    center: [-chordHalf, 0, 0],
    plane: 'xy',
    upHat: spec.upHat,
    chordAxis: [1, 0, 0],
    size: orbitSize,
    aspect: ORBIT_ASPECT,
    omega: spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE,
    phase: entryAngle,
  }
}

function makeOrbitBDesc(
  spec: ElectronSpec,
  chordHalf: number,
  orbitSize: number,
): OrbitDesc {
  // Omega flips sign at B vs A. The lemniscate's tangent at the right
  // tip (tau=2pi for travelAB) points in +upHat. Orbit-B at theta=0
  // also needs +upHat tangent to match the handoff — that's
  // omega > 0 (CCW around B) when omega < 0 (CW around A). Without
  // the flip the new orbit goes "the wrong direction" after capture.
  return {
    center: [chordHalf, 0, 0],
    plane: 'xy',
    upHat: spec.upHat,
    chordAxis: [1, 0, 0],
    size: orbitSize,
    aspect: ORBIT_ASPECT,
    omega: spec.cwAtA ? ORBIT_OMEGA_BASE : -ORBIT_OMEGA_BASE,
    phase: 0,
  }
}

// First-far-tip time within a phase given entry angle, omega, target.
function tOffsetTo(entryAngle: number, omega: number, target: number): number {
  const raw = (target - entryAngle) / omega
  return ((raw % ORBIT_PERIOD) + ORBIT_PERIOD) % ORBIT_PERIOD
}

// --- Camera + projection ---------------------------------------------------

function CameraController({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.z = zoom
    camera.updateProjectionMatrix()
  }, [zoom, camera])
  return null
}

function projectWorldToScreen(world: Vec3, zoom: number, w: number, h: number) {
  const halfH = zoom * Math.tan(((FOV_DEG * Math.PI) / 180) / 2)
  const halfW = halfH * (w / h)
  return {
    x: (w / 2) * (1 + world[0] / halfW),
    y: (h / 2) * (1 - world[1] / halfH),
  }
}
function unprojectScreenToWorld(
  clientX: number,
  clientY: number,
  zoom: number,
  w: number,
  h: number,
): Vec3 {
  const halfH = zoom * Math.tan(((FOV_DEG * Math.PI) / 180) / 2)
  const halfW = halfH * (w / h)
  return [((2 * clientX - w) / w) * halfW, ((h - 2 * clientY) / h) * halfH, 0]
}

// --- ElectronProbe (autonomous phase machine) -----------------------------

function ElectronProbe({
  spec,
  fadeTex,
  reducedMotion,
  speedMult,
  chordHalf,
  orbitSize,
  existence,
  autoReplay,
  travelCount,
  startSeed,
  trailColor,
  color,
  haloColor,
}: {
  spec: ElectronSpec
  fadeTex: THREE.DataTexture
  reducedMotion: boolean
  speedMult: number
  chordHalf: number
  orbitSize: number
  existence: Existence
  autoReplay: boolean
  travelCount: number
  startSeed: number
  trailColor: string
  color: string
  haloColor: string
}) {
  const headRef = useRef<THREE.Mesh>(null!)
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailGeomRef = useRef<any>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailMatRef = useRef<any>(null!)

  const phaseRef = useRef<MotionPhase>('orbitA')
  const phaseElapsedRef = useRef(0)
  const entryAngleRef = useRef(spec.initialPhase)
  const opacityRef = useRef(0)
  // Counts completed orbital laps in the current orbit phase. Loop mode
  // travels only after LOOP_LAPS_BEFORE_TRAVEL wraps.
  const lapsInPhaseRef = useRef(0)
  const lastPosRef = useRef<Vec3>([-chordHalf, 0, 0])
  const lastTravelCountRef = useRef(travelCount)
  const lastStartSeedRef = useRef(-1)

  const { size, invalidate } = useThree()
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  )

  const bufRef = useRef<Float32Array | null>(null)
  const insertIdxRef = useRef(0)
  if (!bufRef.current) {
    bufRef.current = new Float32Array(ELECTRON.trail.segments * 3)
  }

  // Reset probe on Start (startSeed bumps).
  useEffect(() => {
    if (lastStartSeedRef.current === startSeed) return
    lastStartSeedRef.current = startSeed
    phaseRef.current = 'orbitA'
    entryAngleRef.current = spec.initialPhase
    phaseElapsedRef.current = 0
    opacityRef.current = 0
    lapsInPhaseRef.current = 0
    // Catch up the travel-count baseline so old taps don't immediately
    // fire on the new run.
    lastTravelCountRef.current = travelCount
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize, spec.initialPhase)
    const seed: Vec3 = orbitPosAt(orbitA, spec.initialPhase)
    if (bufRef.current) {
      for (let i = 0; i < ELECTRON.trail.segments; i++) {
        bufRef.current[i * 3] = seed[0]
        bufRef.current[i * 3 + 1] = seed[1]
        bufRef.current[i * 3 + 2] = seed[2]
      }
    }
    insertIdxRef.current = 0
    lastPosRef.current = seed
    if (headRef.current) headRef.current.position.set(seed[0], seed[1], seed[2])
    if (haloRef.current) haloRef.current.position.set(seed[0], seed[1], seed[2])
    if (headMatRef.current) headMatRef.current.opacity = 0
    if (haloMatRef.current) haloMatRef.current.opacity = 0
    if (trailMatRef.current) trailMatRef.current.opacity = 0
    invalidate()
  }, [startSeed, spec, chordHalf, orbitSize, travelCount, invalidate])

  // Reduced-motion: park at orbit-A entry angle, full opacity. No motion.
  useEffect(() => {
    if (!reducedMotion) return
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize, spec.initialPhase)
    const restPos = orbitPosAt(orbitA, spec.initialPhase)
    if (bufRef.current) {
      for (let i = 0; i < ELECTRON.trail.segments; i++) {
        bufRef.current[i * 3] = restPos[0]
        bufRef.current[i * 3 + 1] = restPos[1]
        bufRef.current[i * 3 + 2] = restPos[2]
      }
    }
    insertIdxRef.current = 0
    lastPosRef.current = restPos
    if (headRef.current) headRef.current.position.set(restPos[0], restPos[1], restPos[2])
    if (haloRef.current) haloRef.current.position.set(restPos[0], restPos[1], restPos[2])
    if (headMatRef.current) headMatRef.current.opacity = 1
    if (haloMatRef.current) haloMatRef.current.opacity = 0.42
    if (trailMatRef.current) trailMatRef.current.opacity = 1
    opacityRef.current = 1
    invalidate()
  }, [reducedMotion, spec, chordHalf, orbitSize, invalidate])

  useFrame((_, delta) => {
    if (reducedMotion) return

    const dt = Math.min(delta, 1 / 30) * speedMult * SPEED_SCALE
    const prevLocalT = phaseElapsedRef.current
    phaseElapsedRef.current += dt
    let localT = phaseElapsedRef.current

    // Opacity lerp toward existence target. Wall-clock so speed doesn't
    // change visual fade rate.
    const targetOpacity = existence === 'visible' ? 1 : 0
    const opacityRate = delta / FADE_DUR
    if (opacityRef.current < targetOpacity) {
      opacityRef.current = Math.min(targetOpacity, opacityRef.current + opacityRate)
    } else if (opacityRef.current > targetOpacity) {
      opacityRef.current = Math.max(targetOpacity, opacityRef.current - opacityRate)
    }

    // Fully faded out — don't run motion math, just keep meshes hidden.
    if (existence === 'idle' && opacityRef.current === 0) {
      if (headMatRef.current) headMatRef.current.opacity = 0
      if (haloMatRef.current) haloMatRef.current.opacity = 0
      if (trailMatRef.current) trailMatRef.current.opacity = 0
      return
    }

    // Phase-change checks BEFORE position computation, so we render the
    // post-transition position on the same frame.
    let phase = phaseRef.current
    if (phase === 'orbitA' || phase === 'orbitB') {
      // Far-tip wrap detection.
      const targetAngle = phase === 'orbitA' ? Math.PI : 0
      const omega = spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE
      const entry = phase === 'orbitA' ? entryAngleRef.current : 0
      const tOffset = tOffsetTo(entry, omega, targetAngle)
      const dist = (t: number) => (((t - tOffset) % ORBIT_PERIOD) + ORBIT_PERIOD) % ORBIT_PERIOD
      const dPrev = dist(prevLocalT)
      const dCurr = dist(localT)
      const wrapped = prevLocalT > 1e-3 && dPrev > dCurr && dPrev - dCurr > ORBIT_PERIOD / 2
      if (wrapped) {
        lapsInPhaseRef.current += 1
        const newTravel = travelCount > lastTravelCountRef.current
        const loopReady = autoReplay && lapsInPhaseRef.current >= LOOP_LAPS_BEFORE_TRAVEL
        if (newTravel || loopReady) {
          phase = phase === 'orbitA' ? 'travelAB' : 'travelBA'
          phaseRef.current = phase
          phaseElapsedRef.current = 0
          localT = 0
          lapsInPhaseRef.current = 0
          if (newTravel) lastTravelCountRef.current = travelCount
        }
      }
    } else {
      // Transit complete?
      if (localT >= TRANSIT_DUR) {
        const next: MotionPhase = phase === 'travelAB' ? 'orbitB' : 'orbitA'
        phase = next
        phaseRef.current = phase
        // Carry over excess so motion stays smooth at the boundary.
        const overshoot = localT - TRANSIT_DUR
        phaseElapsedRef.current = overshoot
        localT = overshoot
        // Reset lap counter for the new orbit phase.
        lapsInPhaseRef.current = 0
        // Re-entry orbits land at the chord-line far-tip exactly.
        if (next === 'orbitA') entryAngleRef.current = Math.PI
        // (orbit-B's entry angle is always 0 — built into makeOrbitBDesc.)
      }
    }

    // Compute position for current phase.
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize, entryAngleRef.current)
    const orbitB = makeOrbitBDesc(spec, chordHalf, orbitSize)
    let pos: Vec3 = lastPosRef.current

    if (phase === 'orbitA') {
      const theta = entryAngleRef.current + orbitA.omega * localT
      pos = orbitPosAt(orbitA, theta)
    } else if (phase === 'orbitB') {
      const theta = 0 + orbitB.omega * localT
      pos = orbitPosAt(orbitB, theta)
    } else {
      // travelAB: tau = pi -> 2pi (left lobe tip -> right lobe tip)
      // travelBA: tau = 0 -> pi (right -> left, the other half)
      //
      // FUTURE — same-rotation transit pathway (user-requested re-add):
      // Pre-multi-electron there was a second mode that used a single
      // ellipse-arc transit (`buildTravel` + `evalTravel` from
      // runtime/travel.ts) instead of the lemniscate. It kept orbital
      // rotation the SAME at A and B (no omega flip) and produced a
      // gentler top-/bottom-sweep arc rather than the figure-8 S-curve.
      // User preferred its visual feel for some atoms — wants the
      // option to switch between the two pathways. Re-add as a per-
      // electron-spec or per-atom flag, gated by a panel toggle.
      // Constraint: same-rotation arc only generalizes cleanly when the
      // orbit's perpendicular direction is consistent with the transit's
      // wHat — need to thread an upHat fallback through buildTravel for
      // the multi-plane case (chord-line exit has perpLen ≈ 0).
      const lemnisc = buildLemniscate(
        [-chordHalf, 0, 0],
        [chordHalf, 0, 0],
        spec.upHat,
      )
      // S-curve fitted to current geometry: lobe-tips at orbit far-tips
      // (a = chordHalf + orbitSize), amplitude in the same aspect ratio
      // as the original Bernoulli lemniscate (a / 2√2).
      const a = chordHalf + orbitSize
      const amp = a / (2 * Math.SQRT2)
      const t01 = Math.min(localT / TRANSIT_DUR, 1)
      const direction = phase === 'travelAB' ? -1 : 1
      pos = sCurvePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, a, amp, t01, direction)
    }

    lastPosRef.current = pos
    headRef.current.position.set(pos[0], pos[1], pos[2])
    if (haloRef.current) haloRef.current.position.set(pos[0], pos[1], pos[2])

    // Trail ring buffer.
    const buf = bufRef.current!
    const idx = insertIdxRef.current
    buf[idx * 3] = pos[0]
    buf[idx * 3 + 1] = pos[1]
    buf[idx * 3 + 2] = pos[2]
    insertIdxRef.current = (idx + 1) % ELECTRON.trail.segments
    const unroll = new Float32Array(ELECTRON.trail.segments * 3)
    for (let i = 0; i < ELECTRON.trail.segments; i++) {
      const src = (insertIdxRef.current + i) % ELECTRON.trail.segments
      unroll[i * 3] = buf[src * 3]
      unroll[i * 3 + 1] = buf[src * 3 + 1]
      unroll[i * 3 + 2] = buf[src * 3 + 2]
    }
    if (trailGeomRef.current?.setPoints) trailGeomRef.current.setPoints(unroll)

    if (headMatRef.current) headMatRef.current.opacity = opacityRef.current
    if (haloMatRef.current) haloMatRef.current.opacity = opacityRef.current * 0.42
    if (trailMatRef.current) trailMatRef.current.opacity = opacityRef.current
  })

  return (
    <>
      <mesh>
        <meshLineGeometry ref={trailGeomRef} />
        <meshLineMaterial
          ref={trailMatRef}
          color={trailColor}
          lineWidth={0.13}
          transparent
          opacity={0}
          depthWrite={false}
          alphaMap={fadeTex}
          useAlphaMap={1}
          toneMapped={false}
          resolution={resolution}
        />
      </mesh>
      <mesh ref={haloRef} scale={1.7}>
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={haloColor}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshBasicMaterial
          ref={headMatRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
    </>
  )
}

// --- Nuclei ----------------------------------------------------------------

function Nuclei({ chordHalf, color }: { chordHalf: number; color: string }) {
  return (
    <>
      <mesh position={[-chordHalf, 0, 0]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <mesh position={[chordHalf, 0, 0]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </>
  )
}

// --- Axis indicators ------------------------------------------------------
// Three short hash-marked segments at the chord midpoint along local +X
// (chord), +Y, +Z. Subtle, dashed feel — orientation cue, not chrome.
// Sit in the inner (tilt) group so they rotate with the atom.

function AxisLine({
  direction,
  length,
  color,
  opacity = 0.45,
  ticks = 4,
  tickSize = 0.06,
}: {
  direction: Vec3
  length: number
  color: string
  opacity?: number
  ticks?: number
  tickSize?: number
}) {
  const positions = useMemo(() => {
    const arr: number[] = []
    // Main axis from origin to direction*length
    arr.push(0, 0, 0, direction[0] * length, direction[1] * length, direction[2] * length)
    // Pick a perpendicular for tick orientation. Any vector not parallel
    // to direction works; cross with world up [0,1,0] unless direction
    // is also +/-Y, in which case use +X.
    const isY = Math.abs(direction[1]) > 0.99
    const ref: Vec3 = isY ? [1, 0, 0] : [0, 1, 0]
    // perp1 = direction × ref, normalized
    const px = direction[1] * ref[2] - direction[2] * ref[1]
    const py = direction[2] * ref[0] - direction[0] * ref[2]
    const pz = direction[0] * ref[1] - direction[1] * ref[0]
    const plen = Math.hypot(px, py, pz)
    const perp: Vec3 = [px / plen, py / plen, pz / plen]
    for (let i = 1; i <= ticks; i++) {
      const t = (i / ticks) * length
      const cx = direction[0] * t
      const cy = direction[1] * t
      const cz = direction[2] * t
      arr.push(
        cx - perp[0] * tickSize, cy - perp[1] * tickSize, cz - perp[2] * tickSize,
        cx + perp[0] * tickSize, cy + perp[1] * tickSize, cz + perp[2] * tickSize,
      )
    }
    return new Float32Array(arr)
  }, [direction, length, ticks, tickSize])

  return (
    <lineSegments renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        toneMapped={false}
        depthWrite={false}
        depthTest={false}
      />
    </lineSegments>
  )
}

function AxisIndicators({
  chordHalf,
  colors,
  opacity,
}: {
  chordHalf: number
  colors: { x: string; y: string; z: string }
  opacity: number
}) {
  // Length capped so the axes stay in the inter-nucleus gap and never reach
  // into the orbital region. Orbit's leftmost extent from origin is
  // chordHalf*(1 - (sqrt(2)-1)) ≈ 0.586*chordHalf; 0.5 keeps a safe margin.
  const length = chordHalf * 0.5
  return (
    <>
      <AxisLine direction={[1, 0, 0]} length={length} color={colors.x} opacity={opacity} />
      <AxisLine direction={[0, 1, 0]} length={length} color={colors.y} opacity={opacity} />
      <AxisLine direction={[0, 0, 1]} length={length} color={colors.z} opacity={opacity} />
    </>
  )
}

// --- Drag handle (invisible touch target over the nucleus) ----------------

function DragHandle({
  pos,
  onDrag,
  zoom,
  viewport,
  enabled,
  label,
}: {
  pos: Vec3
  onDrag: (next: Vec3) => void
  zoom: number
  viewport: { w: number; h: number }
  enabled: boolean
  label: 'A' | 'B'
}) {
  const screen = projectWorldToScreen(pos, zoom, viewport.w, viewport.h)
  if (!enabled) return null
  return (
    <div
      className={s.dragHandle}
      style={{ left: `${screen.x}px`, top: `${screen.y}px` }}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        ;(e.target as HTMLDivElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!(e.target as HTMLDivElement).hasPointerCapture(e.pointerId)) return
        e.preventDefault()
        e.stopPropagation()
        onDrag(unprojectScreenToWorld(e.clientX, e.clientY, zoom, viewport.w, viewport.h))
      }}
      onPointerUp={(e) => {
        ;(e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
      }}
      aria-label={`Drag point ${label}`}
    />
  )
}

// --- Theme palette ---------------------------------------------------------

type ThemeName = 'light' | 'dark'
const THEME_KEY = 'labs-atom-motion-theme'

const THEME_PALETTE: Record<ThemeName, {
  ink: string
  axisX: string
  axisY: string
  axisZ: string
  axisOpacity: number
}> = {
  light: {
    ink: '#141312',
    axisX: '#c45050',
    axisY: '#3d8f3d',
    axisZ: '#4a55c4',
    axisOpacity: 0.32,
  },
  dark: {
    ink: '#ffffff',
    axisX: '#ff8a8a',
    axisY: '#8aff8a',
    axisZ: '#8a8aff',
    axisOpacity: 0.45,
  },
}

function useTheme(): [ThemeName, (next: ThemeName) => void] {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof localStorage === 'undefined') return 'dark'
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'light' ? 'light' : 'dark'
  })
  const update = useCallback((next: ThemeName) => {
    setTheme(next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* ignore */ }
  }, [])
  return [theme, update]
}

// --- Page ------------------------------------------------------------------

function useViewport() {
  const [v, setV] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setV({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return v
}

export function LabsAtomMotion() {
  const [pointA, setPointA] = useState<Vec3>(INITIAL_POINT_A)
  const [pointB, setPointB] = useState<Vec3>(INITIAL_POINT_B)
  const [electronCount, setElectronCount] = useState(0)
  const [tiltXDeg, setTiltXDeg] = useState(0)
  const [tiltYDeg, setTiltYDeg] = useState(75)
  const [tiltZDeg, setTiltZDeg] = useState(180)
  const [autoReplay, setAutoReplay] = useState(false)
  const [zoom, setZoom] = useState(CAMERA_Z)
  const [speedMult, setSpeedMult] = useState(5)
  const [startSeeds, setStartSeeds] = useState<number[]>(() =>
    new Array(MAX_ELECTRONS).fill(0),
  )
  const [travelCounts, setTravelCounts] = useState<number[]>(() =>
    new Array(MAX_ELECTRONS).fill(0),
  )
  const [nextTravelIndex, setNextTravelIndex] = useState(0)
  const [showGuides, setShowGuides] = useState(false)
  const [theme, setTheme] = useTheme()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'stage' | 'motion' | 'display'>('stage')

  // Contextual hint above the action strip — guides the user through the
  // happy path. Empty string = no hint shown (animation in flow).
  const totalTravels = useMemo(
    () => travelCounts.reduce((a, b) => a + b, 0),
    [travelCounts],
  )
  const hintText = useMemo(() => {
    if (electronCount === 0) return 'Tap + e⁻ to add an electron'
    if (autoReplay) return 'Looping'
    if (totalTravels === 0) return 'Tap ⇋ travel to send it across'
    return ''
  }, [electronCount, autoReplay, totalTravels])
  const palette = THEME_PALETTE[theme]

  const viewport = useViewport()
  const reducedMotion = usePrefersReducedMotion()
  // Sharper fade (power 5) concentrates the visible trail near the head
  // and pushes the alpha-zero zone over a longer stretch. Hides the
  // head-vs-tail wrap seam that shows up as a "black notch" at higher
  // effective speeds, where the trail wraps around the orbit once.
  const fadeTex = useMemo(() => makeFadeTexture(5), [])

  // Stage-center Y in world coords: scales with zoom so the atom always
  // renders at the visible-canvas vertical center (above the controls
  // panel) regardless of how far the camera is pulled back. 0.15 ≈
  // controls panel covers ~30% of viewport, so visible-canvas center
  // sits ~15% above viewport midline.
  const stageCenterY = useMemo(() => {
    const halfTan = Math.tan(((FOV_DEG * Math.PI) / 180) / 2)
    return zoom * 0.15 * 2 * halfTan
  }, [zoom])

  // Whenever stage-center shifts (zoom change), translate both points so
  // the midpoint stays locked to the stage center. Preserves chord
  // direction and length.
  useEffect(() => {
    const midY = (pointA[1] + pointB[1]) / 2
    const dy = stageCenterY - midY
    if (Math.abs(dy) < 1e-4) return
    setPointA((p) => [p[0], p[1] + dy, p[2]])
    setPointB((p) => [p[0], p[1] + dy, p[2]])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageCenterY])

  const chordHalf = useMemo(() => chordHalfFrom(pointA, pointB), [pointA, pointB])
  // Orbit size is fixed — atoms keep the same on-screen size regardless of
  // how far apart they're placed. The transit math (sCurvePos) generalises
  // to any chord/orbit ratio so the S-shape recalculates from the placed
  // positions.
  const orbitSize = useMemo(() => 3 * (Math.SQRT2 - 1), [])
  const groupOffset = useMemo(() => midpointFrom(pointA, pointB), [pointA, pointB])
  const groupTiltZ = useMemo(() => tiltZFrom(pointA, pointB), [pointA, pointB])
  const tiltXRad = useMemo(() => (tiltXDeg * Math.PI) / 180, [tiltXDeg])
  const tiltYRad = useMemo(() => (tiltYDeg * Math.PI) / 180, [tiltYDeg])
  const tiltZRad = useMemo(() => (tiltZDeg * Math.PI) / 180, [tiltZDeg])

  const dragLocked = electronCount > 0

  const onAddElectron = useCallback(() => {
    setElectronCount((c) => {
      if (c >= MAX_ELECTRONS) return c
      const newIdx = c
      setStartSeeds((seeds) => {
        const next = seeds.slice()
        next[newIdx] = (next[newIdx] ?? 0) + 1
        return next
      })
      return c + 1
    })
  }, [])
  const onEnd = useCallback(() => {
    setElectronCount(0)
    setTravelCounts(new Array(MAX_ELECTRONS).fill(0))
    setNextTravelIndex(0)
  }, [])
  const onTravel = useCallback(() => {
    if (electronCount === 0) return
    setTravelCounts((counts) => {
      const next = counts.slice()
      next[nextTravelIndex] = (next[nextTravelIndex] ?? 0) + 1
      return next
    })
    setNextTravelIndex((i) => (i + 1) % electronCount)
  }, [nextTravelIndex, electronCount])

  // Scales the A↔B distance symmetrically about the midpoint while preserving
  // chord direction. Lets the user spread the nuclei without fighting the
  // drag handles (which can't reach past the screen edge at low zoom).
  const setSpread = useCallback((newHalf: number) => {
    const mx = (pointA[0] + pointB[0]) / 2
    const my = (pointA[1] + pointB[1]) / 2
    const mz = (pointA[2] + pointB[2]) / 2
    const dx = pointA[0] - mx
    const dy = pointA[1] - my
    const dz = pointA[2] - mz
    const curHalf = Math.hypot(dx, dy, dz)
    if (curHalf < 1e-6) {
      setPointA([mx - newHalf, my, mz])
      setPointB([mx + newHalf, my, mz])
      return
    }
    const k = newHalf / curHalf
    setPointA([mx + dx * k, my + dy * k, mz + dz * k])
    setPointB([mx - dx * k, my - dy * k, mz - dz * k])
  }, [pointA, pointB])

  return (
    <div className={`${s.root} ${theme === 'light' ? s.themeLight : s.themeDark}`}>
      <div className={s.canvasArea}>
        <Canvas
          camera={{ position: [0, 0, zoom], fov: FOV_DEG }}
          frameloop="always"
          aria-hidden="true"
        >
          <CameraController zoom={zoom} />
          <group position={groupOffset} rotation={[0, 0, groupTiltZ]}>
            <group rotation={[tiltXRad, tiltYRad, tiltZRad]}>
              {showGuides && (
                <>
                  <AxisIndicators
                    chordHalf={chordHalf}
                    colors={{ x: palette.axisX, y: palette.axisY, z: palette.axisZ }}
                    opacity={palette.axisOpacity}
                  />
                  <Nuclei chordHalf={chordHalf} color={palette.ink} />
                </>
              )}
              {ELECTRON_SPECS.map((spec, i) => (
                <ElectronProbe
                  key={`e${i}`}
                  spec={spec}
                  fadeTex={fadeTex}
                  reducedMotion={reducedMotion}
                  speedMult={speedMult}
                  chordHalf={chordHalf}
                  orbitSize={orbitSize}
                  existence={i < electronCount ? 'visible' : 'idle'}
                  autoReplay={autoReplay}
                  travelCount={travelCounts[i] ?? 0}
                  startSeed={startSeeds[i] ?? 0}
                  trailColor={palette.ink}
                  color={palette.ink}
                  haloColor={palette.ink}
                />
              ))}
            </group>
          </group>
        </Canvas>
      </div>

      <LabsNav />

      <DragHandle
        pos={pointA}
        onDrag={(p) => {
          setPointA(p)
          setPointB([-p[0], 2 * stageCenterY - p[1], -p[2]])
        }}
        zoom={zoom}
        viewport={viewport}
        enabled={!dragLocked}
        label="A"
      />
      <DragHandle
        pos={pointB}
        onDrag={(p) => {
          setPointB(p)
          setPointA([-p[0], 2 * stageCenterY - p[1], -p[2]])
        }}
        zoom={zoom}
        viewport={viewport}
        enabled={!dragLocked}
        label="B"
      />

      {hintText && <div className={s.hintLine}>{hintText}</div>}

      <div className={s.actionStrip} aria-label="Motion controls">
        <button
          type="button"
          className={s.btn}
          onClick={onAddElectron}
          aria-label={
            electronCount >= MAX_ELECTRONS
              ? `Maximum ${MAX_ELECTRONS} electrons`
              : `Add electron ${electronCount + 1}`
          }
          title={`Add electron (${electronCount}/${MAX_ELECTRONS})`}
          disabled={electronCount >= MAX_ELECTRONS}
        >
          {electronCount >= MAX_ELECTRONS
            ? `${MAX_ELECTRONS}/${MAX_ELECTRONS} e⁻`
            : `+ e⁻ (${electronCount}/${MAX_ELECTRONS})`}
        </button>
        <button
          type="button"
          className={s.btn}
          onClick={onTravel}
          aria-label={`Travel electron ${nextTravelIndex + 1}`}
          title={`Travel — next: e${nextTravelIndex + 1}`}
          disabled={electronCount === 0}
        >
          {`⇋ travel e${nextTravelIndex + 1}`}
        </button>
        <button
          type="button"
          className={s.btn}
          onClick={onEnd}
          aria-label="End"
          title="End — fade out, drag re-enabled"
          disabled={electronCount === 0}
        >
          ■ end
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon} ${s.tuneBtn}`}
          onClick={() => setSheetOpen((v) => !v)}
          aria-label={sheetOpen ? 'Close settings' : 'Open settings'}
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {sheetOpen && (
        <div
          className={s.sheetBackdrop}
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`${s.sheet} ${sheetOpen ? s.sheetOpen : ''}`}
        role="dialog"
        aria-label="Settings"
        aria-hidden={!sheetOpen}
      >
        <div className={s.sheetHandle}>
          <div className={s.sheetHandleBar} />
        </div>
        <div className={s.tabBar}>
          <button
            type="button"
            className={`${s.tab} ${activeTab === 'stage' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('stage')}
          >
            stage
          </button>
          <button
            type="button"
            className={`${s.tab} ${activeTab === 'motion' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('motion')}
          >
            motion
          </button>
          <button
            type="button"
            className={`${s.tab} ${activeTab === 'display' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('display')}
          >
            display
          </button>
        </div>

        <div className={s.tabContent}>
          {activeTab === 'stage' && (
            <>
              <div className={s.tiltSliderRow}>
                <span className={s.tiltSliderLabel}>{`spread  ${chordHalf.toFixed(1)}`}</span>
                <input
                  type="range"
                  min={1.5}
                  max={20}
                  step={0.1}
                  value={Math.min(20, Math.max(1.5, chordHalf))}
                  onChange={(e) => setSpread(parseFloat(e.currentTarget.value))}
                  className={s.tiltSlider}
                  aria-label="Spread (chord half-distance)"
                />
              </div>
              <div className={s.tiltSliderRow}>
                <span className={s.tiltSliderLabel}>{`tilt X  ${tiltXDeg}°`}</span>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={1}
                  value={tiltXDeg}
                  onChange={(e) => setTiltXDeg(parseInt(e.currentTarget.value, 10))}
                  className={s.tiltSlider}
                  aria-label="Tilt around X axis"
                />
              </div>
              <div className={s.tiltSliderRow}>
                <span className={s.tiltSliderLabel}>{`tilt Y  ${tiltYDeg}°`}</span>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={1}
                  value={tiltYDeg}
                  onChange={(e) => setTiltYDeg(parseInt(e.currentTarget.value, 10))}
                  className={s.tiltSlider}
                  aria-label="Tilt around Y axis"
                />
              </div>
              <div className={s.tiltSliderRow}>
                <span className={s.tiltSliderLabel}>{`tilt Z  ${tiltZDeg}°`}</span>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={1}
                  value={tiltZDeg}
                  onChange={(e) => setTiltZDeg(parseInt(e.currentTarget.value, 10))}
                  className={s.tiltSlider}
                  aria-label="Tilt around Z axis"
                />
              </div>
              <div className={s.controlsRow}>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnIcon}`}
                  onClick={() => setZoom((z) => Math.max(2, +(z / 1.25).toFixed(2)))}
                  aria-label="Zoom in"
                  title="Zoom in (closer)"
                >
                  −
                </button>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnIcon}`}
                  onClick={() => setZoom((z) => Math.min(80, +(z * 1.25).toFixed(2)))}
                  aria-label="Zoom out"
                  title="Zoom out (farther)"
                >
                  +
                </button>
              </div>
            </>
          )}

          {activeTab === 'motion' && (
            <>
              <div className={s.tiltSliderRow}>
                <span className={s.tiltSliderLabel}>{`speed  ${speedMult}×`}</span>
                <input
                  type="range"
                  min={0.5}
                  max={6}
                  step={0.5}
                  value={speedMult}
                  onChange={(e) => setSpeedMult(parseFloat(e.currentTarget.value))}
                  className={s.tiltSlider}
                  aria-label="Animation speed"
                />
              </div>
              <div className={s.controlsRow}>
                <button
                  type="button"
                  className={`${s.btn} ${autoReplay ? s.btnActive : ''}`}
                  onClick={() => setAutoReplay((v) => !v)}
                  aria-label={autoReplay ? 'Disable auto-loop' : 'Enable auto-loop'}
                  title={autoReplay ? 'Auto-loop on' : 'Auto-loop off'}
                >
                  {autoReplay ? '↻ loop' : '↻ once'}
                </button>
              </div>
            </>
          )}

          {activeTab === 'display' && (
            <>
              <div className={s.controlsRow}>
                <button
                  type="button"
                  className={s.btn}
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? '☼ light' : '☾ dark'}
                </button>
                <button
                  type="button"
                  className={`${s.btn} ${showGuides ? s.btnActive : ''}`}
                  onClick={() => setShowGuides((v) => !v)}
                  aria-label={showGuides ? 'Hide axis and nuclei' : 'Show axis and nuclei'}
                >
                  {showGuides ? '✦ guides' : '✧ guides'}
                </button>
              </div>
              <span className={s.buildLabel}>{`build·${COMMIT} · z=${zoom.toFixed(1)}`}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
