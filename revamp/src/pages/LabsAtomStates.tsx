/*
 * /labs/atom-states — single-state isolation lab.
 *
 * Pick one of the 5 locked states (orbit / straight / spiral / pulsate /
 * pause), tweak its constants in the floating top-right card, hit Replay,
 * watch it run for one duration cycle. The HUD at the bottom captures
 * commit, route, viewport, the active config, the math state at 30Hz, and
 * the most recent events — so a single phone screenshot is debug-complete.
 *
 * NOTE: Color picker is present (per chunk-3 spec) but does NOT yet drive
 * a finalized color system — it tints the head/halo/trail materials
 * directly. The full color system is deferred (see atom-system-plan.md).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { extend } from '@react-three/fiber'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import {
  AtomLabHud,
  type AtomLabEvent,
  type AtomLabMathState,
} from '../ui/atom/AtomLabHud'
import { ELECTRON } from '../ui/atom/constants'
import { makeFadeTexture } from '../ui/atom/Electron'
import { usePrefersReducedMotion } from '../ui/atom/usePrefersReducedMotion'
import {
  STATE_TYPES,
  defaultConfigFor,
  evalState,
  evalVelocityMagnitude,
  type StateConfig,
  type StateContext,
  type StateType,
  type Vec3,
} from '../ui/atom/runtime'
import s from './LabsAtomStates.module.css'

extend({ MeshLineGeometry, MeshLineMaterial })

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module '@react-three/fiber' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements {
    meshLineGeometry: object
    meshLineMaterial: object
  }
}

const ZERO_CTX: StateContext = { nucleus: [0, 0, 0] }
const TRAIL_SEGMENTS = ELECTRON.trail.segments

type Colors = {
  head: string
  halo: string
  trail: string
}

const DEFAULT_COLORS: Colors = {
  head: '#ffffff',
  halo: '#ffffff',
  trail: '#ffffff',
}

function ElectronProbe({
  config,
  replayKey,
  colors,
  mathRef,
  reducedMotion,
  onComplete,
}: {
  config: StateConfig
  replayKey: number
  colors: Colors
  mathRef: React.MutableRefObject<AtomLabMathState>
  reducedMotion: boolean
  onComplete: () => void
}) {
  const headRef = useRef<THREE.Mesh>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailGeomRef = useRef<any>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailMatRef = useRef<any>(null!)

  const elapsedMsRef = useRef(0)
  const completedRef = useRef(false)

  const fadeTex = useMemo(() => makeFadeTexture(), [])
  const { invalidate, size } = useThree()
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  )

  // Trail ring buffer — populated as the electron moves.
  const bufRef = useRef<Float32Array | null>(null)
  const insertIdxRef = useRef(0)
  if (!bufRef.current) {
    bufRef.current = new Float32Array(TRAIL_SEGMENTS * 3)
  }

  // Read latest config from a ref inside the reset effect so that slider
  // drags (which mutate `config` on every tick) don't reseed the trail
  // buffer + reset elapsedMs. State-TYPE changes go through switchState()
  // which bumps replayKey alongside config, so type swaps still reset
  // cleanly. Sliders on a single state update the visible motion live.
  const configRef = useRef(config)
  useEffect(() => { configRef.current = config }, [config])

  useEffect(() => {
    elapsedMsRef.current = 0
    completedRef.current = false
    insertIdxRef.current = 0
    const cfg = configRef.current
    const seedT = reducedMotion ? 1 : 0
    const seedRes = evalState(cfg, seedT, ZERO_CTX)
    const startPos = seedRes.position
    const buf = bufRef.current!
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      buf[i * 3] = startPos[0]
      buf[i * 3 + 1] = startPos[1]
      buf[i * 3 + 2] = startPos[2]
    }
    if (reducedMotion) {
      headRef.current.position.set(startPos[0], startPos[1], startPos[2])
      headRef.current.scale.setScalar(seedRes.scale)
      if (haloRef.current) {
        haloRef.current.position.set(startPos[0], startPos[1], startPos[2])
        haloRef.current.scale.setScalar(seedRes.scale)
      }
      mathRef.current = {
        phase: 'state',
        stateName: cfg.type,
        t: 1,
        vMag: 0,
        extra: 'reduced-motion',
      }
    }
    invalidate()
  }, [replayKey, reducedMotion, invalidate, mathRef])

  useFrame((_, delta) => {
    if (reducedMotion) return
    const dtMs = Math.min(delta, 1 / 30) * 1000
    elapsedMsRef.current += dtMs
    const duration = Math.max(1, config.duration)
    const tRaw = elapsedMsRef.current / duration
    const t = Math.min(1, Math.max(0, tRaw))

    const { position, scale } = evalState(config, t, ZERO_CTX)
    headRef.current.position.set(position[0], position[1], position[2])
    headRef.current.scale.setScalar(scale)
    if (haloRef.current) {
      haloRef.current.position.set(position[0], position[1], position[2])
      haloRef.current.scale.setScalar(scale)
    }

    // Trail: append current position to ring buffer.
    const buf = bufRef.current!
    const idx = insertIdxRef.current
    buf[idx * 3] = position[0]
    buf[idx * 3 + 1] = position[1]
    buf[idx * 3 + 2] = position[2]
    insertIdxRef.current = (idx + 1) % TRAIL_SEGMENTS
    const unroll = new Float32Array(TRAIL_SEGMENTS * 3)
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      const src = (insertIdxRef.current + i) % TRAIL_SEGMENTS
      unroll[i * 3] = buf[src * 3]
      unroll[i * 3 + 1] = buf[src * 3 + 1]
      unroll[i * 3 + 2] = buf[src * 3 + 2]
    }
    if (trailGeomRef.current?.setPoints) {
      trailGeomRef.current.setPoints(unroll)
    }

    // Math line: velocity-mag in scene-units / state-duration normalized t.
    // Convert to scene-units / second by dividing by (duration / 1000).
    const vNorm = evalVelocityMagnitude(config, t, ZERO_CTX)
    const vMag = vNorm / (duration / 1000)
    const extra =
      config.type === 'pulsate'
        ? `scale=${scale.toFixed(3)}`
        : `pos=(${position[0].toFixed(2)},${position[1].toFixed(2)},${position[2].toFixed(2)})`
    mathRef.current = {
      phase: 'state',
      stateName: config.type,
      t,
      vMag,
      extra,
    }

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true
      onComplete()
    } else {
      // Keep frameloop=demand spinning until we reach t=1.
      invalidate()
    }
  })

  return (
    <>
      <mesh>
        <meshLineGeometry ref={trailGeomRef} />
        <meshLineMaterial
          ref={trailMatRef}
          color={colors.trail}
          lineWidth={0.17}
          transparent
          opacity={1}
          depthWrite={false}
          alphaMap={fadeTex}
          useAlphaMap={1}
          toneMapped={false}
          resolution={resolution}
        />
      </mesh>
      <mesh ref={haloRef} scale={1}>
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={colors.halo}
          toneMapped={false}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshBasicMaterial
          ref={headMatRef}
          color={colors.head}
          toneMapped={false}
          transparent
          opacity={1}
        />
      </mesh>
    </>
  )
}

/* ----------------------------- Controls UI ----------------------------- */

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  const fmt = format ?? ((v: number) => v.toFixed(2))
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <input
        className={s.slider}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className={s.fieldValue}>{fmt(value)}</span>
    </div>
  )
}

