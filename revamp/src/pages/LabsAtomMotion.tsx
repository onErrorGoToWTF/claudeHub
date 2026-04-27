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
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { ELECTRON } from '../ui/atom/constants'
import { makeFadeTexture } from '../ui/atom/Electron'
import { usePrefersReducedMotion } from '../ui/atom/usePrefersReducedMotion'
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
const LOOP_LAPS_BEFORE_TRAVEL = 3
// Global multiplier applied on top of the user-selected speed. Halved so the
// labelled "1×" is half as fast as before.
const SPEED_SCALE = 0.5
// Orbits are always circular (aspect = 1). Visual ellipses are purely a
// camera-angle effect on a 3D circle, not an actual orbital aspect.
const ORBIT_ASPECT = 1.0
// Default camera position (rotated 3-quarter view captured from the user's
// preferred starting orientation). Matches Preset 1.
const DEFAULT_CAMERA_POS: [number, number, number] = [-18.69, 12.91, -4.52]
const DEFAULT_CAMERA_TARGET: [number, number, number] = [0.83, -2.96, 1.15]
const FOV_DEG = 50

const INITIAL_POINT_A: Vec3 = [-8.6, 0, 0]
const INITIAL_POINT_B: Vec3 = [8.6, 0, 0]

const COMMIT: string =
  (import.meta.env.VITE_GIT_COMMIT as string | undefined) ?? 'dev-local'

// Generates a multi-ring radial texture for electron heads — bright hot
// core, alternating dim/bright shells, soft outer fade. Sized 512×512 so
// deep-zoom views render with crisp internal structure; at zoom-out the
// rings smear into a clean glow. White RGB is tinted by SpriteMaterial
// .color (per-electron), so this texture is shared across all 4.
function makeSoftOrbTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  // Sharp core
  g.addColorStop(0.00, 'rgba(255, 255, 255, 1.00)')
  g.addColorStop(0.10, 'rgba(255, 255, 255, 1.00)')
  // First dim band
  g.addColorStop(0.14, 'rgba(255, 255, 255, 0.40)')
  g.addColorStop(0.22, 'rgba(255, 255, 255, 0.40)')
  // Bright ring
  g.addColorStop(0.26, 'rgba(255, 255, 255, 0.80)')
  g.addColorStop(0.34, 'rgba(255, 255, 255, 0.80)')
  // Second dim band
  g.addColorStop(0.38, 'rgba(255, 255, 255, 0.28)')
  g.addColorStop(0.55, 'rgba(255, 255, 255, 0.28)')
  // Outer fade
  g.addColorStop(0.78, 'rgba(255, 255, 255, 0.10)')
  g.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// --- Types -----------------------------------------------------------------

type Existence = 'idle' | 'visible'
type MotionPhase = 'orbitA' | 'travelAB' | 'orbitB' | 'travelBA'

type ElectronSpec = {
  upHat: Vec3
  cwAtA: boolean
  initialPhase: number
}

const DEFAULT_E_COLOR = '#ffdbd8'

// --- Per-electron plane assignments ---------------------------------------
// A plane through the chord axis is determined by an upHat direction; +up
// and -up span the same plane. So unique planes only span [0, π) of
// rotation around the chord — 180° / N gives evenly-spaced distinct planes.
// Specs are recomputed for the active N (1..MAX_ELECTRONS) so all electrons
// stay symmetrically placed at any count.

const MAX_ELECTRONS = 16

// Stepping values for the appearance-cluster +/− buttons. Granular
// 1–3 at the low end so the user can drop below 4 (destructive — the
// symmetric layout breaks but existing electrons keep their phase),
// then clean symmetry steps: 4 (square), 6 (hex), 8 (octagonal),
// 12 (sphere-ish), 16 (max / supercharge). Slider still allows any
// integer in [1, 16] for free tuning.
const COUNT_STEPS = [1, 2, 3, 4, 6, 8, 12, 16] as const

function nextCountStep(n: number): number | null {
  for (const s of COUNT_STEPS) if (s > n) return s
  return null
}
function prevCountStep(n: number): number | null {
  let r: number | null = null
  for (const s of COUNT_STEPS) if (s < n) r = s
  return r
}

