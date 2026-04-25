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

function CameraController({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.z = zoom
    camera.updateProjectionMatrix()
  }, [zoom, camera])
  return null
}
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
const ORBIT_SIZE = 0.55
const ORBIT_ASPECT = 0.62
const ORBIT_OMEGA_BASE = 2.4 // rad/s
const GROUP_ROTATION: [number, number, number] = [Math.PI / 4, Math.PI / 4, 0]
const CAMERA_Z = 9.0
// Lemniscate cycle period — full figure-8 traversal in seconds.
const LEMNISCATE_PERIOD = 6.0

// --- Sequence timing (seconds) ---------------------------------------------

const FADE_IN_DUR = 0.55
const ORBIT_A_DUR = 2.2
const TRAVEL_DUR = 1.55
const POST_HOLD = 1.4

const TRAVEL_BASE_T = ORBIT_A_DUR
const TOTAL_DUR = TRAVEL_BASE_T + TRAVEL_DUR + POST_HOLD

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
const APEX_ANGLE = Math.PI
const E1_OMEGA = -ORBIT_OMEGA_BASE // CW
// Solve theta(travelStart) = APEX_ANGLE:
//   APEX_ANGLE = initialPhase + omega · (travelStart − fadeInStart)
const E1_INITIAL_PHASE =
  APEX_ANGLE - E1_OMEGA * (TRAVEL_BASE_T /* travelStart since fadeInStart=0 */)

