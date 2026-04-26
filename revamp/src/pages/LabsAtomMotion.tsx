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
  lemniscatePos,
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

const ORBIT_ASPECT = 0.62
const ORBIT_OMEGA_BASE = 2.4
const ORBIT_PERIOD = (2 * Math.PI) / ORBIT_OMEGA_BASE
const FADE_DUR = 0.55
const LEMNISCATE_PERIOD = 6.0
const TRANSIT_DUR = LEMNISCATE_PERIOD / 2
const SPEED_STEPS = [0.5, 1, 2, 3, 4, 5, 6]
const TILT_STEPS_DEG = [0, 30, 45, 60]
const COUNT_STEPS = [1, 2, 3] as const
const CAMERA_Z = 22.0
const FOV_DEG = 50

const INITIAL_POINT_A: Vec3 = [-2.72, 4.0, 0]
const INITIAL_POINT_B: Vec3 = [5.33, 0.8, 0]

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

// --- Per-count electron layouts -------------------------------------------
// Three pinwheeled planes around the chord X-axis at 120 deg, with
// initial phases spaced 2pi/N so the electrons don't pile up at far-A
// at start. cwAtA stays true (CW around A) — same convention as the
// single-electron version.

function planesFor(count: 1 | 2 | 3): ElectronSpec[] {
  const specs: ElectronSpec[] = []
  for (let k = 0; k < count; k++) {
    const upAngle = (2 * Math.PI * k) / count
    const upHat: Vec3 = [0, Math.cos(upAngle), Math.sin(upAngle)]
    const initialPhase = Math.PI + (2 * Math.PI * k) / count
    specs.push({ upHat, cwAtA: true, initialPhase })
  }
  return specs
}

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
  // Same rotation sense as orbit A. Lemniscate transit naturally flips
  // visual rotation relative to the other focus by topology — CW around
  // A reads as CCW around B without any sign flip in omega.
  return {
    center: [chordHalf, 0, 0],
    plane: 'xy',
    upHat: spec.upHat,
    chordAxis: [1, 0, 0],
    size: orbitSize,
    aspect: ORBIT_ASPECT,
    omega: spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE,
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

    const dt = Math.min(delta, 1 / 30) * speedMult
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
        const newTravel = travelCount > lastTravelCountRef.current
        if (newTravel || autoReplay) {
          phase = phase === 'orbitA' ? 'travelAB' : 'travelBA'
          phaseRef.current = phase
          phaseElapsedRef.current = 0
          localT = 0
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
      const lemnisc = buildLemniscate(
        [-chordHalf, 0, 0],
        [chordHalf, 0, 0],
        spec.upHat,
      )
      const t = Math.min(localT, TRANSIT_DUR)
      const tauStart = phase === 'travelAB' ? Math.PI : 0
      const tau = tauStart + (Math.PI * t) / TRANSIT_DUR
      pos = lemniscatePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, lemnisc.a, tau)
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

function Nuclei({ chordHalf }: { chordHalf: number }) {
  return (
    <>
      <mesh position={[-chordHalf, 0, 0]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <mesh position={[chordHalf, 0, 0]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.85} />
      </mesh>
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
  const [existence, setExistence] = useState<Existence>('idle')
  const [electronCount, setElectronCount] = useState<1 | 2 | 3>(3)
  const [tiltDeg, setTiltDeg] = useState(45)
  const [autoReplay, setAutoReplay] = useState(false)
  const [zoom, setZoom] = useState(CAMERA_Z)
  const [speedMult, setSpeedMult] = useState(3)
  const [startSeed, setStartSeed] = useState(0)
  const [travelCounts, setTravelCounts] = useState<number[]>([0, 0, 0])
  const [nextTravelIndex, setNextTravelIndex] = useState(0)

  const viewport = useViewport()
  const reducedMotion = usePrefersReducedMotion()
  const fadeTex = useMemo(() => makeFadeTexture(), [])

  const chordHalf = useMemo(() => chordHalfFrom(pointA, pointB), [pointA, pointB])
  const orbitSize = useMemo(() => chordHalf * (Math.SQRT2 - 1), [chordHalf])
  const groupOffset = useMemo(() => midpointFrom(pointA, pointB), [pointA, pointB])
  const groupTiltZ = useMemo(() => tiltZFrom(pointA, pointB), [pointA, pointB])
  const tiltRad = useMemo(() => (tiltDeg * Math.PI) / 180, [tiltDeg])

  const electrons = useMemo(() => planesFor(electronCount), [electronCount])

  const isLocked = existence !== 'idle'

  const onStart = useCallback(() => {
    setExistence('visible')
    setStartSeed((s) => s + 1)
    setTravelCounts([0, 0, 0])
    setNextTravelIndex(0)
  }, [])
  const onEnd = useCallback(() => {
    setExistence('idle')
  }, [])
  const onTravel = useCallback(() => {
    setTravelCounts((counts) => {
      const next = counts.slice()
      next[nextTravelIndex] = (next[nextTravelIndex] ?? 0) + 1
      return next
    })
    setNextTravelIndex((i) => (i + 1) % electronCount)
  }, [nextTravelIndex, electronCount])

  return (
    <div className={s.root}>
      <div className={s.canvasArea}>
        <Canvas
          camera={{ position: [0, 0, zoom], fov: FOV_DEG }}
          frameloop="always"
          aria-hidden="true"
        >
          <CameraController zoom={zoom} />
          <group position={groupOffset} rotation={[0, 0, groupTiltZ]}>
            <group rotation={[tiltRad, tiltRad, 0]}>
              <Nuclei chordHalf={chordHalf} />
              {electrons.map((spec, i) => (
                <ElectronProbe
                  key={`e${i}-${electronCount}`}
                  spec={spec}
                  fadeTex={fadeTex}
                  reducedMotion={reducedMotion}
                  speedMult={speedMult}
                  chordHalf={chordHalf}
                  orbitSize={orbitSize}
                  existence={existence}
                  autoReplay={autoReplay}
                  travelCount={travelCounts[i] ?? 0}
                  startSeed={startSeed}
                  trailColor="#ffffff"
                  color="#ffffff"
                  haloColor="#ffffff"
                />
              ))}
            </group>
          </group>
        </Canvas>
      </div>

      <LabsNav />

      <DragHandle
        pos={pointA}
        onDrag={setPointA}
        zoom={zoom}
        viewport={viewport}
        enabled={!isLocked}
        label="A"
      />
      <DragHandle
        pos={pointB}
        onDrag={setPointB}
        zoom={zoom}
        viewport={viewport}
        enabled={!isLocked}
        label="B"
      />

      <div className={s.controlsPanel} aria-label="Atom motion controls">
        <div className={s.controlsRow}>
          <button
            type="button"
            className={s.btn}
            onClick={onStart}
            aria-label="Start"
            title="Start"
            disabled={existence === 'visible'}
          >
            ▶ start
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={onTravel}
            aria-label={`Travel electron ${nextTravelIndex + 1}`}
            title={`Travel — next: e${nextTravelIndex + 1}`}
            disabled={existence !== 'visible'}
          >
            {`⇋ travel e${nextTravelIndex + 1}`}
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={onEnd}
            aria-label="End"
            title="End"
            disabled={existence !== 'visible'}
          >
            ■ end
          </button>
        </div>

        <div className={s.controlsRow}>
          <button
            type="button"
            className={s.btn}
            onClick={() =>
              setElectronCount((c) => {
                const idx = COUNT_STEPS.indexOf(c)
                return COUNT_STEPS[(idx + 1) % COUNT_STEPS.length]
              })
            }
            aria-label={`${electronCount} electron — tap to change`}
            title={`${electronCount} electron${electronCount > 1 ? 's' : ''}`}
            disabled={isLocked}
          >
            {`${electronCount} e⁻`}
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={() =>
              setTiltDeg((d) => {
                const idx = TILT_STEPS_DEG.indexOf(d)
                return TILT_STEPS_DEG[(idx + 1) % TILT_STEPS_DEG.length]
              })
            }
            aria-label={`Tilt ${tiltDeg}° — tap to change`}
            title={`Tilt ${tiltDeg}°`}
            disabled={isLocked}
          >
            {`tilt ${tiltDeg}°`}
          </button>
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
          <button
            type="button"
            className={s.btn}
            onClick={() =>
              setSpeedMult((v) => {
                const idx = SPEED_STEPS.indexOf(v)
                return SPEED_STEPS[(idx + 1) % SPEED_STEPS.length]
              })
            }
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

        <span className={s.buildLabel}>{`build·${COMMIT} · z=${zoom.toFixed(1)}`}</span>
      </div>
    </div>
  )
}
