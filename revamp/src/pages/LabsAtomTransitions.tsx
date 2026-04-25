/*
 * /labs/atom-transitions — two-state sequence + transitionWindow knob.
 *
 * Pick state A and state B from radio rows (composition-rule validation
 * grays out illegal pairs — e.g. spiral.inward only enabled when A is
 * orbit). Hit Replay; the electron runs A through a Hermite-cubic blend
 * region into B. The boundary chips read measured |Δv| from the last
 * pre-window frame to the first post-window frame; with C1 Hermite at
 * both window edges this should approach zero → green.
 *
 * The seam math lives in `runtime/transitions.ts` (`evalSequence`); this
 * page just wires sliders to it and renders the result. windowMs comes
 * from the locked `transitionWindow · 0.5 · min(durL, durR)` formula.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import {
  AtomLabHud,
  type AtomLabEvent,
  type AtomLabMathState,
} from '../ui/atom/AtomLabHud'
import { ELECTRON } from '../ui/atom/constants'
import { makeFadeTexture } from '../ui/atom/Electron'
import { usePrefersReducedMotion } from '../ui/atom/usePrefersReducedMotion'
import { LabsNav } from '../ui/atom/LabsNav'
import {
  defaultConfigFor,
  evalState,
  STATE_TYPES,
  type SpiralStateConfig,
  type StateConfig,
  type StateType,
  type Vec3,
} from '../ui/atom/runtime'
import { checkComposition, computeWindowMs, evalSequence } from '../ui/atom/runtime/transitions'
import {
  IDENTITY_OVERLAY,
  defaultEndEffect,
  defaultStartEffect,
  evalEndEffect,
  evalStartEffect,
  type ElectronOverlay,
  type EndEffectConfig,
  type StartEffectConfig,
} from '../ui/atom/runtime/endEffects'
import { ATOM } from '../ui/atom/constants'
import s from './LabsAtomTransitions.module.css'

extend({ MeshLineGeometry, MeshLineMaterial })

const TRAIL_SEGMENTS = ELECTRON.trail.segments
const SEAM_KINK_THRESHOLD_GREEN = 0.025 // <2.5% reads visually clean
const SEAM_KINK_THRESHOLD_YELLOW = 0.05 // 2.5-5% borderline; >5% perceptible

type SeamSample = {
  beforeV: number   // |v| in last frame of A
  afterV: number    // |v| in first frame of B
  peakV: number     // peak |v| in the full run
}

function ElectronTransitionProbe({
  a,
  b,
  windowMs,
  startEffect,
  endEffect,
  replayKey,
  colors,
  mathRef,
  reducedMotion,
  onSeam,
  onComplete,
}: {
  a: StateConfig
  b: StateConfig
  windowMs: number
  startEffect: StartEffectConfig | null
  endEffect: EndEffectConfig | null
  replayKey: number
  colors: { head: string; halo: string; trail: string }
  mathRef: React.MutableRefObject<AtomLabMathState>
  reducedMotion: boolean
  onSeam: (s: SeamSample) => void
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
  const seamReportedRef = useRef(false)
  const peakVRef = useRef(0)
  const lastPosRef = useRef<Vec3>([0, 0, 0])
  const lastDtRef = useRef(0)
  const lastVRef = useRef(0)
  const beforeSeamVRef = useRef(0)
  // Salvaged from the retired blend-test: skip the first 3 velocity samples
  // so a wonky first-frame finite-difference can't lock peakV high and
  // make every chip read 0%.
  const velWarmupRef = useRef(3)

  const fadeTex = useMemo(() => makeFadeTexture(), [])
  const { invalidate, size } = useThree()
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  )

  const aEndPos = useMemo<Vec3>(() => evalState(a, 1, { nucleus: [0, 0, 0] }).position, [a])

  const bufRef = useRef<Float32Array | null>(null)
  const insertIdxRef = useRef(0)
  if (!bufRef.current) {
    bufRef.current = new Float32Array(TRAIL_SEGMENTS * 3)
  }

  // Latest a / b / aEndPos read inside the reset effect via refs so that
  // slider drags (which mutate the configs on every tick) don't reseed +
  // restart. State-TYPE swaps go through switchA/switchB which ALSO bump
  // replayKey via the auto-replay effect upstream, so type changes still
  // reset cleanly. Slider tweaks on the same A/B pair update live.
  const aRef = useRef(a)
  const bRef = useRef(b)
  const aEndPosRef = useRef(aEndPos)
  useEffect(() => { aRef.current = a }, [a])
  useEffect(() => { bRef.current = b }, [b])
  useEffect(() => { aEndPosRef.current = aEndPos }, [aEndPos])

  useEffect(() => {
    elapsedMsRef.current = 0
    completedRef.current = false
    seamReportedRef.current = false
    peakVRef.current = 0
    beforeSeamVRef.current = 0
    lastVRef.current = 0
    lastDtRef.current = 0
    velWarmupRef.current = 3
    insertIdxRef.current = 0
    const aCfg = aRef.current
    const bCfg = bRef.current
    const aEnd = aEndPosRef.current
    if (reducedMotion) {
      const endRes = evalState(bCfg, 1, { nucleus: [0, 0, 0], prev: { endPos: aEnd, endTangent: [0, 0, 0] } })
      const endPos = endRes.position
      lastPosRef.current = endPos
      const buf = bufRef.current!
      for (let i = 0; i < TRAIL_SEGMENTS; i++) {
        buf[i * 3] = endPos[0]
        buf[i * 3 + 1] = endPos[1]
        buf[i * 3 + 2] = endPos[2]
      }
      headRef.current.position.set(endPos[0], endPos[1], endPos[2])
      headRef.current.scale.setScalar(endRes.scale)
      if (haloRef.current) {
        haloRef.current.position.set(endPos[0], endPos[1], endPos[2])
        haloRef.current.scale.setScalar(endRes.scale)
      }
      mathRef.current = {
        phase: 'B',
        stateName: bCfg.type,
        t: 1,
        vMag: 0,
        extra: 'reduced-motion',
      }
      invalidate()
      return
    }
    const start = evalState(aCfg, 0, { nucleus: [0, 0, 0] }).position
    lastPosRef.current = start
    const buf = bufRef.current!
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      buf[i * 3] = start[0]
      buf[i * 3 + 1] = start[1]
      buf[i * 3 + 2] = start[2]
    }
    invalidate()
  }, [replayKey, reducedMotion, invalidate, mathRef])

  useFrame((_, delta) => {
    if (reducedMotion) return
    // dt floor at 1/240 (4ms) — salvaged from the retired blend-test.
    const dtSecClamped = Math.max(1 / 240, Math.min(delta, 1 / 30))
    const dtMs = dtSecClamped * 1000
    elapsedMsRef.current += dtMs
    const elapsed = elapsedMsRef.current
    const durA = Math.max(1, a.duration)
    const durB = Math.max(1, b.duration)
    const startDur = startEffect?.duration ?? 0
    const endDur = endEffect?.duration ?? 0
    const seqDur = durA + durB
    const totalDur = startDur + seqDur + endDur

    let phase: 'start' | 'A' | 'window' | 'B' | 'end'
    let tLocal: number
    let position: Vec3
    let scale: number
    let overlay: ElectronOverlay = IDENTITY_OVERLAY

    if (startDur > 0 && elapsed < startDur) {
      // Start phase — electron at A's t=0 with start-effect overlay.
      phase = 'start'
      tLocal = elapsed / startDur
      const r = evalState(a, 0, { nucleus: [0, 0, 0] })
      position = r.position
      scale = r.scale
      if (startEffect) overlay = evalStartEffect(startEffect, tLocal)
    } else if (elapsed < startDur + seqDur) {
      // Sequence (A → window → B) via Hermite seam blend.
      const seqElapsed = elapsed - startDur
      const seqResult = evalSequence(
        {
          a,
          b,
          ctxA: { nucleus: [0, 0, 0] },
          ctxB: { nucleus: [0, 0, 0], prev: { endPos: aEndPos, endTangent: [0, 0, 0] } },
          windowMs,
        },
        Math.min(seqElapsed, seqDur),
      )
      phase = seqResult.phase
      tLocal = seqResult.tLocal
      position = seqResult.position
      scale = seqResult.scale
    } else {
      // End phase — electron at B's t=1 with end-effect overlay.
      phase = 'end'
      tLocal = endDur > 0 ? Math.min(1, (elapsed - startDur - seqDur) / endDur) : 1
      const r = evalState(b, 1, {
        nucleus: [0, 0, 0],
        prev: { endPos: aEndPos, endTangent: [0, 0, 0] },
      })
      position = r.position
      scale = r.scale
      if (endEffect) overlay = evalEndEffect(endEffect, tLocal)
    }

    const finalScale = scale * overlay.scaleMult

    headRef.current.position.set(position[0], position[1], position[2])
    headRef.current.scale.setScalar(finalScale)
    if (headMatRef.current) {
      headMatRef.current.opacity = overlay.opacityMult
      if (overlay.colorOverride) {
        headMatRef.current.color.set(overlay.colorOverride)
      } else {
        headMatRef.current.color.set(colors.head)
      }
    }
    if (haloRef.current) {
      haloRef.current.position.set(position[0], position[1], position[2])
      haloRef.current.scale.setScalar(finalScale)
    }
    if (haloMatRef.current) {
      haloMatRef.current.opacity = 0.35 * overlay.opacityMult * overlay.glowMult
    }

    // Trail: skip during 'start' (electron is materializing at the anchor)
    // so the trail doesn't seed from world origin. End phase still samples
    // (locks at one point, naturally collapses).
    if (phase !== 'start') {
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
    }

    // Velocity from frame-to-frame finite difference. Truthful read.
    const last = lastPosRef.current
    const dx = position[0] - last[0]
    const dy = position[1] - last[1]
    const dz = position[2] - last[2]
    const vMag = Math.sqrt(dx * dx + dy * dy + dz * dz) / dtSecClamped

    const warmingUp = velWarmupRef.current > 0
    if (warmingUp) {
      velWarmupRef.current -= 1
    } else {
      if (vMag > peakVRef.current) peakVRef.current = vMag

      if (phase === 'A') {
        beforeSeamVRef.current = vMag
      } else if (phase === 'B' && !seamReportedRef.current && lastDtRef.current > 0) {
        seamReportedRef.current = true
        onSeam({
          beforeV: beforeSeamVRef.current,
          afterV: vMag,
          peakV: peakVRef.current,
        })
      }
    }

    lastPosRef.current = position
    lastDtRef.current = dtSecClamped
    lastVRef.current = vMag

    const stateName =
      phase === 'start'
        ? `${startEffect?.type ?? 'start'}→${a.type}`
        : phase === 'A'
          ? a.type
          : phase === 'B'
            ? b.type
            : phase === 'end'
              ? `${b.type}→${endEffect?.type ?? 'end'}`
              : `${a.type}→${b.type}`
    mathRef.current = {
      phase,
      stateName,
      t: tLocal,
      vMag,
      extra: `peakV=${peakVRef.current.toFixed(2)} pos=(${position[0].toFixed(2)},${position[1].toFixed(2)},${position[2].toFixed(2)})`,
    }

    if (elapsed >= totalDur && !completedRef.current) {
      completedRef.current = true
      onComplete()
    } else {
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

/* --------------------------- Boundary chips --------------------------- */

