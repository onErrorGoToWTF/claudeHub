/*
 * /labs/atom-motion — gravity-handoff stage.
 *
 * Two nuclei. Three electrons fade in around nucleus A on three orthogonal
 * elliptical orbital planes. After a brief orbit phase they travel one-by-
 * one to nucleus B via the gravity-shaped S-curve in `runtime/travel.ts`,
 * with rotation reversed on capture (CW around A → CCW around B per plane).
 * After capture the electron continues orbiting B from the entry angle.
 *
 * Sized to logo-compact (camera z=5.5, group rotation π/4·π/4 for 3/4 view)
 * so the demo reads like a logo-scale composition. Nuclei rendered as small
 * subtle spheres so the user can see the centers; can be hidden by setting
 * `showNuclei` false.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import {
  AtomLabHud,
  type AtomLabEvent,
  type AtomLabMathState,
} from '../ui/atom/AtomLabHud'
import { ELECTRON } from '../ui/atom/constants'
import { makeFadeTexture } from '../ui/atom/Electron'
import type { Plane } from '../ui/atom/Electron'
import { usePrefersReducedMotion } from '../ui/atom/usePrefersReducedMotion'
import { LabsNav } from '../ui/atom/LabsNav'
import type { Vec3 } from '../ui/atom/runtime/types'
import {
  buildTravel,
  evalTravel,
  evalTravelVelocity,
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
const ORBIT_SIZE = 0.55
const ORBIT_ASPECT = 0.62
const ORBIT_OMEGA_BASE = 2.4 // rad/s
const GROUP_ROTATION: [number, number, number] = [Math.PI / 4, Math.PI / 4, 0]
const CAMERA_Z = 5.5

// --- Sequence timing (seconds) ---------------------------------------------

const FADE_IN_DUR = 0.55
const FADE_IN_STAGGER = 0.32
const ORBIT_A_DUR = 2.2
const TRAVEL_DUR = 1.55
const TRAVEL_STAGGER = 1.55
const POST_HOLD = 1.4

const TRAVEL_BASE_T = ORBIT_A_DUR
const TOTAL_DUR =
  TRAVEL_BASE_T + 2 * TRAVEL_STAGGER + TRAVEL_DUR + POST_HOLD

// --- Per-electron specs -----------------------------------------------------

type ElectronSpec = {
  plane: Plane
  cwAtA: boolean // true = CW around A; reverses on capture at B
  initialPhase: number
  fadeInStart: number
  travelStart: number
  color: string
  haloColor: string
  trailColor: string
}

// Distinct colors per electron so the three orthogonal planes are visually
// distinguishable in 3D — three white electrons overlap into one blob when
// they cross. Picked: warm white, cool blue, amber.
const ELECTRONS: ElectronSpec[] = [
  {
    plane: 'xy',
    cwAtA: true,
    initialPhase: 0,
    fadeInStart: 0,
    travelStart: TRAVEL_BASE_T + 0 * TRAVEL_STAGGER,
    color: '#ffffff',
    haloColor: '#ffffff',
    trailColor: '#ffffff',
  },
  {
    plane: 'yz',
    cwAtA: false,
    initialPhase: (2 * Math.PI) / 3,
    fadeInStart: FADE_IN_STAGGER,
    travelStart: TRAVEL_BASE_T + 1 * TRAVEL_STAGGER,
    color: '#87d8ff',
    haloColor: '#87d8ff',
    trailColor: '#87d8ff',
  },
  {
    plane: 'xz',
    cwAtA: true,
    initialPhase: (4 * Math.PI) / 3,
    fadeInStart: 2 * FADE_IN_STAGGER,
    travelStart: TRAVEL_BASE_T + 2 * TRAVEL_STAGGER,
    color: '#ffd66b',
    haloColor: '#ffd66b',
    trailColor: '#ffd66b',
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

function makeOrbitBDesc(spec: ElectronSpec): OrbitDesc {
  return {
    center: NUCLEUS_B,
    plane: spec.plane,
    size: ORBIT_SIZE,
    aspect: ORBIT_ASPECT,
    // Opposite rotation on capture — see plan §"Travel math" + advisor note.
    omega: spec.cwAtA ? ORBIT_OMEGA_BASE : -ORBIT_OMEGA_BASE,
    phase: 0,
  }
}

function ElectronProbe({
  spec,
  electronIndex,
  fadeTex,
  replayKey,
  reducedMotion,
  onReport,
}: {
  spec: ElectronSpec
  electronIndex: number
  fadeTex: THREE.DataTexture
  replayKey: number
  reducedMotion: boolean
  onReport: (idx: number, report: ProbeReport) => void
}) {
  const headRef = useRef<THREE.Mesh>(null!)
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailGeomRef = useRef<any>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailMatRef = useRef<any>(null!)

  const elapsedRef = useRef(0)
  const travelDescRef = useRef<TravelDesc | null>(null)
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
    travelDescRef.current = null

    // Reduced-motion gate: render the static end-state — electron sitting in
    // its captured orbit around nucleus B at the entry angle. No animation.
    // HUD continues to render normally so screenshots still capture context.
    if (reducedMotion) {
      const orbitA = makeOrbitADesc(spec)
      const orbitB = makeOrbitBDesc(spec)
      const desc = buildTravel(orbitA, orbitB, TRAVEL_DUR, {
        exitAngle: spec.initialPhase,
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

    // Seed trail behind the electron's starting orbit position so the trail
    // is visible on first frame instead of streaking from origin.
    const orbitA = makeOrbitADesc(spec)
    const startTheta = spec.initialPhase
    const start = orbitPosAt(orbitA, startTheta)
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
    const dt = Math.min(delta, 1 / 30)
    elapsedRef.current += dt
    const t = elapsedRef.current

    let phase: ProbeReport['phase'] = 'pre'
    let pos: Vec3 = lastPosRef.current
    let vMag = 0

    const orbitA = makeOrbitADesc(spec)
    const orbitB = makeOrbitBDesc(spec)

    // Fade-in opacity (head/halo).
    let opacity = 0
    if (t >= spec.fadeInStart) {
      opacity = Math.min(1, (t - spec.fadeInStart) / FADE_IN_DUR)
    }

    if (t < spec.fadeInStart) {
      phase = 'pre'
      const theta = spec.initialPhase + orbitA.omega * 0
      pos = orbitPosAt(orbitA, theta)
    } else if (t < spec.travelStart) {
      phase = t < spec.fadeInStart + FADE_IN_DUR ? 'fadeIn' : 'orbitA'
      const dtSinceFade = t - spec.fadeInStart
      const theta = spec.initialPhase + orbitA.omega * dtSinceFade
      pos = orbitPosAt(orbitA, theta)
      const v = orbitVelocityAt(orbitA, theta)
      vMag = Math.hypot(v[0], v[1], v[2])
    } else if (t < spec.travelStart + TRAVEL_DUR) {
      phase = 'travel'
      // Build the travel descriptor on the first frame of travel using the
      // electron's current orbital phase as the exit angle. This keeps the
      // exit C1-in-time with whatever orbital position+velocity the electron
      // had at the trigger instant — no snap to closest-point.
      if (!travelDescRef.current) {
        const dtSinceFade = spec.travelStart - spec.fadeInStart
        const exitAngle = spec.initialPhase + orbitA.omega * dtSinceFade
        travelDescRef.current = buildTravel(orbitA, orbitB, TRAVEL_DUR, {
          exitAngle,
        })
      }
      const localT = t - spec.travelStart
      pos = evalTravel(travelDescRef.current, localT)
      const v = evalTravelVelocity(travelDescRef.current, localT)
      vMag = Math.hypot(v[0], v[1], v[2])
    } else {
      phase = 'orbitB'
      const captureT = spec.travelStart + TRAVEL_DUR
      const dtSinceCapture = t - captureT
      const entryAngle = travelDescRef.current?.entryAngle ?? 0
      const theta = entryAngle + orbitB.omega * dtSinceCapture
      pos = orbitPosAt(orbitB, theta)
      const v = orbitVelocityAt(orbitB, theta)
      vMag = Math.hypot(v[0], v[1], v[2])
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

function ReplayLoop({
  replayKey,
  setReplayKey,
}: {
  replayKey: number
  setReplayKey: (k: number) => void
}) {
  const startRef = useRef(performance.now())
  useEffect(() => {
    startRef.current = performance.now()
  }, [replayKey])
  useFrame(() => {
    const elapsed = (performance.now() - startRef.current) / 1000
    if (elapsed > TOTAL_DUR) {
      setReplayKey(replayKey + 1)
    }
  })
  return null
}

// --- Page ---------------------------------------------------------------

export function LabsAtomMotion() {
  const [replayKey, setReplayKey] = useState(0)
  const [autoReplay, setAutoReplay] = useState(true)
  const reducedMotion = usePrefersReducedMotion()
  const fadeTex = useMemo(() => makeFadeTexture(), [])
  const mathRef = useRef<AtomLabMathState>({
    phase: 'init',
    stateName: 'motion',
    t: 0,
    vMag: 0,
  })
  const [events, setEvents] = useState<AtomLabEvent[]>([])
  const reportsRef = useRef<ProbeReport[]>([])
  const lastPhasesRef = useRef<string[]>(['', '', ''])

  const onReport = useCallback((idx: number, report: ProbeReport) => {
    reportsRef.current[idx] = report
    // Aggregate math state for HUD.
    const r0 = reportsRef.current[0]
    const r1 = reportsRef.current[1]
    const r2 = reportsRef.current[2]
    const phaseStr = `${r0?.phase ?? '·'}|${r1?.phase ?? '·'}|${r2?.phase ?? '·'}`
    const vAvg = ((r0?.vMag ?? 0) + (r1?.vMag ?? 0) + (r2?.vMag ?? 0)) / 3
    mathRef.current.phase = phaseStr
    mathRef.current.stateName = 'motion'
    mathRef.current.t = performance.now() / 1000
    mathRef.current.vMag = vAvg
    // Phase change events (fire only on transitions).
    if (lastPhasesRef.current[idx] !== report.phase) {
      lastPhasesRef.current[idx] = report.phase
      setEvents((prev) => [
        { ts: performance.now(), action: `e${idx + 1}·${report.phase}` },
        ...prev,
      ].slice(0, 20))
    }
  }, [])

  const handleReplay = () => setReplayKey((k) => k + 1)

  return (
    <div className={s.root}>
      <div className={s.canvasArea}>
        <Canvas
          camera={{ position: [0, 0, CAMERA_Z], fov: 50 }}
          frameloop="always"
          aria-hidden="true"
        >
          <group rotation={GROUP_ROTATION}>
            <Nuclei />
            {ELECTRONS.map((spec, i) => (
              <ElectronProbe
                key={`e${i}-${replayKey}`}
                spec={spec}
                electronIndex={i}
                fadeTex={fadeTex}
                replayKey={replayKey}
                reducedMotion={reducedMotion}
                onReport={onReport}
              />
            ))}
          </group>
          {autoReplay && (
            <ReplayLoop replayKey={replayKey} setReplayKey={setReplayKey} />
          )}
        </Canvas>
      </div>

      <LabsNav />

      <div className={s.card}>
        <div className={s.cardHeader}>
          <p className={s.title}>Atom motion lab</p>
        </div>
        <p className={s.blurb}>
          3 electrons fade in around nucleus A on three orthogonal elliptical
          planes, then travel one-by-one to nucleus B via a gravity-shaped
          S-curve (cubic Hermite, C1-in-time at handoff). Rotation reverses on
          capture. {reducedMotion ? '(reduced-motion: animation suppressed)' : ''}
        </p>
        <div className={s.row}>
          <button type="button" className={s.button} onClick={handleReplay}>
            Replay
          </button>
          <label className={s.checkbox}>
            <input
              type="checkbox"
              checked={autoReplay}
              onChange={(e) => setAutoReplay(e.target.checked)}
            />
            <span>auto-loop</span>
          </label>
        </div>
        <div className={s.legend}>
          <div>nucleus A · ({NUCLEUS_A.join(', ')})</div>
          <div>nucleus B · ({NUCLEUS_B.join(', ')})</div>
          <div>orbits · size {ORBIT_SIZE} aspect {ORBIT_ASPECT}</div>
          <div>ω · {ORBIT_OMEGA_BASE} rad/s (sign per electron)</div>
          <div>travel · {TRAVEL_DUR}s, κ=0.5</div>
        </div>
      </div>

      <AtomLabHud
        config={{
          nA: `[${NUCLEUS_A.join(',')}]`,
          nB: `[${NUCLEUS_B.join(',')}]`,
          size: ORBIT_SIZE,
          aspect: ORBIT_ASPECT,
          omega: ORBIT_OMEGA_BASE,
          travelDur: TRAVEL_DUR,
          kappa: 0.5,
          electrons: 3,
          replay: replayKey,
        }}
        mathRef={mathRef}
        events={events}
      />
    </div>
  )
}