const ELECTRONS: ElectronSpec[] = [
  {
    plane: 'xy',
    cwAtA: true,
    initialPhase: E1_INITIAL_PHASE,
    fadeInStart: 0,
    travelStart: TRAVEL_BASE_T,
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
  onReport,
}: {
  spec: ElectronSpec
  electronIndex: number
  fadeTex: THREE.DataTexture
  replayKey: number
  reducedMotion: boolean
  oppositeRotation: boolean
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
    const orbitB = makeOrbitBDesc(spec, oppositeRotation)

    // Fade-in opacity (head/halo).
    let opacity = 0
    if (t >= spec.fadeInStart) {
      opacity = Math.min(1, (t - spec.fadeInStart) / FADE_IN_DUR)
    }

    // Opposite-rotation mode: lemniscate (figure-8) traversal. Single
    // closed curve with foci at A and B; topology naturally flips
    // orbital rotation between the two lobes (CCW around one, CW around
    // the other). The user's vision: "Think of it as a figure 8 pathway
    // — that flips the rotation about each foci."
    if (oppositeRotation) {
      const lemnisc = buildLemniscate(NUCLEUS_A, NUCLEUS_B, [0, 1, 0])
      // Map wall-clock time to τ. Period is the full figure-8 cycle.
      const tau = (2 * Math.PI * (t - spec.fadeInStart)) / LEMNISCATE_PERIOD
      pos = lemniscatePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, lemnisc.a, tau)
      // Phase classification by which lobe currently holds the electron:
      //   τ in [0, π/2] or [3π/2, 2π) → right lobe (B side)
      //   τ in [π/2, 3π/2]            → left lobe (A side)
      const tauMod = ((tau % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      const inLeftLobe = tauMod >= Math.PI / 2 && tauMod < (3 * Math.PI) / 2
      phase = inLeftLobe ? 'orbitA' : 'orbitB'
      // Rough velocity magnitude (finite difference in τ).
      const eps = 1e-3
      const pPlus = lemniscatePos(lemnisc.midpoint, lemnisc.uHat, lemnisc.wHat, lemnisc.a, tau + eps)
      vMag = Math.hypot(pPlus[0] - pos[0], pPlus[1] - pos[1], pPlus[2] - pos[2]) / (eps * LEMNISCATE_PERIOD / (2 * Math.PI))

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
      if (headMatRef.current) headMatRef.current.opacity = opacity
      if (haloMatRef.current) haloMatRef.current.opacity = opacity * 0.42
      if (trailMatRef.current) trailMatRef.current.opacity = opacity
      onReport(electronIndex, { phase, position: pos, vMag })
      return
    }

    if (t < spec.fadeInStart) {
      phase = 'pre'
      pos = orbitPosAt(orbitA, spec.initialPhase)
    } else if (t < spec.travelStart) {
      // Orbit A — includes the fade-in window. Travel exits at whatever
      // orbital phase the electron happens to be at when scheduled — the
      // ellipse construction handles arbitrary exit phases naturally.
      phase = t < spec.fadeInStart + FADE_IN_DUR ? 'fadeIn' : 'orbitA'
      const dtSinceFade = t - spec.fadeInStart
      const theta = spec.initialPhase + orbitA.omega * dtSinceFade
      pos = orbitPosAt(orbitA, theta)
      const v = orbitVelocityAt(orbitA, theta)
      vMag = Math.hypot(v[0], v[1], v[2])
    } else if (t < spec.travelStart + TRAVEL_DUR) {
      phase = 'travel'
      if (!travelDescRef.current) {
        // Build the transfer ellipse on first travel frame using the
        // electron's current orbital phase as the exit angle. Each
        // electron's transfer plane is set per-electron by the position
        // of its exit point relative to the chord — three electrons in
        // three orbital planes produce three transfer planes that share
        // the chord and cross in 3D (the figure-8 pattern).
        const dtSinceFade = spec.travelStart - spec.fadeInStart
        const exitAngle = spec.initialPhase + orbitA.omega * dtSinceFade
        const sourceAtExit: OrbitDesc = { ...orbitA, phase: exitAngle }
        travelDescRef.current = buildTravel(
          sourceAtExit,
          orbitB,
          TRAVEL_DUR,
          {
            exitAngle,
            arcSide: oppositeRotation ? 'bottom' : 'top',
          },
        )
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
      const orbitBResolved = travelDescRef.current?.destOrbit ?? orbitB
      const theta = entryAngle + orbitBResolved.omega * dtSinceCapture
      pos = orbitPosAt(orbitBResolved, theta)
      const v = orbitVelocityAt(orbitBResolved, theta)
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
  const [collapsed, setCollapsed] = useState(false)
  const [zoom, setZoom] = useState(CAMERA_Z)
  const [oppositeRotation, setOppositeRotation] = useState(false)
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
          camera={{ position: [0, 0, zoom], fov: 50 }}
          frameloop="always"
          aria-hidden="true"
        >
          <CameraController zoom={zoom} />
          <group rotation={GROUP_ROTATION}>
            <Nuclei />
            {ELECTRONS.map((spec, i) => (
              <ElectronProbe
                key={`e${i}-${replayKey}-${oppositeRotation ? 'opp' : 'same'}`}
                spec={spec}
                electronIndex={i}
                fadeTex={fadeTex}
                replayKey={replayKey}
                reducedMotion={reducedMotion}
                oppositeRotation={oppositeRotation}
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

      {!collapsed && (
        <div className={s.card}>
          <div className={s.cardHeader}>
            <p className={s.title}>Atom motion lab</p>
            <button
              className={s.collapseBtn}
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse controls"
            >
              ×
            </button>
          </div>
          <p className={s.blurb}>
            3 electrons fade in around nucleus A on three orthogonal elliptical
            planes, then travel one-by-one to nucleus B via a gravity-shaped
            S-curve (cubic Hermite, C1-in-time at handoff). Rotation reverses on
            capture. {reducedMotion ? '(reduced-motion: animation suppressed)' : ''}
          </p>
          <div className={s.row}>
            <button type="button" className={s.button} onClick={handleReplay}>
              ↻ Replay
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
          <div className={s.row}>
            <label className={s.checkbox}>
              <input
                type="checkbox"
                checked={oppositeRotation}
                onChange={(e) => {
                  setOppositeRotation(e.target.checked)
                  setReplayKey((k) => k + 1)
                }}
              />
              <span>opposite rotation at B (CCW capture, kinks at exit)</span>
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
      )}

      {collapsed && (
        <button
          className={s.iconHandle}
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand controls"
        >
          ◀
        </button>
      )}

      <button
        type="button"
        className={s.canvasReplay}
        onClick={handleReplay}
        aria-label="Replay"
        title="Replay"
      >
        ↻
      </button>
      <div className={s.canvasZoomCluster}>
        <button
          type="button"
          className={s.canvasZoomBtn}
          onClick={() => setZoom((z) => Math.max(3, +(z - 0.5).toFixed(2)))}
          aria-label="Zoom in"
          title="Zoom in (closer)"
        >
          −
        </button>
        <button
          type="button"
          className={s.canvasZoomBtn}
          onClick={() => setZoom((z) => Math.min(30, +(z + 0.5).toFixed(2)))}
          aria-label="Zoom out"
          title="Zoom out (farther)"
        >
          +
        </button>
      </div>
      <span className={s.canvasZoomLabel}>z={zoom.toFixed(1)}</span>

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
