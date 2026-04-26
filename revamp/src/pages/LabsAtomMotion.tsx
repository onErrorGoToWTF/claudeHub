/*
 * /labs/atom-motion — gravity-handoff stage with manual control.
 *
 * Two draggable nuclei (A, B). Phase state machine:
 *   orbitA → travelAB → orbitB → travelBA → orbitA
 *
 * Existence is independent of phase:
 *   idle    → electron not present
 *   visible → electron rendered (with fade in/out around state changes)
 *
 * Buttons:
 *   start   idle → visible, motionPhase = orbitA
 *   end     visible → idle (fade out)
 *   travel  orbitA ↔ orbitB (advance into the corresponding transit)
 *   loop    when on, orbits auto-advance into the next transit
 *           (transits always auto-advance into the next orbit)
 *
 * Geometry: chord lives along local +X. The whole scene is wrapped in an
 * outer group that translates by the chord midpoint and rotates around Z
 * by the chord angle, so the orbit / lemniscate math stays in a clean
 * local frame regardless of where A and B are placed on screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
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
  lemniscatePos,
  orbitPosAt,
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

// --- Constants -------------------------------------------------------------

const ORBIT_ASPECT = 0.62
const ORBIT_OMEGA_BASE = 2.4
const ORBIT_PERIOD = (2 * Math.PI) / ORBIT_OMEGA_BASE
const FADE_DUR = 0.55
const TRAVEL_DUR = 1.55
const LEMNISCATE_PERIOD = 6.0
const HALF_LEMNISCATE = LEMNISCATE_PERIOD / 2
const LAP_STEPS = [1, 2, 3, 5, 10]
const SPEED_STEPS = [0.5, 1, 2, 3, 4, 5, 6]
const CAMERA_Z = 22.0
const FOV_DEG = 50
const INITIAL_PHASE = Math.PI

const INITIAL_POINT_A: Vec3 = [-2.72, 4.0, 0]
const INITIAL_POINT_B: Vec3 = [5.33, 0.8, 0]

const COMMIT: string = (import.meta.env.VITE_GIT_COMMIT as string | undefined) ?? 'dev-local'

// --- Types -----------------------------------------------------------------

type Existence = 'idle' | 'visible'
type MotionPhase = 'orbitA' | 'travelAB' | 'orbitB' | 'travelBA'

type ElectronSpec = {
  plane: Plane
  cwAtA: boolean
  initialPhase: number
  color: string
  haloColor: string
  trailColor: string
}

const ELECTRONS: ElectronSpec[] = [
  {
    plane: 'xy',
    cwAtA: true,
    initialPhase: INITIAL_PHASE,
    color: '#ffffff',
    haloColor: '#ffffff',
    trailColor: '#ffffff',
  },
]

// --- Geometry derivations --------------------------------------------------

function chordHalfFrom(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2
}
function midpointFrom(a: Vec3, b: Vec3): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]
}
function tiltZFrom(a: Vec3, b: Vec3): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

function makeOrbitADesc(spec: ElectronSpec, chordHalf: number, orbitSize: number): OrbitDesc {
  return {
    center: [-chordHalf, 0, 0],
    plane: spec.plane,
    size: orbitSize,
    aspect: ORBIT_ASPECT,
    omega: spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE,
    phase: spec.initialPhase,
  }
}
function makeOrbitBDesc(
  spec: ElectronSpec,
  chordHalf: number,
  orbitSize: number,
  opposite: boolean,
): OrbitDesc {
  const sourceOmega = spec.cwAtA ? -ORBIT_OMEGA_BASE : ORBIT_OMEGA_BASE
  return {
    center: [chordHalf, 0, 0],
    plane: spec.plane,
    size: orbitSize,
    aspect: ORBIT_ASPECT,
    omega: opposite ? -sourceOmega : sourceOmega,
    phase: 0,
  }
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

// --- ElectronProbe ---------------------------------------------------------

function ElectronProbe({
  spec,
  fadeTex,
  reducedMotion,
  oppositeRotation,
  speedMult,
  chordHalf,
  orbitSize,
  motionPhase,
  existence,
  startSeed,
  pendingTravel,
  onFarTip,
}: {
  spec: ElectronSpec
  fadeTex: THREE.DataTexture
  reducedMotion: boolean
  oppositeRotation: boolean
  speedMult: number
  chordHalf: number
  orbitSize: number
  motionPhase: MotionPhase
  existence: Existence
  startSeed: number
  pendingTravel: boolean
  onFarTip: () => void
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

  const phaseElapsedRef = useRef(0)
  const prevLocalTRef = useRef(0)
  const opacityRef = useRef(0)
  const lastPhaseRef = useRef<MotionPhase>(motionPhase)
  // Track the latest pendingTravel + onFarTip via refs so useFrame doesn't
  // re-bind closures every parent render.
  const pendingTravelRef = useRef(pendingTravel)
  const onFarTipRef = useRef(onFarTip)
  useEffect(() => {
    pendingTravelRef.current = pendingTravel
  }, [pendingTravel])
  useEffect(() => {
    onFarTipRef.current = onFarTip
  }, [onFarTip])
  const travelDescABRef = useRef<TravelDesc | null>(null)
  const travelDescBARef = useRef<TravelDesc | null>(null)
  const lastPosRef = useRef<Vec3>([-chordHalf, 0, 0])
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

  // Reset elapsed-in-phase on phase change.
  useEffect(() => {
    if (lastPhaseRef.current !== motionPhase) {
      phaseElapsedRef.current = 0
      prevLocalTRef.current = 0
      lastPhaseRef.current = motionPhase
      travelDescABRef.current = null
      travelDescBARef.current = null
    }
  }, [motionPhase])

  // Drop cached travel descs whenever chord geometry shifts.
  useEffect(() => {
    travelDescABRef.current = null
    travelDescBARef.current = null
  }, [chordHalf, orbitSize, oppositeRotation])

  // On Start (startSeed bumps), seed the trail at the orbit-A entry position
  // and reset opacity so fade-in begins from 0.
  useEffect(() => {
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize)
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
    phaseElapsedRef.current = 0
    opacityRef.current = 0
    if (headRef.current) headRef.current.position.set(seed[0], seed[1], seed[2])
    if (haloRef.current) haloRef.current.position.set(seed[0], seed[1], seed[2])
    if (headMatRef.current) headMatRef.current.opacity = 0
    if (haloMatRef.current) haloMatRef.current.opacity = 0
    if (trailMatRef.current) trailMatRef.current.opacity = 0
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSeed])

  // Reduced-motion gate: render the static end-state.
  useEffect(() => {
    if (!reducedMotion) return
    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize)
    const orbitB = makeOrbitBDesc(spec, chordHalf, orbitSize, oppositeRotation)
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
    opacityRef.current = 1
    invalidate()
  }, [reducedMotion, spec, chordHalf, orbitSize, oppositeRotation, invalidate])

  useFrame((_, delta) => {
    if (reducedMotion) return

    const dt = Math.min(delta, 1 / 30) * speedMult
    const prevLocalT = phaseElapsedRef.current
    phaseElapsedRef.current += dt
    const localT = phaseElapsedRef.current

    // Far-tip wrap detection — only fires when Travel is pending. Each
    // orbit revolution lands the electron at its far-tip every
    // ORBIT_PERIOD seconds (orbitA: theta = π; orbitB: theta = 0). When
    // localT crosses a multiple of ORBIT_PERIOD, prev mod > curr mod —
    // that's the wrap moment, and the cleanest place to hand off into
    // the position-and-tangent-continuous transit.
    if (
      pendingTravelRef.current &&
      (motionPhase === 'orbitA' || motionPhase === 'orbitB')
    ) {
      const prevMod = prevLocalT % ORBIT_PERIOD
      const currMod = localT % ORBIT_PERIOD
      if (prevLocalT > 1e-3 && currMod < prevMod) {
        onFarTipRef.current()
      }
    }
    prevLocalTRef.current = localT

    // Lerp opacity toward existence target. Fade rate is wall-clock so the
    // visual fade speed doesn't change with speedMult.
    const targetOpacity = existence === 'visible' ? 1 : 0
    const opacityRate = delta / FADE_DUR
    if (opacityRef.current < targetOpacity) {
      opacityRef.current = Math.min(targetOpacity, opacityRef.current + opacityRate)
    } else if (opacityRef.current > targetOpacity) {
      opacityRef.current = Math.max(targetOpacity, opacityRef.current - opacityRate)
    }

    // Fully-faded-out idle → don't run motion math, just keep meshes hidden.
    if (existence === 'idle' && opacityRef.current === 0) {
      if (headMatRef.current) headMatRef.current.opacity = 0
      if (haloMatRef.current) haloMatRef.current.opacity = 0
      if (trailMatRef.current) trailMatRef.current.opacity = 0
      return
    }

    const orbitA = makeOrbitADesc(spec, chordHalf, orbitSize)
    const orbitB = makeOrbitBDesc(spec, chordHalf, orbitSize, oppositeRotation)
    let pos: Vec3 = lastPosRef.current

    if (motionPhase === 'orbitA') {
      const theta = spec.initialPhase + orbitA.omega * localT
      pos = orbitPosAt(orbitA, theta)
    } else if (motionPhase === 'travelAB') {
      const t = Math.min(localT, transitDur)
      if (oppositeRotation) {
        const lemnisc = buildLemniscate(
          [-chordHalf, 0, 0],
          [chordHalf, 0, 0],
          [0, 1, 0],
        )
        const tau = Math.PI + (Math.PI * t) / transitDur
        pos = lemniscatePos(
          lemnisc.midpoint,
          lemnisc.uHat,
          lemnisc.wHat,
          lemnisc.a,
          tau,
        )
      } else {
        if (!travelDescABRef.current) {
          const sourceAtExit: OrbitDesc = { ...orbitA, phase: Math.PI }
          travelDescABRef.current = buildTravel(sourceAtExit, orbitB, transitDur, {
            exitAngle: Math.PI,
            arcSide: 'top',
          })
        }
        pos = evalTravel(travelDescABRef.current, t)
      }
    } else if (motionPhase === 'orbitB') {
      const theta = 0 + orbitB.omega * localT
      pos = orbitPosAt(orbitB, theta)
    } else {
      // travelBA
      const t = Math.min(localT, transitDur)
      if (oppositeRotation) {
        const lemnisc = buildLemniscate(
          [-chordHalf, 0, 0],
          [chordHalf, 0, 0],
          [0, 1, 0],
        )
        const tau = (Math.PI * t) / transitDur
        pos = lemniscatePos(
          lemnisc.midpoint,
          lemnisc.uHat,
          lemnisc.wHat,
          lemnisc.a,
          tau,
        )
      } else {
        if (!travelDescBARef.current) {
          const sourceAtExit: OrbitDesc = { ...orbitB, phase: 0 }
          travelDescBARef.current = buildTravel(sourceAtExit, orbitA, transitDur, {
            exitAngle: 0,
            arcSide: 'bottom',
          })
        }
        pos = evalTravel(travelDescBARef.current, t)
      }
    }

    lastPosRef.current = pos

    headRef.current.position.set(pos[0], pos[1], pos[2])
    if (haloRef.current) haloRef.current.position.set(pos[0], pos[1], pos[2])

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

// --- Drag handle -----------------------------------------------------------

function DragHandle({
  pos,
  onDrag,
  zoom,
  viewport,
  label,
}: {
  pos: Vec3
  onDrag: (next: Vec3) => void
  zoom: number
  viewport: { w: number; h: number }
  label: 'A' | 'B'
}) {
  const screen = projectWorldToScreen(pos, zoom, viewport.w, viewport.h)
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
  const [motionPhase, setMotionPhase] = useState<MotionPhase>('orbitA')
  const [autoReplay, setAutoReplay] = useState(true)
  const [zoom, setZoom] = useState(CAMERA_Z)
  const [oppositeRotation, setOppositeRotation] = useState(true)
  const [speedMult, setSpeedMult] = useState(3)
  const [lapsBefore, setLapsBefore] = useState(1)
  const [lapsAfter, setLapsAfter] = useState(1)
  const [startSeed, setStartSeed] = useState(0)
  const [pendingTravel, setPendingTravel] = useState(false)

  const viewport = useViewport()
  const reducedMotion = usePrefersReducedMotion()
  const fadeTex = useMemo(() => makeFadeTexture(), [])

  const chordHalf = useMemo(() => chordHalfFrom(pointA, pointB), [pointA, pointB])
  const orbitSize = useMemo(() => chordHalf * (Math.SQRT2 - 1), [chordHalf])
  const groupOffset = useMemo(() => midpointFrom(pointA, pointB), [pointA, pointB])
  const groupTiltZ = useMemo(() => tiltZFrom(pointA, pointB), [pointA, pointB])

  const transitDur = oppositeRotation ? HALF_LEMNISCATE : TRAVEL_DUR
  const orbitADur = lapsBefore * ORBIT_PERIOD
  const orbitBDur = lapsAfter * ORBIT_PERIOD

  // Phase auto-advance:
  //  - transits always advance to the next orbit
  //  - orbits advance to the next transit only when Loop is on
  useEffect(() => {
    if (existence !== 'visible') return
    let phaseDur = 0
    let next: MotionPhase | null = null
    if (motionPhase === 'travelAB') {
      phaseDur = transitDur
      next = 'orbitB'
    } else if (motionPhase === 'travelBA') {
      phaseDur = transitDur
      next = 'orbitA'
    } else if (autoReplay && motionPhase === 'orbitA') {
      phaseDur = orbitADur
      next = 'travelAB'
    } else if (autoReplay && motionPhase === 'orbitB') {
      phaseDur = orbitBDur
      next = 'travelBA'
    }
    if (next === null) return
    const ms = (phaseDur / speedMult) * 1000
    const advance = next
    const tid = window.setTimeout(() => {
      setMotionPhase(advance)
      // Loop-driven advance lands at a far-tip too, so any queued Travel
      // is satisfied by this transition. Clearing avoids carrying the
      // flag into the next orbit and re-firing on its first wrap.
      setPendingTravel(false)
    }, ms)
    return () => window.clearTimeout(tid)
  }, [motionPhase, existence, autoReplay, orbitADur, orbitBDur, transitDur, speedMult])

  const onStart = useCallback(() => {
    setMotionPhase('orbitA')
    setExistence('visible')
    setStartSeed((s) => s + 1)
    setPendingTravel(false)
  }, [])
  const onEnd = useCallback(() => {
    setExistence('idle')
    setPendingTravel(false)
  }, [])
  const onTravel = useCallback(() => {
    // Queue the transit; ElectronProbe fires onFarTip at the next orbit
    // wrap, where the handoff is position-and-tangent-continuous. Tapping
    // Travel mid-orbit and starting the transit immediately would skip
    // the chord-line exit and produce a visible straight-line glitch.
    setPendingTravel(true)
  }, [])
  const onFarTip = useCallback(() => {
    setMotionPhase((p) => {
      if (p === 'orbitA') return 'travelAB'
      if (p === 'orbitB') return 'travelBA'
      return p
    })
    setPendingTravel(false)
  }, [])

  const travelEnabled =
    existence === 'visible' && (motionPhase === 'orbitA' || motionPhase === 'orbitB')

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
            <Nuclei chordHalf={chordHalf} />
            {ELECTRONS.map((spec, i) => (
              <ElectronProbe
                key={`e${i}`}
                spec={spec}
                fadeTex={fadeTex}
                reducedMotion={reducedMotion}
                oppositeRotation={oppositeRotation}
                speedMult={speedMult}
                chordHalf={chordHalf}
                orbitSize={orbitSize}
                motionPhase={motionPhase}
                existence={existence}
                startSeed={startSeed}
                pendingTravel={pendingTravel}
                onFarTip={onFarTip}
              />
            ))}
          </group>
        </Canvas>
      </div>

      <LabsNav />

      <DragHandle pos={pointA} onDrag={setPointA} zoom={zoom} viewport={viewport} label="A" />
      <DragHandle pos={pointB} onDrag={setPointB} zoom={zoom} viewport={viewport} label="B" />

      <div className={s.controlsPanel} aria-label="Atom motion controls">
        <div className={s.controlsRow}>
          <button
            type="button"
            className={s.btn}
            onClick={onStart}
            aria-label="Start"
            title="Start"
          >
            ▶ start
          </button>
          <button
            type="button"
            className={`${s.btn} ${pendingTravel ? s.btnActive : ''}`}
            onClick={onTravel}
            aria-label="Travel"
            title="Travel A↔B (queues until next far-tip)"
            disabled={!travelEnabled}
          >
            {pendingTravel ? '⇋ travel·queued' : '⇋ travel'}
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
              setLapsBefore((v) => {
                const idx = LAP_STEPS.indexOf(v)
                return LAP_STEPS[(idx + 1) % LAP_STEPS.length]
              })
            }
            aria-label={`${lapsBefore} laps before transit — tap to change`}
            title={`${lapsBefore} laps before transit`}
          >
            {`${lapsBefore} laps in`}
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={() =>
              setLapsAfter((v) => {
                const idx = LAP_STEPS.indexOf(v)
                return LAP_STEPS[(idx + 1) % LAP_STEPS.length]
              })
            }
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
            onClick={() => setOppositeRotation((v) => !v)}
            aria-label={
              oppositeRotation
                ? 'Switch to same-rotation transit'
                : 'Switch to opposite-rotation transit'
            }
            title={
              oppositeRotation
                ? 'Opposite rotation (lemniscate)'
                : 'Same rotation (ellipse arc)'
            }
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
