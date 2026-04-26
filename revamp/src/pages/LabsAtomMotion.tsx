/*
 * /labs/atom-motion — gravity-handoff stage (round-trip).
 *
 * Two nuclei. One electron in a continuous round-trip cycle:
 *   orbit A (lapsBefore × ORBIT_PERIOD)
 *   → A→B transit (top-sweep arc OR half-lemniscate τ=π→2π)
 *   → orbit B (lapsAfter × ORBIT_PERIOD)
 *   → B→A transit (bottom-sweep arc OR half-lemniscate τ=0→π)
 *   → loop
 * Position-and-tangent continuous at every boundary including the wrap.
 *
 * Floating glass controls cycle laps-before / laps-after through
 * [1,2,3,5,10] and speed through [0.5×, 1×, 2×, 4×]. Rotation toggle
 * picks ellipse-arc vs lemniscate transit; loop toggle resets the trail
 * at cycle boundaries. The motion runs forever modulo the cycle even
 * with auto-replay off.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'

function CameraController({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.z = zoom
    camera.updateProjectionMatrix()
  }, [zoom, camera])
  return null
}
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { ELECTRON } from '../ui/atom/constants'
import { makeFadeTexture } from '../ui/atom/Electron'
import type { Plane } from '../ui/atom/Electron'
import { usePrefersReducedMotion } from '../ui/atom/usePrefersReducedMotion'
import { LabsNav } from '../ui/atom/LabsNav'
import type { Vec3 } from '../ui/atom/runtime/types'
import {
  buildLemniscate,
  buildTravel,
  evalTravel,
  evalTravelVelocity,
  lemniscatePos,
  orbitPosAt,
  orbitVelocityAt,
  type OrbitDesc,
  type TravelDesc,
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

// --- Stage geometry ---------------------------------------------------------

const NUCLEUS_A: Vec3 = [-1.6, 0, 0]
const NUCLEUS_B: Vec3 = [1.6, 0, 0]
const CHORD_HALF = 1.6 // = (NUCLEUS_B.x − NUCLEUS_A.x) / 2
// Orbit semi-major sized so the far-side tip (θ=π on A's orbit, θ=0
// on B's orbit) sits EXACTLY on the lemniscate's lobe tip — that's the
// position-and-tangent-continuous handoff point between orbital motion
// and the half-lemniscate transit:
//   orbit-A far-tip = A.center − ORBIT_SIZE = −c − c(√2−1) = −c·√2
//   lemniscate left tip = −a = −c·√2  ✓
const ORBIT_SIZE = CHORD_HALF * (Math.SQRT2 - 1) // ≈ 0.663
const ORBIT_ASPECT = 0.62
const ORBIT_OMEGA_BASE = 2.4 // rad/s
const GROUP_ROTATION: [number, number, number] = [Math.PI / 4, Math.PI / 4, 0]
const CAMERA_Z = 22.0
const COMMIT: string = (import.meta.env.VITE_GIT_COMMIT as string | undefined) ?? 'dev-local'
// Lemniscate cycle period — full figure-8 traversal in seconds.
const LEMNISCATE_PERIOD = 6.0
// Half-lemniscate transit (left lobe tip → right lobe tip) takes half a
// full cycle. Used in opposite-rotation mode to bridge orbit A → orbit B.
const HALF_LEMNISCATE = LEMNISCATE_PERIOD / 2

// --- Sequence timing (seconds) ---------------------------------------------

const FADE_IN_DUR = 0.55
const ORBIT_PERIOD = (2 * Math.PI) / ORBIT_OMEGA_BASE
const TRAVEL_DUR = 1.55
// Lap-count cycle for the lap toggle buttons.
const LAP_STEPS = [1, 2, 3, 5, 10]

// --- Per-electron specs -----------------------------------------------------

type ElectronSpec = {
  plane: Plane
  cwAtA: boolean // true = CW around A; reverses on capture at B
  initialPhase: number
  fadeInStart: number
  color: string
  haloColor: string
  trailColor: string
}

// One electron for now — get the A↔B elliptical transit clean before
// layering more.
//
// User-locked geometric structure: each orbit's "furthest point from the
// other nucleus" is the handoff. On A's orbit (centered at -c on x-axis,
// B at +c), the far-side angle is θ = π — the orbit point at A.center +
// (-size, 0, 0). On B's orbit, the far-side angle is θ = 0. Both points
// are on the chord line, so they sit at the major-axis tips of the
// transit ellipse with foci at A and B. The transit arc then sweeps
// between those tips via the transit ellipse's own apex (top, φ=π/2) —
// THE furthest point of the transit path. Three furthest points line up
// on the symmetric pattern.
//
// Initial phase is fixed at π — after N full orbital periods (any N) the
// electron is back at θ=π, so no derivation is needed regardless of
// lapsBefore.
const INITIAL_PHASE = Math.PI

const ELECTRONS: ElectronSpec[] = [
  {
    plane: 'xy',
    cwAtA: true,
    initialPhase: INITIAL_PHASE,
    fadeInStart: 0,
    color: '#ffffff',
    haloColor: '#ffffff',
    trailColor: '#ffffff',
  },
]

// --- Electron probe ---------------------------------------------------------

type ProbeReport = {
  phase: 'pre' | 'fadeIn' | 'orbitA' | 'travel' | 'orbitB'
  position: Vec3
  vMag: number
}

function makeOrbitADesc(spec: ElectronSpec): OrbitDesc {
  return {
    center: NUCLEUS_A,
    plane: spec.plane,
    size: ORBIT_SIZE,
    aspect: ORBIT_ASPECT,
    omega: spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE,
    phase: spec.initialPhase,
  }
}

function makeOrbitBDesc(spec: ElectronSpec, opposite: boolean): OrbitDesc {
  // Same rotation (default): top-sweep arc, smooth at both ends, visual
  // "opposite spin" comes from chord-side handoff geometry.
  // Opposite rotation: bottom-sweep arc, actually CCW at B vs CW at A,
  // smooth capture but 180° kink at exit (the gravitational impulse).
  const sourceOmega = spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE
  return {
    center: NUCLEUS_B,
    plane: spec.plane,
    size: ORBIT_SIZE,
    aspect: ORBIT_ASPECT,
    omega: opposite ? -sourceOmega : sourceOmega,
    phase: 0,
  }
}

function ElectronProbe({
  spec,
  electronIndex,
  fadeTex,
  replayKey,
  reducedMotion,
  oppositeRotation,
  speedMult,
  orbitADur,
  orbitBDur,
  autoReplay,
  onReport,
}: {
  spec: ElectronSpec
  electronIndex: number
  fadeTex: THREE.DataTexture
  replayKey: number
  reducedMotion: boolean
  oppositeRotation: boolean
  speedMult: number
  orbitADur: number
  orbitBDur: number
  autoReplay: boolean
  onReport: (idx: number, report: ProbeReport) => void
}) {
  const transitDur = oppositeRotation ? HALF_LEMNISCATE : TRAVEL_DUR
  const headRef = useRef<THREE.Mesh>(null!)
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailGeomRef = useRef<any>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailMatRef = useRef<any>(null!)

  const elapsedRef = useRef(0)
  // Cached travel descs for the same-rotation mode — A→B (top sweep) and
  // B→A (bottom sweep). Built once per (replayKey, mode, orbit-config),
  // then reused every frame.
  const travelDescABRef = useRef<TravelDesc | null>(null)
  const travelDescBARef = useRef<TravelDesc | null>(null)
  const lastPosRef = useRef<Vec3>(NUCLEUS_A)
  const { size, invalidate } = useThree()
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  )

  // Trail ring buffer.
  const bufRef = useRef<Float32Array | null>(null)
  const insertIdxRef = useRef(0)
  if (!bufRef.current) {
    bufRef.current = new Float32Array(ELECTRON.trail.segments * 3)
  }

  // Reset on replay.
  useEffect(() => {
    elapsedRef.current = 0
    travelDescABRef.current = null
    travelDescBARef.current = null

    // Reduced-motion gate: render the static end-state — electron sitting in
    // its captured orbit around nucleus B at the entry angle. No animation.
    // HUD continues to render normally so screenshots still capture context.
    if (reducedMotion) {
      const orbitA = makeOrbitADesc(spec)
      const orbitB = makeOrbitBDesc(spec, oppositeRotation)
      const desc = buildTravel(orbitA, orbitB, TRAVEL_DUR, {
        exitAngle: spec.initialPhase,
        arcSide: oppositeRotation ? 'bottom' : 'top',
      })
      const restPos = orbitPosAt(orbitB, desc.entryAngle)
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
      onReport(electronIndex, { phase: 'orbitB', position: restPos, vMag: 0 })
      invalidate()
      return
    }

    // Seed trail behind the electron's orbit-A starting phase (both
    // modes now start the electron orbiting A, not on the lemniscate).
    const orbitA = makeOrbitADesc(spec)
    const start: Vec3 = orbitPosAt(orbitA, spec.initialPhase)
    if (bufRef.current) {
      for (let i = 0; i < ELECTRON.trail.segments; i++) {
        bufRef.current[i * 3] = start[0]
        bufRef.current[i * 3 + 1] = start[1]
        bufRef.current[i * 3 + 2] = start[2]
      }
    }
    insertIdxRef.current = 0
    lastPosRef.current = start
    if (headRef.current) headRef.current.position.set(start[0], start[1], start[2])
    if (haloRef.current) haloRef.current.position.set(start[0], start[1], start[2])
    if (headMatRef.current) headMatRef.current.opacity = 0
    if (haloMatRef.current) haloMatRef.current.opacity = 0
    if (trailMatRef.current) trailMatRef.current.opacity = 0
    invalidate()
  }, [replayKey, spec, invalidate, reducedMotion, electronIndex, onReport])

  useFrame((_, delta) => {
    if (reducedMotion) return
    const dt = Math.min(delta, 1 / 30) * speedMult
    elapsedRef.current += dt
    const t = elapsedRef.current

    let phase: ProbeReport['phase'] = 'pre'
    let pos: Vec3 = lastPosRef.current
    let vMag = 0

    const orbitA = makeOrbitADesc(spec)
    const orbitB = makeOrbitBDesc(spec, oppositeRotation)

    // Fade-in opacity (head/halo).
    let opacity = 0
    if (t >= spec.fadeInStart) {
      opacity = Math.min(1, (t - spec.fadeInStart) / FADE_IN_DUR)
    }

    // Pre-fade rest position — sits at orbit-A exit angle until fade-in
    // begins.
    if (t < spec.fadeInStart) {
      phase = 'pre'
      pos = orbitPosAt(orbitA, spec.initialPhase)
      lastPosRef.current = pos
      headRef.current.position.set(pos[0], pos[1], pos[2])
      if (haloRef.current) haloRef.current.position.set(pos[0], pos[1], pos[2])
      if (headMatRef.current) headMatRef.current.opacity = 0
      if (haloMatRef.current) haloMatRef.current.opacity = 0
      if (trailMatRef.current) trailMatRef.current.opacity = 0
      onReport(electronIndex, { phase, position: pos, vMag })
      return
    }

    // Continuous round-trip cycle:
    //   orbit A (lapsBefore laps) → A→B transit → orbit B (lapsAfter laps)
    //                              → B→A transit → loop
    // Position-and-tangent continuous at every boundary including the
    // wrap, so modulo-cycle is seamless — no trail reset, no fade-in
    // intermission. autoReplay=false clamps at the cycle end so the
    // electron freezes at far-A after one full round-trip.
    const cycleDur = orbitADur + transitDur + orbitBDur + transitDur
    const tAfterFade = t - spec.fadeInStart
    const cycleT = autoReplay
      ? ((tAfterFade % cycleDur) + cycleDur) % cycleDur
      : Math.min(tAfterFade, cycleDur)

    const endA  = orbitADur
    const endAB = endA + transitDur
    const endB  = endAB + orbitBDur

    if (cycleT < endA) {
      // Orbit A. θ = π at cycle start; orbital omega walks θ around
      // until θ = π + ω · orbitADur = π + ω · N · (2π/|ω|), which is
      // π modulo 2π — the electron lands at far-A (θ=π) again.
      phase = tAfterFade < FADE_IN_DUR ? 'fadeIn' : 'orbitA'
      const localT = cycleT
      const theta = spec.initialPhase + orbitA.omega * localT
      pos = orbitPosAt(orbitA, theta)
      const v = orbitVelocityAt(orbitA, theta)
      vMag = Math.hypot(v[0], v[1], v[2])
    } else if (cycleT < endAB) {
      // A → B transit.
      phase = 'travel'
      const localT = cycleT - endA
      if (oppositeRotation) {
        // Half-lemniscate τ ∈ [π, 2π] (left lobe tip → right lobe tip).
        const lemnisc = buildLemniscate(NUCLEUS_A, NUCLEUS_B, [0, 1, 0])
        const tau = Math.PI + (Math.PI * localT) / transitDur
        pos = lemniscatePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, lemnisc.a, tau)
        const eps = 1e-3
        const pPlus = lemniscatePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, lemnisc.a, tau + eps)
        const dTauDt = Math.PI / transitDur
        vMag = (Math.hypot(pPlus[0] - pos[0], pPlus[1] - pos[1], pPlus[2] - pos[2]) / eps) * dTauDt
      } else {
        // Same-rotation: top-sweep ellipse arc, exit at θ=π on orbit A,
        // entry at θ=0 on orbit B (both far-tips). Smooth at both ends.
        if (!travelDescABRef.current) {
          const sourceAtExit: OrbitDesc = { ...orbitA, phase: Math.PI }
          travelDescABRef.current = buildTravel(
            sourceAtExit,
            orbitB,
            transitDur,
            { exitAngle: Math.PI, arcSide: 'top' },
          )
        }
        pos = evalTravel(travelDescABRef.current, localT)
        const v = evalTravelVelocity(travelDescABRef.current, localT)
        vMag = Math.hypot(v[0], v[1], v[2])
      }
    } else if (cycleT < endB) {
      // Orbit B. θ = 0 at orbit-B start. After orbitBDur (= lapsAfter
      // periods) θ is back at 0 modulo 2π — lands at far-B again.
      phase = 'orbitB'
      const localT = cycleT - endAB
      const theta = 0 + orbitB.omega * localT
      pos = orbitPosAt(orbitB, theta)
      const v = orbitVelocityAt(orbitB, theta)
      vMag = Math.hypot(v[0], v[1], v[2])
    } else {
      // B → A transit.
      phase = 'travel'
      const localT = cycleT - endB
      if (oppositeRotation) {
        // Other half-lemniscate τ ∈ [0, π] (right lobe tip → left lobe
        // tip). At τ=0 lemniscate tangent matches CCW orbit-B at θ=0
        // (+y); at τ=π it matches CW orbit-A at θ=π (+y). Smooth wrap.
        const lemnisc = buildLemniscate(NUCLEUS_A, NUCLEUS_B, [0, 1, 0])
        const tau = (Math.PI * localT) / transitDur
        pos = lemniscatePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, lemnisc.a, tau)
        const eps = 1e-3
        const pPlus = lemniscatePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, lemnisc.a, tau + eps)
        const dTauDt = Math.PI / transitDur
        vMag = (Math.hypot(pPlus[0] - pos[0], pPlus[1] - pos[1], pPlus[2] - pos[2]) / eps) * dTauDt
      } else {
        // Same-rotation B→A: bottom-sweep arc with exit at θ=0 on
        // orbit B, ends at far-A on orbit A. CW + CW means tangents at
        // far-B (−y) and far-A (+y) match the bottom-sweep arc tangents
        // — smooth at both ends.
        if (!travelDescBARef.current) {
          const sourceAtExit: OrbitDesc = { ...orbitB, phase: 0 }
          travelDescBARef.current = buildTravel(
            sourceAtExit,
            orbitA,
            transitDur,
            { exitAngle: 0, arcSide: 'bottom' },
          )
        }
        pos = evalTravel(travelDescBARef.current, localT)
        const v = evalTravelVelocity(travelDescBARef.current, localT)
        vMag = Math.hypot(v[0], v[1], v[2])
      }
    }

    lastPosRef.current = pos

    // Head + halo position.
    headRef.current.position.set(pos[0], pos[1], pos[2])
    if (haloRef.current) haloRef.current.position.set(pos[0], pos[1], pos[2])

    // Update trail ring buffer.
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

    // Apply opacities.
    if (headMatRef.current) headMatRef.current.opacity = opacity
    if (haloMatRef.current) haloMatRef.current.opacity = opacity * 0.42
    if (trailMatRef.current) trailMatRef.current.opacity = opacity

    onReport(electronIndex, { phase, position: pos, vMag })
  })

  return (
    <>
      <mesh>
        <meshLineGeometry ref={trailGeomRef} />
        <meshLineMaterial
          ref={trailMatRef}
          color={spec.trailColor}
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
          color={spec.haloColor}
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
          color={spec.color}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
    </>
  )
}

// --- Stage --------------------------------------------------------------

function Nuclei() {
  return (
    <>
      <mesh position={NUCLEUS_A as unknown as [number, number, number]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <mesh position={NUCLEUS_B as unknown as [number, number, number]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </>
  )
}

// --- Page ---------------------------------------------------------------

export function LabsAtomMotion() {
  const [replayKey, setReplayKey] = useState(0)
  const [autoReplay, setAutoReplay] = useState(true)
  const [zoom, setZoom] = useState(CAMERA_Z)
  const [oppositeRotation, setOppositeRotation] = useState(true)
  const [speedMult, setSpeedMult] = useState(3)
  const SPEED_STEPS = [0.5, 1, 2, 3, 4, 5, 6]
  const [lapsBefore, setLapsBefore] = useState(1)
  const [lapsAfter, setLapsAfter] = useState(1)
  const orbitADur = lapsBefore * ORBIT_PERIOD
  const orbitBDur = lapsAfter * ORBIT_PERIOD
  const reducedMotion = usePrefersReducedMotion()
  const fadeTex = useMemo(() => makeFadeTexture(), [])

  const handleReplay = () => setReplayKey((k) => k + 1)
  const noopReport = () => {}

  return (
    <div className={s.root}>
      <div className={s.canvasArea}>
        <Canvas
          camera={{ position: [0, 0, zoom], fov: 50 }}
          frameloop="always"
          aria-hidden="true"
        >
          <CameraController zoom={zoom} />
          <group rotation={GROUP_ROTATION}>
            <Nuclei />
            {ELECTRONS.map((spec, i) => (
              <ElectronProbe
                key={`e${i}-${replayKey}-${oppositeRotation ? 'opp' : 'same'}-${speedMult}-${lapsBefore}-${lapsAfter}`}
                spec={spec}
                electronIndex={i}
                fadeTex={fadeTex}
                replayKey={replayKey}
                reducedMotion={reducedMotion}
                oppositeRotation={oppositeRotation}
                speedMult={speedMult}
                orbitADur={orbitADur}
                orbitBDur={orbitBDur}
                autoReplay={autoReplay}
                onReport={noopReport}
              />
            ))}
          </group>
        </Canvas>
      </div>

      <LabsNav />

      <div className={s.controlsPanel} aria-label="Atom motion controls">
        <div className={s.controlsRow}>
          <button
            type="button"
            className={s.btn}
            onClick={() => {
              setLapsBefore((v) => {
                const idx = LAP_STEPS.indexOf(v)
                return LAP_STEPS[(idx + 1) % LAP_STEPS.length]
              })
              setReplayKey((k) => k + 1)
            }}
            aria-label={`${lapsBefore} laps before transit — tap to change`}
            title={`${lapsBefore} laps before transit`}
          >
            {`${lapsBefore} laps in`}
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={() => {
              setLapsAfter((v) => {
                const idx = LAP_STEPS.indexOf(v)
                return LAP_STEPS[(idx + 1) % LAP_STEPS.length]
              })
              setReplayKey((k) => k + 1)
            }}
            aria-label={`${lapsAfter} laps after capture — tap to change`}
            title={`${lapsAfter} laps after capture`}
          >
            {`${lapsAfter} laps out`}
          </button>
        </div>

        <div className={s.controlsRow}>
          <button
            type="button"
            className={`${s.btn} ${oppositeRotation ? s.btnActive : ''}`}
            onClick={() => {
              setOppositeRotation((v) => !v)
              setReplayKey((k) => k + 1)
            }}
            aria-label={oppositeRotation ? 'Switch to same-rotation transit' : 'Switch to opposite-rotation transit'}
            title={oppositeRotation ? 'Opposite rotation (lemniscate)' : 'Same rotation (ellipse arc)'}
          >
            {oppositeRotation ? '⇄ opposite' : '→ same'}
          </button>
          <button
            type="button"
            className={`${s.btn} ${autoReplay ? s.btnActive : ''}`}
            onClick={() => setAutoReplay((v) => !v)}
            aria-label={autoReplay ? 'Disable auto-loop' : 'Enable auto-loop'}
            title={autoReplay ? 'Auto-loop on' : 'Auto-loop off'}
          >
            {autoReplay ? '↻ loop' : '↻ once'}
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={() => {
              setSpeedMult((v) => {
                const idx = SPEED_STEPS.indexOf(v)
                const next = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length]
                return next
              })
              setReplayKey((k) => k + 1)
            }}
            aria-label={`Speed ${speedMult}x — tap to change`}
            title={`Speed ${speedMult}x`}
          >
            {`${speedMult}× speed`}
          </button>
        </div>

        <div className={s.controlsRow}>
          <button
            type="button"
            className={`${s.btn} ${s.btnIcon}`}
            onClick={handleReplay}
            aria-label="Replay"
            title="Replay"
          >
            ↻
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnIcon}`}
            onClick={() => setZoom((z) => Math.max(3, +(z - 0.5).toFixed(2)))}
            aria-label="Zoom in"
            title="Zoom in (closer)"
          >
            −
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnIcon}`}
            onClick={() => setZoom((z) => Math.min(30, +(z + 0.5).toFixed(2)))}
            aria-label="Zoom out"
            title="Zoom out (farther)"
          >
            +
          </button>
        </div>

        <span className={s.buildLabel}>build·{COMMIT}</span>
      </div>
    </div>
  )
}