function classifyKink(seam: SeamSample): 'green' | 'yellow' | 'red' {
  if (seam.peakV <= 0) return 'green'
  const ratio = Math.abs(seam.afterV - seam.beforeV) / seam.peakV
  if (ratio < SEAM_KINK_THRESHOLD_GREEN) return 'green'
  if (ratio < SEAM_KINK_THRESHOLD_YELLOW) return 'yellow'
  return 'red'
}

function BoundaryChips({ seam }: { seam: SeamSample | null }) {
  if (!seam) {
    return (
      <div className={s.chips}>
        <span className={`${s.chip} ${s.chipGreen}`}>
          <span className={s.chipDot} />awaiting replay
        </span>
      </div>
    )
  }
  const cls = classifyKink(seam)
  const chipCls = cls === 'green' ? s.chipGreen : cls === 'yellow' ? s.chipYellow : s.chipRed
  const ratio = seam.peakV > 0 ? (Math.abs(seam.afterV - seam.beforeV) / seam.peakV) : 0
  return (
    <div className={s.chips}>
      <span className={`${s.chip} ${chipCls}`}>
        <span className={s.chipDot} />
        Δ|v| {(ratio * 100).toFixed(1)}%
      </span>
      <span className={`${s.chip} ${s.chipGreen}`}>
        <span className={s.chipDot} />
        peak {seam.peakV.toFixed(2)}
      </span>
      <span className={`${s.chip} ${s.chipGreen}`}>
        <span className={s.chipDot} />
        before {seam.beforeV.toFixed(2)}
      </span>
      <span className={`${s.chip} ${s.chipGreen}`}>
        <span className={s.chipDot} />
        after {seam.afterV.toFixed(2)}
      </span>
    </div>
  )
}