function buildElectronSpecs(N: number): ElectronSpec[] {
  const safeN = Math.max(1, Math.min(MAX_ELECTRONS, N))
  // For N ≤ 4: use a subset of the N=4 plane set in fill order [0, 2, 1, 3]
  // so 1→2 places e2 perpendicular to e1, 2→3 puts e3 at 45° (visually
  // furthest from the existing 0°/90° pair), 3→4 adds e4 at 135°.
  // Existing electrons keep their planes as new ones are added.
  if (safeN <= 4) {
    const FILL_ORDER_4 = [0, 2, 1, 3]
    return Array.from({ length: safeN }, (_, k) => {
      const planeIdx = FILL_ORDER_4[k]
      const upAngle = (Math.PI * planeIdx) / 4
      const upHat: Vec3 = [0, Math.cos(upAngle), Math.sin(upAngle)]
      const initialPhase = Math.PI + (2 * Math.PI * k) / safeN
      return { upHat, cwAtA: true, initialPhase }
    })
  }
  // For N ≥ 5 (sweet spots 6/8/12/16 and any in-between via slider):
  // full N-fold symmetric layout. Existing electrons reposition.
  return Array.from({ length: safeN }, (_, k) => {
    const upAngle = (Math.PI * k) / safeN
    const upHat: Vec3 = [0, Math.cos(upAngle), Math.sin(upAngle)]
    const initialPhase = Math.PI + (2 * Math.PI * k) / safeN
    return { upHat, cwAtA: true, initialPhase }
  })
}

// --- Color modes ----------------------------------------------------------

type ColorMode = 'solid' | 'individual' | 'gradient'

// Rainbow-friendly hue lerp via Three.js Color.lerpHSL — short-arc on the
// hue circle, perceptual enough for our purposes. Upgrade to oklch later
// if subtle warm/cool transitions need it.
function lerpHexColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  ca.lerpHSL(cb, t)
  return '#' + ca.getHexString()
}

function deriveElectronColors(
  N: number,
  mode: ColorMode,
  solid: string,
  individual: string[],
  gStart: string,
  gEnd: string,
): string[] {
  if (mode === 'solid') return new Array(N).fill(solid)
  if (mode === 'gradient') {
    if (N === 1) return [gStart]
    return Array.from({ length: N }, (_, i) => lerpHexColor(gStart, gEnd, i / (N - 1)))
  }
  // individual: cycle the user's palette if N exceeds palette length
  if (individual.length === 0) return new Array(N).fill(DEFAULT_E_COLOR)
  return Array.from({ length: N }, (_, i) => individual[i % individual.length] ?? DEFAULT_E_COLOR)
}

// --- Geometry helpers ------------------------------------------------------

function chordHalfFrom(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2
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

// Camera HUD — pushes live camera position + OrbitControls target back up
// to the page so the build-label HUD shows them. Lets the user screenshot
// exact values after rotating/panning into a view they want as default.
function CameraDebugger({
  onUpdate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef,
}: {
  onUpdate: (pos: [number, number, number], tgt: [number, number, number]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.MutableRefObject<any>
}) {
  useFrame(({ camera }) => {
    const t = controlsRef.current?.target
    onUpdate(
      [
        +camera.position.x.toFixed(2),
        +camera.position.y.toFixed(2),
        +camera.position.z.toFixed(2),
      ],
      t
        ? [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)]
        : [0, 0, 0],
    )
  })
  return null
}

// Master clock — page-level scaled-time accumulator. Increments inside the
// Canvas via useFrame so the value progresses on the same render tick the
// electrons use. Each new electron snaps its entry angle to this clock,
// which keeps freshly-added electrons evenly spaced relative to existing
// ones regardless of when the user adds them.
function MasterClock({
  timeRef,
  speedMult,
  reducedMotion,
}: {
  timeRef: React.MutableRefObject<number>
  speedMult: number
  reducedMotion: boolean
}) {
  useFrame((_, delta) => {
    if (reducedMotion) return
    timeRef.current += Math.min(delta, 1 / 30) * speedMult * SPEED_SCALE
  })
  return null
}

// --- ElectronProbe (autonomous phase machine) -----------------------------

function ElectronProbe({
  spec,
  fadeTex,
  orbTex,
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
  headScale,
  haloScale,
  trailWidth,
  globalScaledTimeRef,
}: {
  spec: ElectronSpec
  fadeTex: THREE.DataTexture
  orbTex: THREE.CanvasTexture
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
  headScale: number
  haloScale: number
  trailWidth: number
  globalScaledTimeRef: React.MutableRefObject<number>
}) {
  const headRef = useRef<THREE.Sprite>(null!)
  const headMatRef = useRef<THREE.SpriteMaterial>(null!)
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
    // Sync new electron to the master clock: enter at the angle this
    // electron WOULD be at if it had been running since global t=0. Same
    // formula across all electrons keeps them locked at constant phase
    // offsets (their evenly-spaced spec.initialPhase values).
    const omegaA = spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE
    const syncedEntry = spec.initialPhase + omegaA * globalScaledTimeRef.current
    entryAngleRef.current = syncedEntry
    phaseElapsedRef.current = 0
    opacityRef.current = 0
    lapsInPhaseRef.current = 0
    // Catch up the travel-count baseline so old taps don't immediately
    // fire on the new run.
    lastTravelCountRef.current = travelCount
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize, syncedEntry)
    const seed: Vec3 = orbitPosAt(orbitA, syncedEntry)
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
          lineWidth={trailWidth}
          transparent
          opacity={0}
          depthWrite={false}
          alphaMap={fadeTex}
          useAlphaMap={1}
          toneMapped={false}
          resolution={resolution}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={haloRef} scale={haloScale}>
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
      <sprite ref={headRef} scale={[headScale, headScale, 1]}>
        <spriteMaterial
          ref={headMatRef}
          map={orbTex}
          color={color}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </sprite>
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
  color,
  opacity,
}: {
  chordHalf: number
  color: string
  opacity: number
}) {
  // Extends past the inter-nucleus gap into the orbital region — guides
  // are now a single bg-derived tone (not 3 separate axis colors), so the
  // longer reach reads as orientation scaffolding, not "RGB axis tripod."
  const length = chordHalf * 1.2
  return (
    <>
      <AxisLine direction={[1, 0, 0]} length={length} color={color} opacity={opacity} />
      <AxisLine direction={[0, 1, 0]} length={length} color={color} opacity={opacity} />
      <AxisLine direction={[0, 0, 1]} length={length} color={color} opacity={opacity} />
    </>
  )
}