function StateConstants({
  config,
  setConfig,
}: {
  config: StateConfig
  setConfig: (c: StateConfig) => void
}) {
  if (config.type === 'orbit') {
    return (
      <>
        <Slider label="size" value={config.size} min={0.2} max={2.5} step={0.05}
          onChange={(v) => setConfig({ ...config, size: v })} />
        <Slider label="aspect" value={config.aspect} min={0.2} max={2.0} step={0.05}
          onChange={(v) => setConfig({ ...config, aspect: v })} />
        <Slider label="revs" value={config.revolutions} min={0.25} max={4} step={0.25}
          onChange={(v) => setConfig({ ...config, revolutions: v })} />
        <Slider label="dur" value={config.duration} min={300} max={6000} step={50}
          format={(v) => `${v.toFixed(0)}ms`}
          onChange={(v) => setConfig({ ...config, duration: v })} />
        <PlaneSelect plane={config.plane} onChange={(p) => setConfig({ ...config, plane: p })} />
      </>
    )
  }
  if (config.type === 'straight') {
    return (
      <>
        <Slider label="x" value={config.target[0]} min={-2} max={2} step={0.05}
          onChange={(v) => setConfig({ ...config, target: [v, config.target[1], config.target[2]] })} />
        <Slider label="y" value={config.target[1]} min={-2} max={2} step={0.05}
          onChange={(v) => setConfig({ ...config, target: [config.target[0], v, config.target[2]] })} />
        <Slider label="z" value={config.target[2]} min={-2} max={2} step={0.05}
          onChange={(v) => setConfig({ ...config, target: [config.target[0], config.target[1], v] })} />
        <Slider label="dur" value={config.duration} min={200} max={4000} step={50}
          format={(v) => `${v.toFixed(0)}ms`}
          onChange={(v) => setConfig({ ...config, duration: v })} />
      </>
    )
  }
  if (config.type === 'spiral') {
    return (
      <>
        <DirSelect direction={config.direction} onChange={(d) => setConfig({ ...config, direction: d })} />
        <Slider label="size" value={config.size} min={0.2} max={2.5} step={0.05}
          onChange={(v) => setConfig({ ...config, size: v })} />
        <Slider label="aspect" value={config.aspect} min={0.2} max={2.0} step={0.05}
          onChange={(v) => setConfig({ ...config, aspect: v })} />
        <Slider label="revs" value={config.revolutions} min={0.25} max={5} step={0.25}
          onChange={(v) => setConfig({ ...config, revolutions: v })} />
        <Slider label="dur" value={config.duration} min={300} max={6000} step={50}
          format={(v) => `${v.toFixed(0)}ms`}
          onChange={(v) => setConfig({ ...config, duration: v })} />
        <PlaneSelect plane={config.plane} onChange={(p) => setConfig({ ...config, plane: p })} />
      </>
    )
  }
  if (config.type === 'pulsate') {
    return (
      <>
        <Slider label="peak" value={config.intensity} min={1.0} max={3.0} step={0.05}
          onChange={(v) => setConfig({ ...config, intensity: v })} />
        <Slider label="pulses" value={config.pulses} min={1} max={8} step={1}
          format={(v) => v.toFixed(0)}
          onChange={(v) => setConfig({ ...config, pulses: Math.round(v) })} />
        <Slider label="dur" value={config.duration} min={300} max={4000} step={50}
          format={(v) => `${v.toFixed(0)}ms`}
          onChange={(v) => setConfig({ ...config, duration: v })} />
      </>
    )
  }
  // pause
  return (
    <Slider label="dur" value={config.duration} min={100} max={3000} step={50}
      format={(v) => `${v.toFixed(0)}ms`}
      onChange={(v) => setConfig({ ...config, duration: v })} />
  )
}