/* ------------------------------ Page ------------------------------ */

export function LabsAtomTransitions() {
  const [a, setA] = useState<StateConfig>(() => defaultConfigFor('orbit'))
  const [b, setB] = useState<StateConfig>(() => {
    const sp = defaultConfigFor('spiral') as SpiralStateConfig
    return { ...sp, direction: 'inward' as const }
  })
  const [transitionWindow, setTransitionWindow] = useState(0.5)
  const [startEffect, setStartEffect] = useState<StartEffectConfig | null>(null)
  const [endEffect, setEndEffect] = useState<EndEffectConfig | null>(null)
  const [colors] = useState({ head: '#ffffff', halo: '#ffffff', trail: '#ffffff' })
  const [replayKey, setReplayKey] = useState(0)
  const [events, setEvents] = useState<AtomLabEvent[]>([])
  const [seam, setSeam] = useState<SeamSample | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const mathRef = useRef<AtomLabMathState>({
    phase: 'A',
    stateName: a.type,
    t: 0,
    vMag: 0,
  })

  const compositionError = useMemo(() => checkComposition(a, b), [a, b])

  const windowMs = useMemo(
    () => computeWindowMs(transitionWindow, a.duration, b.duration),
    [transitionWindow, a.duration, b.duration],
  )

  const pushEvent = useCallback((action: string) => {
    setEvents((prev) => [{ ts: Date.now(), action }, ...prev].slice(0, 12))
  }, [])

  const replay = useCallback(() => {
    if (compositionError) return
    setSeam(null)
    setReplayKey((k) => k + 1)
    pushEvent(`replay·${a.type}→${b.type}`)
  }, [a.type, b.type, compositionError, pushEvent])

  const switchA = useCallback((type: StateType) => {
    setA(defaultConfigFor(type))
    setSeam(null)
    setReplayKey((k) => k + 1)
    pushEvent(`A·${type}`)
  }, [pushEvent])

  const switchB = useCallback((type: StateType) => {
    setB(defaultConfigFor(type))
    setSeam(null)
    setReplayKey((k) => k + 1)
    pushEvent(`B·${type}`)
  }, [pushEvent])

  // Disable B options that would violate composition with current A.
  const isBOptionLegal = useCallback((type: StateType): boolean => {
    const candidate = defaultConfigFor(type)
    return checkComposition(a, candidate) === null
  }, [a])

  const cycleStartEffect = useCallback(() => {
    setStartEffect((cur) => {
      if (cur === null) return defaultStartEffect('appear')
      if (cur.type === 'appear') return defaultStartEffect('burst')
      return null
    })
    setReplayKey((k) => k + 1)
  }, [])

  const cycleEndEffect = useCallback(() => {
    setEndEffect((cur) => {
      if (cur === null) return defaultEndEffect('burst')
      if (cur.type === 'burst') return defaultEndEffect('fade')
      return null
    })
    setReplayKey((k) => k + 1)
  }, [])

  /** Recreate the production logo's motion: appear in → orbit (xy plane,
   *  ~4 laps with the locked ellipse aspect from constants.ts) → Hermite
   *  blend → spiral.inward collapse → burst on landing. Single-electron
   *  approximation; the real logo runs three on different planes. Targets
   *  the origin in the lab (the production logo targets the i-dot DOM
   *  coord, which isn't available outside the topbar scene). */
  const loadLogoPreset = useCallback(() => {
    const aspect = ATOM.orbit.radiusB / ATOM.orbit.radiusA  // 0.85 / 1.40
    setA({
      type: 'orbit',
      size: ATOM.orbit.radiusA,
      aspect,
      revolutions: 4,
      duration: 4000,
      plane: 'xy',
    })
    setB({
      type: 'spiral',
      direction: 'inward',
      size: ATOM.orbit.radiusA,
      aspect,
      revolutions: 1.5,
      duration: 1500,
      plane: 'xy',
    })
    setTransitionWindow(0.5)
    setStartEffect({ type: 'appear', withShrink: false, duration: 500 })
    setEndEffect({ type: 'burst', scaleIntensity: 1.45, glowIntensity: 2.5, duration: 600 })
    setSeam(null)
    setReplayKey((k) => k + 1)
    pushEvent('preset·logo')
  }, [pushEvent])

  const hudConfig = useMemo<Record<string, unknown>>(() => {
    const aBit =
      a.type === 'spiral'
        ? `${a.type}.${a.direction}`
        : a.type
    const bBit =
      b.type === 'spiral'
        ? `${b.type}.${b.direction}`
        : b.type
    return {
      A: aBit,
      'A.dur': a.duration,
      B: bBit,
      'B.dur': b.duration,
      window: transitionWindow.toFixed(2),
      windowMs: Math.round(windowMs),
      start: startEffect ? `${startEffect.type}/${startEffect.duration}ms` : 'none',
      end: endEffect ? `${endEffect.type}/${endEffect.duration}ms` : 'none',
    }
  }, [a, b, transitionWindow, windowMs, startEffect, endEffect])

  return (
    <div className={s.root}>
      <div className={s.canvasArea}>
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, 5], fov: 50 }}
          aria-hidden="true"
        >
          <ambientLight intensity={1} />
          {!compositionError && (
            <ElectronTransitionProbe
              a={a}
              b={b}
              windowMs={windowMs}
              startEffect={startEffect}
              endEffect={endEffect}
              replayKey={replayKey}
              colors={colors}
              mathRef={mathRef}
              reducedMotion={reducedMotion}
              onSeam={setSeam}
              onComplete={() => pushEvent(`complete·${a.type}→${b.type}`)}
            />
          )}
        </Canvas>
      </div>

      {!collapsed && (
        <div className={s.card}>
          <div className={s.cardHeader}>
            <p className={s.title}>Transitions lab</p>
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
            <p className={s.sectionLabel}>State A</p>
            <div className={s.radioRow}>
              {STATE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${s.radio} ${a.type === t ? s.radioActive : ''}`}
                  onClick={() => switchA(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>State B</p>
            <div className={s.radioRow}>
              {STATE_TYPES.map((t) => {
                const legal = isBOptionLegal(t)
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!legal}
                    className={`${s.radio} ${b.type === t ? s.radioActive : ''} ${!legal ? s.radioDisabled : ''}`}
                    onClick={() => legal && switchB(t)}
                    title={!legal ? 'composition rule blocks this pair' : undefined}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {compositionError && (
            <div className={s.warning}>{compositionError}</div>
          )}

          <div className={s.section}>
            <p className={s.sectionLabel}>Preset</p>
            <button
              type="button"
              className={s.radio}
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={loadLogoPreset}
            >
              ↻ Load logo preset
            </button>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Start effect</p>
            <button
              type="button"
              className={s.radio}
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={cycleStartEffect}
            >
              {startEffect ? startEffect.type : 'none'}
              <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}>
                {startEffect ? `${startEffect.duration}ms` : 'tap to cycle'}
              </span>
            </button>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>End effect</p>
            <button
              type="button"
              className={s.radio}
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={cycleEndEffect}
            >
              {endEffect ? endEffect.type : 'none'}
              <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}>
                {endEffect ? `${endEffect.duration}ms` : 'tap to cycle'}
              </span>
            </button>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Window</p>
            <div className={s.field}>
              <span className={s.fieldLabel}>window</span>
              <input
                className={s.slider}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={transitionWindow}
                onChange={(e) => setTransitionWindow(parseFloat(e.target.value))}
              />
              <span className={s.fieldValue}>{transitionWindow.toFixed(2)}</span>
            </div>
            <div className={s.field}>
              <span className={s.fieldLabel}>windowMs</span>
              <span className={s.fieldValue} style={{ flex: 1, textAlign: 'left' }}>
                {Math.round(windowMs)}ms
              </span>
            </div>
            <div className={s.note}>
              Hermite cubic blend across the window. Longer window = wider
              fillet at the seam. Δ|v|/peakV target: green (&lt;2.5%).
            </div>
            <div className={s.field}>
              <span className={s.fieldLabel}>A.dur</span>
              <input
                className={s.slider}
                type="range"
                min={300}
                max={6000}
                step={50}
                value={a.duration}
                onChange={(e) => setA({ ...a, duration: parseFloat(e.target.value) })}
              />
              <span className={s.fieldValue}>{a.duration}ms</span>
            </div>
            <div className={s.field}>
              <span className={s.fieldLabel}>B.dur</span>
              <input
                className={s.slider}
                type="range"
                min={300}
                max={6000}
                step={50}
                value={b.duration}
                onChange={(e) => setB({ ...b, duration: parseFloat(e.target.value) })}
              />
              <span className={s.fieldValue}>{b.duration}ms</span>
            </div>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Boundary</p>
            <BoundaryChips seam={seam} />
          </div>

          <button
            className={s.replayBtn}
            type="button"
            disabled={!!compositionError}
            onClick={replay}
          >
            ↻ Replay
          </button>
        </div>
      )}

      {collapsed && (
        <button
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 22,
            background: 'rgba(20,20,20,0.92)',
            border: '1px solid rgba(255,255,255,0.16)',
            color: '#eaeaea',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
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
        onClick={replay}
        disabled={!!compositionError}
        aria-label="Replay"
        title="Replay"
      >
        ↻
      </button>

      <LabsNav />
      <AtomLabHud config={hudConfig} mathRef={mathRef} events={events} tone="dark" />
    </div>
  )
}