// Lightens a hex color in HSL space — used to derive the axis-guide tone
// from the active bgColor so the guides feel like a brighter shadow of
// the canvas, not a separate palette.
function lightenHex(hex: string, byL: number): string {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + byL))
  return '#' + c.getHexString()
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

// --- Presets --------------------------------------------------------------
// Curated example configurations. Order is the user-facing order. Append
// to grow. Preset 1 also doubles as the page's default state — applying
// it on a fresh load is a no-op visually.

type Preset = {
  name: string
  electronCount: number
  colorMode: ColorMode
  solidColor: string
  individualColors: string[]
  gradientStart: string
  gradientEnd: string
  bgColor: string
  spread: number
  speed: number
  loop: boolean
  showNuclei: boolean
  showAxis: boolean
  theme: ThemeName
  camPos: [number, number, number]
  camTgt: [number, number, number]
  headScale: number
  haloScale: number
  trailWidth: number
}

// Helper to keep the preset list compact: every existing preset is
// 'individual' mode with its specific palette. solid + gradient defaults
// fall through to a representative pick from the palette.
function preset(
  base: Omit<Preset, 'colorMode' | 'solidColor' | 'gradientStart' | 'gradientEnd'> & {
    individualColors: string[]
  },
): Preset {
  const cols = base.individualColors
  return {
    ...base,
    colorMode: 'individual',
    solidColor: cols[0] ?? DEFAULT_E_COLOR,
    gradientStart: cols[0] ?? DEFAULT_E_COLOR,
    gradientEnd: cols[cols.length - 1] ?? DEFAULT_E_COLOR,
  }
}