function PlaneSelect({
  plane,
  onChange,
}: {
  plane: 'xy' | 'yz' | 'xz'
  onChange: (p: 'xy' | 'yz' | 'xz') => void
}) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>plane</span>
      <select
        className={s.select}
        value={plane}
        onChange={(e) => onChange(e.target.value as 'xy' | 'yz' | 'xz')}
      >
        <option value="xy">xy</option>
        <option value="yz">yz</option>
        <option value="xz">xz</option>
      </select>
    </div>
  )
}

function DirSelect({
  direction,
  onChange,
}: {
  direction: 'inward' | 'outward'
  onChange: (d: 'inward' | 'outward') => void
}) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>dir</span>
      <select
        className={s.select}
        value={direction}
        onChange={(e) => onChange(e.target.value as 'inward' | 'outward')}
      >
        <option value="inward">inward</option>
        <option value="outward">outward</option>
      </select>
    </div>
  )
}

/* --------------------------------- Page --------------------------------- */

export function LabsAtomStates() {
  const [config, setConfig] = useState<StateConfig>(() => defaultConfigFor('orbit'))
  const [colors, setColors] = useState<Colors>(DEFAULT_COLORS)
  const [replayKey, setReplayKey] = useState(0)
  const [events, setEvents] = useState<AtomLabEvent[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const mathRef = useRef<AtomLabMathState>({
    phase: 'state',
    stateName: config.type,
    t: 0,
    vMag: 0,
  })

  const pushEvent = useCallback((action: string) => {
    setEvents((prev) => [{ ts: Date.now(), action }, ...prev].slice(0, 12))
  }, [])

  const switchState = useCallback((type: StateType) => {
    const next = defaultConfigFor(type)
    setConfig(next)
    setReplayKey((k) => k + 1)
    pushEvent(`switch·${type}`)
  }, [pushEvent])

  const updateConfig = useCallback((c: StateConfig) => {
    setConfig(c)
    // Don't auto-replay on every slider tick — config changes apply on next frame.
  }, [])

  const replay = useCallback(() => {
    setReplayKey((k) => k + 1)
    pushEvent(`replay·${config.type}`)
  }, [config.type, pushEvent])

  const hudConfig = useMemo<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {
      type: config.type,
      dur: config.duration,
    }
    if (config.type === 'orbit' || config.type === 'spiral') {
      base.size = config.size
      base.aspect = config.aspect
      base.revs = config.revolutions
      base.plane = config.plane
    }
    if (config.type === 'spiral') base.dir = config.direction
    if (config.type === 'straight') base.tgt = config.target.map((n) => n.toFixed(2)).join(',')
    if (config.type === 'pulsate') {
      base.peak = config.intensity
      base.pulses = config.pulses
    }
    return base
  }, [config])

  return (
    <div className={s.root}>
      <div className={s.canvasArea}>
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, 5], fov: 50 }}
          aria-hidden="true"
        >
          <ambientLight intensity={1} />
          <ElectronProbe
            config={config}
            replayKey={replayKey}
            colors={colors}
            mathRef={mathRef}
            reducedMotion={reducedMotion}
            onComplete={() => pushEvent(`complete·${config.type}`)}
          />
        </Canvas>
      </div>

      {!collapsed && (
        <div className={s.card}>
          <div className={s.cardHeader}>
            <p className={s.title}>States lab</p>
            <button
              className={s.collapseBtn}
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse controls"
            >
              ×
            </button>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>State</p>
            <div className={s.radioRow}>
              {STATE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${s.radio} ${config.type === t ? s.radioActive : ''}`}
                  onClick={() => switchState(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Constants</p>
            <StateConstants config={config} setConfig={updateConfig} />
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Color</p>
            <div className={s.colorRow}>
              <input className={s.colorInput} type="color" value={colors.head}
                onChange={(e) => setColors({ ...colors, head: e.target.value })} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>head</span>
            </div>
            <div className={s.colorRow}>
              <input className={s.colorInput} type="color" value={colors.halo}
                onChange={(e) => setColors({ ...colors, halo: e.target.value })} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>halo</span>
            </div>
            <div className={s.colorRow}>
              <input className={s.colorInput} type="color" value={colors.trail}
                onChange={(e) => setColors({ ...colors, trail: e.target.value })} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>trail</span>
            </div>
          </div>

          <button className={s.replayBtn} type="button" onClick={replay}>
            ↻ Replay
          </button>
        </div>
      )}

      {collapsed && (
        <button
          className={s.iconHandle}
          style={{ display: 'flex' }}
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand controls"
        >
          ◀
        </button>
      )}

      <AtomLabHud config={hudConfig} mathRef={mathRef} events={events} tone="dark" />
    </div>
  )
}

// Allow `Vec3` import to lint cleanly even if elsewhere this becomes optional.
export type { Vec3 }