const PRESETS: Preset[] = [
  preset({
    name: '1',
    electronCount: 4,
    individualColors: ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
    bgColor: '#59004c',
    spread: 8.6,
    speed: 4.5,
    loop: true,
    showNuclei: true,
    showAxis: false,
    theme: 'dark',
    camPos: [-18.69, 12.91, -4.52],
    camTgt: [0.83, -2.96, 1.15],
    headScale: 0.08,
    haloScale: 1.1,
    trailWidth: 0.09,
  }),
  preset({
    name: '2',
    electronCount: 4,
    individualColors: ['#ffc7c7', '#ffb8e7', '#ffe4ca', '#d7fff8'],
    bgColor: '#551029',
    spread: 15.1,
    speed: 4.5,
    loop: true,
    showNuclei: true,
    showAxis: false,
    theme: 'dark',
    // Camera on chord-axis line (y=0, z=0) so both nuclei project to
    // the same pixel. Target pulled down (y=-6) tilts view ~7°.
    camPos: [50, 0, 0],
    camTgt: [0, -6, 0],
    headScale: 0.16,
    haloScale: 1.7,
    trailWidth: 0.16,
  }),
  preset({
    name: '3',
    electronCount: 4,
    individualColors: ['#b4fff3', '#d6ffde', '#c2ffcf', '#d2f8ff'],
    bgColor: '#055a00',
    spread: 4.3,
    speed: 4,
    loop: true,
    showNuclei: false,
    showAxis: false,
    theme: 'dark',
    camPos: [-6.66, 25.45, -3.26],
    camTgt: [-2.43, -1.46, -1.59],
    headScale: 0.16,
    haloScale: 1.7,
    trailWidth: 0.16,
  }),
  preset({
    name: '4',
    electronCount: 4,
    individualColors: ['#bddbd8', '#7ddbd8', '#ffd689', '#ffccf0'],
    bgColor: '#b93600',
    spread: 15.1,
    speed: 4.5,
    loop: true,
    showNuclei: true,
    showAxis: true,
    theme: 'dark',
    camPos: [7.66, 0.64, 2.59],
    camTgt: [-0.88, -1.26, 1.9],
    headScale: 0.16,
    haloScale: 1.7,
    trailWidth: 0.16,
  }),
  preset({
    name: '5',
    electronCount: 4,
    individualColors: ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
    bgColor: '#240c00',
    spread: 14.7,
    speed: 4.5,
    loop: true,
    showNuclei: true,
    showAxis: false,
    theme: 'dark',
    camPos: [34.54, 15.68, 6.14],
    camTgt: [3.39, -5, 0.78],
    headScale: 0.16,
    haloScale: 1.7,
    trailWidth: 0.16,
  }),
  preset({
    name: '6',
    electronCount: 4,
    individualColors: ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
    bgColor: '#59004c',
    spread: 14.7,
    speed: 4.5,
    loop: true,
    showNuclei: false,
    showAxis: false,
    theme: 'dark',
    camPos: [33.4, 7.12, 5.41],
    camTgt: [3.46, -5.19, 0.41],
    headScale: 0.08,
    haloScale: 1.1,
    trailWidth: 0.07,
  }),
]

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

export function LabsAtomMotion() {
  const [pointA, setPointA] = useState<Vec3>(INITIAL_POINT_A)
  const [pointB, setPointB] = useState<Vec3>(INITIAL_POINT_B)
  // Design count (slider, preset-applied). Specs recompute on change.
  const [targetN, setTargetN] = useState(4)
  // Visible count animates 0 → targetN during intro.
  const [visibleCount, setVisibleCount] = useState(0)
  // Bump to re-trigger the intro stagger (replay button).
  const [introNonce, setIntroNonce] = useState(0)
  const [introActive, setIntroActive] = useState(true)
  const [autoReplay, setAutoReplay] = useState(true)
  const [speedMult, setSpeedMult] = useState(4.5)
  const [startSeeds, setStartSeeds] = useState<number[]>(() =>
    new Array(MAX_ELECTRONS).fill(0),
  )
  const [travelCounts, setTravelCounts] = useState<number[]>(() =>
    new Array(MAX_ELECTRONS).fill(0),
  )
  const [nextTravelIndex, setNextTravelIndex] = useState(0)
  const [showNuclei, setShowNuclei] = useState(true)
  const [showAxis, setShowAxis] = useState(false)
  const [uiHidden, setUiHidden] = useState(true)
  // Color mode + per-mode state. electronColors is derived below.
  const [colorMode, setColorMode] = useState<ColorMode>('individual')
  const [solidColor, setSolidColor] = useState('#ffa57d')
  const [individualColors, setIndividualColors] = useState<string[]>(() =>
    ['#ffa57d', '#ffc5ab', '#ffa57d', '#93e3fd'],
  )
  const [gradientStart, setGradientStart] = useState('#ffa57d')
  const [gradientEnd, setGradientEnd] = useState('#93e3fd')
  const [paletteOpen, setPaletteOpen] = useState(false)
  // True while the user is actively interacting with the canvas (rotate /
  // pinch / pan). Forces guides ON regardless of manual toggles.
  const [interacting, setInteracting] = useState(false)
  const interactingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [bgColor, setBgColor] = useState('#59004c')
  const [headScale, setHeadScale] = useState(0.08)
  const [haloScale, setHaloScale] = useState(1.1)
  const [trailWidth, setTrailWidth] = useState(0.09)
  const [theme, setTheme] = useTheme()
  const palette = THEME_PALETTE[theme]

  const electronSpecs = useMemo(() => buildElectronSpecs(targetN), [targetN])
  const electronColors = useMemo(
    () => deriveElectronColors(targetN, colorMode, solidColor, individualColors, gradientStart, gradientEnd),
    [targetN, colorMode, solidColor, individualColors, gradientStart, gradientEnd],
  )

  const setIndividualColorAt = useCallback((idx: number, color: string) => {
    setIndividualColors((prev) => {
      const next = prev.slice()
      // Pad if needed so high-N edits don't clobber lower indices.
      while (next.length <= idx) next.push(DEFAULT_E_COLOR)
      next[idx] = color
      return next
    })
  }, [])

  // Contextual hint above the action strip — guides the user through the
  // happy path. Empty string = no hint shown (animation in flow).
  const totalTravels = useMemo(
    () => travelCounts.reduce((a, b) => a + b, 0),
    [travelCounts],
  )
  const hintText = useMemo(() => {
    if (visibleCount === 0) return 'Tap ↺ to replay'
    if (autoReplay) return 'Looping'
    if (totalTravels === 0) return 'Tap ⇋ travel to send it across'
    return ''
  }, [visibleCount, autoReplay, totalTravels])

  const reducedMotion = usePrefersReducedMotion()
  // Sharper fade (power 5) concentrates the visible trail near the head
  // and pushes the alpha-zero zone over a longer stretch. Hides the
  // head-vs-tail wrap seam that shows up as a "black notch" at higher
  // effective speeds, where the trail wraps around the orbit once.
  const fadeTex = useMemo(() => makeFadeTexture(5), [])
  const orbTex = useMemo(() => makeSoftOrbTexture(), [])
  // Master clock advancing on the same render tick as the electrons. Each
  // newly-added electron reads this value to compute its entry angle.
  const globalScaledTimeRef = useRef(0)
  // Live camera position (updated each frame by CameraDebugger). Visible
  // in the build-label HUD so the user can screenshot the exact values
  // and turn a rotated view into a new default.
  const [camPos, setCamPos] = useState<[number, number, number]>(DEFAULT_CAMERA_POS)
  const [camTgt, setCamTgt] = useState<[number, number, number]>(DEFAULT_CAMERA_TARGET)

  const chordHalf = useMemo(() => chordHalfFrom(pointA, pointB), [pointA, pointB])
  // Orbit size is fixed — atoms keep the same on-screen size regardless of
  // how far apart they're placed. The transit math (sCurvePos) generalises
  // to any chord/orbit ratio so the S-shape recalculates from the placed
  // positions.
  const orbitSize = useMemo(() => 3 * (Math.SQRT2 - 1), [])
  const groupTiltZ = useMemo(() => tiltZFrom(pointA, pointB), [pointA, pointB])

  const onReplay = useCallback(() => {
    setIntroNonce((n) => n + 1)
  }, [])
  const onAddOne = useCallback(() => {
    setTargetN((n) => {
      const next = nextCountStep(n)
      if (next === null) return n
      // Only bump startSeeds for the NEW indices [n, next). Existing
      // electrons keep their current phase; their orbital planes shift
      // slightly to the new symmetric layout but they don't reseed.
      // The new electrons enter at master-clock-synced angles.
      setStartSeeds((prev) => {
        const seeds = prev.slice()
        for (let i = n; i < next; i++) seeds[i] = (seeds[i] ?? 0) + 1
        return seeds
      })
      setVisibleCount(next)
      return next
    })
  }, [])
  const onRemoveOne = useCallback(() => {
    setTargetN((n) => {
      const next = prevCountStep(n)
      if (next === null) return n
      // No startSeed bumps — surviving electrons in [0, next) keep
      // their current phase. Removed electrons (i >= next) fade out
      // via existence='idle'. Planes redistribute symmetrically.
      setVisibleCount(next)
      setNextTravelIndex((idx) => Math.min(idx, next - 1))
      return next
    })
  }, [])
  const onEnd = useCallback(() => {
    setVisibleCount(0)
    setTravelCounts(new Array(MAX_ELECTRONS).fill(0))
    setNextTravelIndex(0)
    globalScaledTimeRef.current = 0
    setIntroActive(false)
  }, [])
  const onTravel = useCallback(() => {
    if (visibleCount === 0) return
    setTravelCounts((counts) => {
      const next = counts.slice()
      next[nextTravelIndex] = (next[nextTravelIndex] ?? 0) + 1
      return next
    })
    setNextTravelIndex((i) => (i + 1) % visibleCount)
  }, [nextTravelIndex, visibleCount])

  // Intro choreography: stagger N=targetN electrons over ~14s total.
  // Re-runs ONLY on introNonce bump (replay button) or initial mount.
  // targetN read via ref so +/- and slider changes don't restart the
  // animation — those just shift visibleCount/specs in place.
  const targetNRef = useRef(targetN)
  targetNRef.current = targetN
  useEffect(() => {
    let cancelled = false
    const N = Math.max(1, Math.min(MAX_ELECTRONS, targetNRef.current))
    const total = 14000
    const interval = total / N
    setVisibleCount(0)
    setIntroActive(true)
    setNextTravelIndex(0)
    // Bump startSeeds for all N slots so probes reseed at intro start.
    setStartSeeds((prev) => {
      const next = prev.slice()
      for (let i = 0; i < N; i++) next[i] = (next[i] ?? 0) + 1
      return next
    })
    const timeouts: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i <= N; i++) {
      timeouts.push(
        setTimeout(() => { if (!cancelled) setVisibleCount(i) }, interval * (i - 1)),
      )
    }
    timeouts.push(
      setTimeout(() => { if (!cancelled) setIntroActive(false) }, interval * N),
    )
    return () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }
  }, [introNonce])

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

  // Manual "recenter" — resets OrbitControls back to the initial camera
  // position and target, undoing whatever rotation/zoom the user has
  // applied via touch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitControlsRef = useRef<any>(null)
  const onRecenter = useCallback(() => {
    orbitControlsRef.current?.reset?.()
  }, [])

  const applyPreset = useCallback((p: Preset) => {
    setColorMode(p.colorMode)
    setSolidColor(p.solidColor)
    setIndividualColors(p.individualColors.slice())
    setGradientStart(p.gradientStart)
    setGradientEnd(p.gradientEnd)
    setBgColor(p.bgColor)
    setPointA([-p.spread, 0, 0])
    setPointB([p.spread, 0, 0])
    setSpeedMult(p.speed)
    setAutoReplay(p.loop)
    setShowNuclei(p.showNuclei)
    setShowAxis(p.showAxis)
    setTheme(p.theme)
    setHeadScale(p.headScale)
    setHaloScale(p.haloScale)
    setTrailWidth(p.trailWidth)
    setTargetN(p.electronCount)
    const ctrl = orbitControlsRef.current
    if (ctrl?.object?.position && ctrl?.target) {
      ctrl.object.position.set(p.camPos[0], p.camPos[1], p.camPos[2])
      ctrl.target.set(p.camTgt[0], p.camTgt[1], p.camTgt[2])
      ctrl.update?.()
    }
  }, [setTheme])

  return (
    <div
      className={`${s.root} ${theme === 'light' ? s.themeLight : s.themeDark}`}
      style={{ ['--lab-bg-base' as string]: bgColor }}
    >
      <div className={s.canvasArea}>
        <Canvas
          camera={{ position: DEFAULT_CAMERA_POS, fov: FOV_DEG }}
          frameloop="always"
          aria-hidden="true"
        >
          <OrbitControls
            ref={orbitControlsRef}
            makeDefault
            enableRotate
            enablePan
            enableZoom
            enableDamping
            dampingFactor={0.12}
            rotateSpeed={0.9}
            panSpeed={0.9}
            screenSpacePanning
            minDistance={4}
            maxDistance={80}
            target={DEFAULT_CAMERA_TARGET}
            onStart={() => {
              if (interactingTimeoutRef.current) clearTimeout(interactingTimeoutRef.current)
              setInteracting(true)
            }}
            onEnd={() => {
              if (interactingTimeoutRef.current) clearTimeout(interactingTimeoutRef.current)
              interactingTimeoutRef.current = setTimeout(() => setInteracting(false), 300)
            }}
          />
          <MasterClock
            timeRef={globalScaledTimeRef}
            speedMult={speedMult}
            reducedMotion={reducedMotion}
          />
          <CameraDebugger
            controlsRef={orbitControlsRef}
            onUpdate={(pos, tgt) => {
              setCamPos(pos)
              setCamTgt(tgt)
            }}
          />
          <group rotation={[0, 0, groupTiltZ]}>
            {(showAxis || interacting) && (
              <AxisIndicators
                chordHalf={chordHalf}
                color={lightenHex(bgColor, 0.45)}
                opacity={palette.axisOpacity}
              />
            )}
            {(showNuclei || interacting) && <Nuclei chordHalf={chordHalf} color={palette.ink} />}
            {electronSpecs.map((spec, i) => {
              const c = electronColors[i] ?? DEFAULT_E_COLOR
              return (
                <ElectronProbe
                  key={`e${i}`}
                  spec={spec}
                  fadeTex={fadeTex}
                  orbTex={orbTex}
                  headScale={headScale}
                  haloScale={haloScale}
                  trailWidth={trailWidth}
                  reducedMotion={reducedMotion}
                  speedMult={speedMult}
                  chordHalf={chordHalf}
                  orbitSize={orbitSize}
                  existence={i < visibleCount ? 'visible' : 'idle'}
                  autoReplay={autoReplay && !introActive}
                  travelCount={travelCounts[i] ?? 0}
                  startSeed={startSeeds[i] ?? 0}
                  trailColor={c}
                  color={c}
                  haloColor={c}
                  globalScaledTimeRef={globalScaledTimeRef}
                />
              )
            })}
          </group>
          <EffectComposer>
            <Bloom
              intensity={0.7}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.6}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Top-left: hide-all-UI toggle. Always visible. */}
      <button
        type="button"
        className={`${s.btn} ${s.btnIcon} ${s.uiToggleBtn}`}
        onClick={() => setUiHidden((v) => !v)}
        aria-label={uiHidden ? 'Show controls' : 'Hide controls'}
        title={uiHidden ? 'Show' : 'Hide'}
      >
        {uiHidden ? '◇' : '◆'}
      </button>

      {/* Top-right: global appearance controls — always visible. */}
      <div className={s.appearanceCluster} aria-label="Appearance">
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Light' : 'Dark'}
        >
          {theme === 'light' ? '☼' : '☾'}
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon} ${showNuclei ? s.btnActive : ''}`}
          onClick={() => setShowNuclei((v) => !v)}
          aria-label="Toggle nuclei"
          title={showNuclei ? 'Nuclei on' : 'Nuclei off'}
        >
          {showNuclei ? '●' : '○'}
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon} ${showAxis ? s.btnActive : ''}`}
          onClick={() => setShowAxis((v) => !v)}
          aria-label="Toggle axis"
          title={showAxis ? 'Axis on' : 'Axis off'}
        >
          {showAxis ? '✦' : '✧'}
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={() => setPaletteOpen((v) => !v)}
          aria-label="Open palette"
          title="Palette"
        >
          ◐
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={onRemoveOne}
          aria-label="Step down to previous symmetry"
          title={`Step down (${targetN} → ${prevCountStep(targetN) ?? '—'})`}
          disabled={prevCountStep(targetN) === null}
        >
          −
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={onAddOne}
          aria-label="Step up to next symmetry"
          title={`Step up (${targetN} → ${nextCountStep(targetN) ?? '—'})`}
          disabled={nextCountStep(targetN) === null}
        >
          +
        </button>
        <button
          type="button"
          className={`${s.btn} ${s.btnIcon}`}
          onClick={onTravel}
          aria-label={`Travel electron ${nextTravelIndex + 1}`}
          title={`Travel e${nextTravelIndex + 1}`}
          disabled={visibleCount === 0}
        >
          ⇋
        </button>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.currentTarget.value)}
          className={s.colorPicker}
          aria-label="Background color"
          title="Background color"
        />
      </div>

      {!uiHidden && (
      <>
      {paletteOpen && (
        <>
          <div className={s.paletteBackdrop} onClick={() => setPaletteOpen(false)} />
          <div className={s.palettePopover} onClick={(e) => e.stopPropagation()}>
            <div className={s.modeTabs}>
              <button
                type="button"
                className={`${s.modeTab} ${colorMode === 'solid' ? s.modeTabActive : ''}`}
                onClick={() => setColorMode('solid')}
              >
                Solid
              </button>
              <button
                type="button"
                className={`${s.modeTab} ${colorMode === 'individual' ? s.modeTabActive : ''}`}
                onClick={() => setColorMode('individual')}
              >
                Individual
              </button>
              <button
                type="button"
                className={`${s.modeTab} ${colorMode === 'gradient' ? s.modeTabActive : ''}`}
                onClick={() => setColorMode('gradient')}
              >
                Gradient
              </button>
            </div>
            <div className={s.paletteBody}>
              {colorMode === 'solid' && (
                <input
                  type="color"
                  value={solidColor}
                  onChange={(e) => setSolidColor(e.currentTarget.value)}
                  className={s.colorPicker}
                  aria-label="Solid color"
                />
              )}
              {colorMode === 'individual' && (
                <div className={s.individualGrid}>
                  {Array.from({ length: targetN }, (_, i) => (
                    <input
                      key={`pal-e${i}`}
                      type="color"
                      value={individualColors[i % individualColors.length] ?? DEFAULT_E_COLOR}
                      onChange={(e) => setIndividualColorAt(i, e.currentTarget.value)}
                      className={s.colorPicker}
                      aria-label={`Electron ${i + 1} color`}
                      title={`Electron ${i + 1}`}
                    />
                  ))}
                </div>
              )}
              {colorMode === 'gradient' && (
                <div className={s.gradientRow}>
                  <input
                    type="color"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.currentTarget.value)}
                    className={s.colorPicker}
                    aria-label="Gradient start"
                    title="Start"
                  />
                  <span className={s.gradientArrow}>→</span>
                  <input
                    type="color"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.currentTarget.value)}
                    className={s.colorPicker}
                    aria-label="Gradient end"
                    title="End"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Single transparent control panel — drag canvas to rotate, pinch to zoom. */}
      <div className={s.unifiedPanel} aria-label="Atom motion controls">
        <div className={s.tiltSliderRow}>
          <span className={s.tiltSliderLabel}>presets</span>
          <div className={s.presetButtons}>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className={`${s.btn} ${s.btnPreset}`}
                onClick={() => applyPreset(p)}
                aria-label={`Apply preset ${p.name}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className={s.unifiedRow}>
          <button
            type="button"
            className={s.btn}
            onClick={onReplay}
            aria-label={`Replay intro with ${targetN} electrons`}
            title="Replay intro"
          >
            {`↺ ${targetN} e⁻`}
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={onTravel}
            aria-label={`Travel electron ${nextTravelIndex + 1}`}
            disabled={visibleCount === 0}
          >
            {`⇋ e${nextTravelIndex + 1}`}
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={onEnd}
            aria-label="End"
            disabled={visibleCount === 0}
          >
            ■
          </button>
          <button
            type="button"
            className={`${s.btn} ${autoReplay ? s.btnActive : ''}`}
            onClick={() => setAutoReplay((v) => !v)}
            aria-label={autoReplay ? 'Disable auto-loop' : 'Enable auto-loop'}
          >
            {autoReplay ? '↻' : '○'}
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnIcon}`}
            onClick={onRecenter}
            aria-label="Recenter view"
            title="Reset camera"
          >
            ◎
          </button>
        </div>
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
        <div className={s.tiltSliderRow}>
          <span className={s.tiltSliderLabel}>{`count  ${targetN}`}</span>
          <input
            type="range"
            min={1}
            max={MAX_ELECTRONS}
            step={1}
            value={targetN}
            onChange={(e) => {
              const N = parseInt(e.currentTarget.value, 10)
              setTargetN((prev) => {
                // Bump only NEW slots' startSeeds so existing electrons
                // keep their phase as planes redistribute.
                if (N > prev) {
                  setStartSeeds((seeds) => {
                    const next = seeds.slice()
                    for (let i = prev; i < N; i++) next[i] = (next[i] ?? 0) + 1
                    return next
                  })
                }
                return N
              })
              setVisibleCount(N)
              setNextTravelIndex((idx) => Math.min(idx, Math.max(0, N - 1)))
            }}
            className={s.tiltSlider}
            aria-label="Electron count"
          />
        </div>
        <div className={s.tiltSliderRow}>
          <span className={s.tiltSliderLabel}>{`head  ${headScale.toFixed(2)}`}</span>
          <input
            type="range"
            min={0.04}
            max={0.30}
            step={0.01}
            value={headScale}
            onChange={(e) => setHeadScale(parseFloat(e.currentTarget.value))}
            className={s.tiltSlider}
            aria-label="Electron head size"
          />
        </div>
        <div className={s.tiltSliderRow}>
          <span className={s.tiltSliderLabel}>{`halo  ${haloScale.toFixed(1)}`}</span>
          <input
            type="range"
            min={0.8}
            max={3.0}
            step={0.1}
            value={haloScale}
            onChange={(e) => setHaloScale(parseFloat(e.currentTarget.value))}
            className={s.tiltSlider}
            aria-label="Halo scale"
          />
        </div>
        <div className={s.tiltSliderRow}>
          <span className={s.tiltSliderLabel}>{`trail  ${trailWidth.toFixed(2)}`}</span>
          <input
            type="range"
            min={0.04}
            max={0.30}
            step={0.01}
            value={trailWidth}
            onChange={(e) => setTrailWidth(parseFloat(e.currentTarget.value))}
            className={s.tiltSlider}
            aria-label="Trail width"
          />
        </div>
        {hintText && <div className={s.hintInline}>{hintText}</div>}
        <span className={s.buildLabel}>
          {`cam (${camPos[0]}, ${camPos[1]}, ${camPos[2]})`}
        </span>
        <span className={s.buildLabel}>
          {`tgt (${camTgt[0]}, ${camTgt[1]}, ${camTgt[2]})`}
        </span>
        <span className={s.buildLabel}>
          {`e ${electronColors.join(' ')}`}
        </span>
        <span className={s.buildLabel}>
          {`build·${COMMIT} · bg ${bgColor}`}
        </span>
      </div>
      </>
      )}
    </div>
  )
}
