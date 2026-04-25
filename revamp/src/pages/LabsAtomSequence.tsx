/*
 * /labs/atom-sequence — sequence builder.
 *
 * Compose a sequence:  start effect  →  state₁  ⇒  state₂  ⇒  state₃  →  end effect
 *
 * Each ⇒ is a Hermite-cubic seam blend (window slider per pair). The
 * states + transitions math is the same as the other labs; this page is
 * just orchestration. 2–3 states for v1.
 *
 * "Start" / "End" effects belong to the SEQUENCE, not to individual
 * transitions. Transitions = the math at the seam between two states.
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
import { ATOM, ELECTRON } from '../ui/atom/constants'
import { makeFadeTexture } from '../ui/atom/Electron'
import { usePrefersReducedMotion } from '../ui/atom/usePrefersReducedMotion'
import { LabsNav } from '../ui/atom/LabsNav'
import {
  defaultConfigFor,
  evalState,
  STATE_TYPES,
  type StateConfig,
  type StateContext,
  type StateType,
  type Vec3,
} from '../ui/atom/runtime'
import {
  checkComposition,
  computeWindowMs,
  evalSequenceN,
} from '../ui/atom/runtime/transitions'
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
import s from './LabsAtomSequence.module.css'

extend({ MeshLineGeometry, MeshLineMaterial })

const TRAIL_SEGMENTS = ELECTRON.trail.segments
const ZERO: Vec3 = [0, 0, 0]

const STORAGE_KEY = 'aiu:atom-sequence-patterns'

type SavedPattern = {
  id: string
  name: string
  states: StateConfig[]
  windowVals: number[]
  startEffect: StartEffectConfig | null
  endEffect: EndEffectConfig | null
}

function loadSavedPatterns(): SavedPattern[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistSavedPatterns(p: SavedPattern[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // quota exceeded etc. — silent.
  }
}

/** Auto-generate a descriptive pattern name from its shape. */
function autoNamePattern(
  states: StateConfig[],
  startEffect: StartEffectConfig | null,
  endEffect: EndEffectConfig | null,
): string {
  const stateNames = states.map((st) =>
    st.type === 'spiral' ? `spiral.${st.direction === 'inward' ? 'in' : 'out'}` : st.type,
  )
  const startBit = startEffect ? `${startEffect.type}→` : ''
  const endBit = endEffect ? `→${endEffect.type}` : ''
  return startBit + stateNames.join('→') + endBit
}

function CameraController({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.z = zoom
    camera.updateProjectionMatrix()
  }, [zoom, camera])
  return null
}

/** Build the per-state ctx chain — each state's ctx.prev.endPos is
 *  the previous state's evalState(t=1) position. */
function buildCtxs(states: StateConfig[]): StateContext[] {
  const ctxs: StateContext[] = []
  let prevEnd: Vec3 = ZERO
  for (let i = 0; i < states.length; i++) {
    const ctx: StateContext =
      i === 0
        ? { nucleus: ZERO }
        : { nucleus: ZERO, prev: { endPos: prevEnd, endTangent: ZERO } }
    ctxs.push(ctx)
    prevEnd = evalState(states[i], 1, ctx).position
  }
  return ctxs
}

function ElectronSequenceProbe({
  states,
  windowMs,
  startEffect,
  endEffect,
  replayKey,
  mathRef,
  reducedMotion,
  onComplete,
}: {
  states: StateConfig[]
  windowMs: number[] // length = states.length - 1
  startEffect: StartEffectConfig | null
  endEffect: EndEffectConfig | null
  replayKey: number
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

  const elapsedMsRef = useRef(0)
  const completedRef = useRef(false)
  const lastPosRef = useRef<Vec3>(ZERO)

  const fadeTex = useMemo(() => makeFadeTexture(), [])
  const { invalidate, size } = useThree()
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  )

  const ctxs = useMemo(() => buildCtxs(states), [states])

  const bufRef = useRef<Float32Array | null>(null)
  const insertIdxRef = useRef(0)
  if (!bufRef.current) bufRef.current = new Float32Array(TRAIL_SEGMENTS * 3)

  // Latest config / ctx via ref so slider drags don't reset elapsed.
  const statesRef = useRef(states)
  const ctxsRef = useRef(ctxs)
  const windowMsRef = useRef(windowMs)
  const startRef = useRef(startEffect)
  const endRef = useRef(endEffect)
  useEffect(() => { statesRef.current = states }, [states])
  useEffect(() => { ctxsRef.current = ctxs }, [ctxs])
  useEffect(() => { windowMsRef.current = windowMs }, [windowMs])
  useEffect(() => { startRef.current = startEffect }, [startEffect])
  useEffect(() => { endRef.current = endEffect }, [endEffect])

  useEffect(() => {
    elapsedMsRef.current = 0
    completedRef.current = false
    insertIdxRef.current = 0
    const startPos = evalState(statesRef.current[0], 0, ctxsRef.current[0]).position
    lastPosRef.current = startPos
    const buf = bufRef.current!
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      buf[i * 3] = startPos[0]
      buf[i * 3 + 1] = startPos[1]
      buf[i * 3 + 2] = startPos[2]
    }
    if (reducedMotion) {
      const lastIdx = statesRef.current.length - 1
      const endRes = evalState(statesRef.current[lastIdx], 1, ctxsRef.current[lastIdx])
      headRef.current.position.set(...endRes.position)
      headRef.current.scale.setScalar(endRes.scale)
      if (haloRef.current) {
        haloRef.current.position.set(...endRes.position)
        haloRef.current.scale.setScalar(endRes.scale)
      }
      mathRef.current = {
        phase: 'end',
        stateName: statesRef.current[lastIdx].type,
        t: 1,
        vMag: 0,
        extra: 'reduced-motion',
      }
    }
    invalidate()
  }, [replayKey, reducedMotion, invalidate, mathRef])

  useFrame((_, delta) => {
    if (reducedMotion) return
    const dtSec = Math.max(1 / 240, Math.min(delta, 1 / 30))
    elapsedMsRef.current += dtSec * 1000
    const elapsed = elapsedMsRef.current

    const ss = statesRef.current
    const cc = ctxsRef.current
    const wms = windowMsRef.current
    const startE = startRef.current
    const endE = endRef.current

    const startDur = startE?.duration ?? 0
    const endDur = endE?.duration ?? 0
    const totalStateDur = ss.reduce((a, st) => a + Math.max(1, st.duration), 0)
    const totalDur = startDur + totalStateDur + endDur

    let phase: 'start' | 'pure' | 'window' | 'end'
    let position: Vec3
    let scale: number
    let overlay: ElectronOverlay = IDENTITY_OVERLAY
    let phaseLabel: string
    let tInPhase: number
    let stateIdx = 0

    if (startDur > 0 && elapsed < startDur) {
      phase = 'start'
      tInPhase = elapsed / startDur
      const r = evalState(ss[0], 0, cc[0])
      position = r.position
      scale = r.scale
      if (startE) overlay = evalStartEffect(startE, tInPhase)
      phaseLabel = `${startE?.type ?? 'start'}→${ss[0].type}`
    } else if (elapsed < startDur + totalStateDur) {
      // Inside the state chain.
      const ePost = elapsed - startDur
      const seq = evalSequenceN({ states: ss, ctxs: cc, windowsMs: wms }, ePost)
      phase = seq.phase
      stateIdx = seq.stateIndex
      tInPhase = seq.tLocal
      position = seq.position
      scale = seq.scale
      phaseLabel =
        seq.phase === 'pure'
          ? ss[seq.stateIndex].type
          : `${ss[seq.stateIndex].type}⇒${ss[seq.stateIndex + 1].type}`
    } else {
      phase = 'end'
      const lastIdx = ss.length - 1
      tInPhase = endDur > 0 ? Math.min(1, (elapsed - startDur - totalStateDur) / endDur) : 1
      const r = evalState(ss[lastIdx], 1, cc[lastIdx])
      position = r.position
      scale = r.scale
      if (endE) overlay = evalEndEffect(endE, tInPhase)
      phaseLabel = `${ss[lastIdx].type}→${endE?.type ?? 'end'}`
      stateIdx = lastIdx
    }

    const finalScale = scale * overlay.scaleMult
    headRef.current.position.set(position[0], position[1], position[2])
    headRef.current.scale.setScalar(finalScale)
    if (headMatRef.current) {
      headMatRef.current.opacity = overlay.opacityMult
      if (overlay.colorOverride) headMatRef.current.color.set(overlay.colorOverride)
      else headMatRef.current.color.set('#ffffff')
    }
    if (haloRef.current) {
      haloRef.current.position.set(position[0], position[1], position[2])
      haloRef.current.scale.setScalar(finalScale)
    }
    if (haloMatRef.current) {
      haloMatRef.current.opacity = 0.35 * overlay.opacityMult * overlay.glowMult
    }

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
      if (trailGeomRef.current?.setPoints) trailGeomRef.current.setPoints(unroll)
    }

    const last = lastPosRef.current
    const dx = position[0] - last[0]
    const dy = position[1] - last[1]
    const dz = position[2] - last[2]
    const vMag = Math.sqrt(dx * dx + dy * dy + dz * dz) / dtSec
    lastPosRef.current = position

    mathRef.current = {
      phase,
      stateName: phaseLabel,
      t: tInPhase,
      vMag,
      extra: `idx=${stateIdx} pos=(${position[0].toFixed(2)},${position[1].toFixed(2)},${position[2].toFixed(2)})`,
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
          color="#ffffff"
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
        <meshBasicMaterial ref={haloMatRef} color="#ffffff" toneMapped={false} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshBasicMaterial ref={headMatRef} color="#ffffff" toneMapped={false} transparent opacity={1} />
      </mesh>
    </>
  )
}

/* --------------------------------- Page --------------------------------- */

const MAX_STATES = 3

export function LabsAtomSequence() {
  const [states, setStates] = useState<StateConfig[]>(() => [
    defaultConfigFor('orbit'),
    defaultConfigFor('spiral'),
  ])
  const [windowVals, setWindowVals] = useState<number[]>([0.5])
  const [startEffect, setStartEffect] = useState<StartEffectConfig | null>(null)
  const [endEffect, setEndEffect] = useState<EndEffectConfig | null>(null)
  const [zoom, setZoom] = useState(5)
  const [replayKey, setReplayKey] = useState(0)
  const [events, setEvents] = useState<AtomLabEvent[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>(() => loadSavedPatterns())
  const [patternNameInput, setPatternNameInput] = useState('')
  const [copyConfirmId, setCopyConfirmId] = useState<string | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  const mathRef = useRef<AtomLabMathState>({
    phase: 'pure',
    stateName: states[0].type,
    t: 0,
    vMag: 0,
  })

  const compositionErrors = useMemo(() => {
    const errs: (string | null)[] = []
    for (let i = 0; i < states.length - 1; i++) {
      errs.push(checkComposition(states[i], states[i + 1]))
    }
    return errs
  }, [states])
  const anyError = compositionErrors.some(Boolean)

  const windowsMs = useMemo(
    () => windowVals.map((v, i) => computeWindowMs(v, states[i].duration, states[i + 1].duration)),
    [windowVals, states],
  )

  const pushEvent = useCallback((action: string) => {
    setEvents((prev) => [{ ts: Date.now(), action }, ...prev].slice(0, 12))
  }, [])

  const replay = useCallback(() => {
    if (anyError) return
    setReplayKey((k) => k + 1)
    pushEvent(`replay (${states.length} states)`)
  }, [anyError, states.length, pushEvent])

  const setStateAt = useCallback((i: number, next: StateConfig) => {
    setStates((cur) => {
      const out = [...cur]
      out[i] = next
      return out
    })
  }, [])

  const switchTypeAt = useCallback((i: number, type: StateType) => {
    setStates((cur) => {
      const out = [...cur]
      out[i] = defaultConfigFor(type)
      return out
    })
    setReplayKey((k) => k + 1)
  }, [])

  const addState = useCallback(() => {
    if (states.length >= MAX_STATES) return
    setStates([...states, defaultConfigFor('straight')])
    setWindowVals([...windowVals, 0.5])
    setReplayKey((k) => k + 1)
  }, [states, windowVals])

  const removeState = useCallback(() => {
    if (states.length <= 2) return
    setStates(states.slice(0, -1))
    setWindowVals(windowVals.slice(0, -1))
    setExpanded({ ...expanded, [states.length - 1]: false })
    setReplayKey((k) => k + 1)
  }, [states, windowVals, expanded])

  const loadLogoPreset = useCallback(() => {
    const aspect = ATOM.orbit.radiusB / ATOM.orbit.radiusA
    setStates([
      { type: 'orbit', size: ATOM.orbit.radiusA, aspect, revolutions: 4, duration: 4000, plane: 'xy' },
      { type: 'spiral', direction: 'inward', size: ATOM.orbit.radiusA, aspect, revolutions: 1.5, duration: 1500, plane: 'xy' },
    ])
    setWindowVals([0.5])
    setStartEffect({ type: 'appear', withShrink: false, duration: 500 })
    setEndEffect({ type: 'burst', scaleIntensity: 1.45, glowIntensity: 2.5, duration: 600 })
    setReplayKey((k) => k + 1)
    pushEvent('preset·logo')
  }, [pushEvent])

  const applyPattern = useCallback((p: { states: StateConfig[]; windowVals: number[]; startEffect: StartEffectConfig | null; endEffect: EndEffectConfig | null }) => {
    setStates(p.states)
    setWindowVals(p.windowVals)
    setStartEffect(p.startEffect)
    setEndEffect(p.endEffect)
    setReplayKey((k) => k + 1)
  }, [])

  const saveCurrent = useCallback(() => {
    const trimmed = patternNameInput.trim()
    const name = trimmed || autoNamePattern(states, startEffect, endEffect)
    const newPattern: SavedPattern = {
      id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      // Deep-clone via JSON round-trip so future edits don't mutate the saved snapshot.
      states: JSON.parse(JSON.stringify(states)),
      windowVals: [...windowVals],
      startEffect: startEffect ? { ...startEffect } : null,
      endEffect: endEffect ? { ...endEffect } : null,
    }
    setSavedPatterns((cur) => {
      const next = [...cur, newPattern]
      persistSavedPatterns(next)
      return next
    })
    setPatternNameInput('')
    pushEvent(`save·${name}`)
  }, [patternNameInput, states, windowVals, startEffect, endEffect, pushEvent])

  const deletePattern = useCallback((id: string) => {
    setSavedPatterns((cur) => {
      const next = cur.filter((p) => p.id !== id)
      persistSavedPatterns(next)
      return next
    })
  }, [])

  const copyPatternJson = useCallback(async (p: SavedPattern) => {
    const exported = {
      name: p.name,
      states: p.states,
      windowVals: p.windowVals,
      startEffect: p.startEffect,
      endEffect: p.endEffect,
    }
    const json = JSON.stringify(exported, null, 2)
    try {
      await navigator.clipboard?.writeText(json)
      setCopyConfirmId(p.id)
      window.setTimeout(() => setCopyConfirmId((cur) => (cur === p.id ? null : cur)), 1500)
    } catch {
      // clipboard write blocked — fall back to selecting the text via a
      // hidden textarea? skip for now; user can hand-copy from devtools.
    }
  }, [])

  const loadAtomFormsPreset = useCallback(() => {
    // Electrons "appear" → straight from off-screen → orbit → spiral
    // collapse → burst at nucleus point. Card-bouncing entry vibe.
    setStates([
      { type: 'straight', target: [0, 0, 0], duration: 800 },
      { type: 'orbit', size: 1.0, aspect: 1.0, revolutions: 2, duration: 2000, plane: 'xy' },
      { type: 'spiral', direction: 'inward', size: 1.0, aspect: 1.0, revolutions: 1.2, duration: 1000, plane: 'xy' },
    ])
    setWindowVals([0.5, 0.5])
    setStartEffect({ type: 'appear', withShrink: true, duration: 300 })
    setEndEffect({ type: 'burst', scaleIntensity: 1.6, glowIntensity: 2.2, duration: 500 })
    setReplayKey((k) => k + 1)
    pushEvent('preset·atom-forms')
  }, [pushEvent])

  const hudConfig = useMemo<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {
      n: states.length,
      types: states.map((s) => s.type).join('→'),
      durs: states.map((s) => s.duration).join('/'),
      windows: windowVals.map((v) => v.toFixed(2)).join(','),
      start: startEffect ? `${startEffect.type}/${startEffect.duration}` : 'none',
      end: endEffect ? `${endEffect.type}/${endEffect.duration}` : 'none',
      cam: zoom.toFixed(1),
    }
    return base
  }, [states, windowVals, startEffect, endEffect, zoom])

  return (
    <div className={s.root}>
      <div className={s.canvasArea}>
        <Canvas frameloop="demand" camera={{ position: [0, 0, 5], fov: 50 }} aria-hidden="true">
          <ambientLight intensity={1} />
          <CameraController zoom={zoom} />
          {!anyError && (
            <ElectronSequenceProbe
              states={states}
              windowMs={windowsMs}
              startEffect={startEffect}
              endEffect={endEffect}
              replayKey={replayKey}
              mathRef={mathRef}
              reducedMotion={reducedMotion}
              onComplete={() => pushEvent('complete')}
            />
          )}
        </Canvas>
      </div>

      {!collapsed && (
        <div className={s.card}>
          <div className={s.cardHeader}>
            <p className={s.title}>Sequence lab</p>
            <button className={s.collapseBtn} type="button" onClick={() => setCollapsed(true)} aria-label="Collapse">×</button>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Built-in presets</p>
            <button type="button" className={s.btn} style={{ width: '100%' }} onClick={loadLogoPreset}>
              ↻ Logo (orbit → spiral.in + burst)
            </button>
            <button type="button" className={s.btn} style={{ width: '100%', marginTop: 4 }} onClick={loadAtomFormsPreset}>
              ↻ Atom forms (straight → orbit → spiral.in + burst)
            </button>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Your saved patterns</p>
            {savedPatterns.length === 0 && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>
                None yet. Save the current sequence below.
              </p>
            )}
            {savedPatterns.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <button
                  type="button"
                  className={s.btn}
                  style={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => { applyPattern(p); pushEvent(`load·${p.name}`) }}
                  title={`${p.states.map((st) => st.type).join('→')}`}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </button>
                <button
                  type="button"
                  className={s.btn}
                  style={{ flex: '0 0 auto', minWidth: 36 }}
                  onClick={() => copyPatternJson(p)}
                  title="Copy JSON to clipboard"
                  aria-label="Copy"
                >
                  {copyConfirmId === p.id ? '✓' : '⧉'}
                </button>
                <button
                  type="button"
                  className={s.btn}
                  style={{ flex: '0 0 auto', minWidth: 36 }}
                  onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) deletePattern(p.id) }}
                  title="Delete pattern"
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <input
                type="text"
                className={s.select}
                style={{ flex: 1 }}
                placeholder="name (e.g. a1)"
                value={patternNameInput}
                onChange={(e) => setPatternNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveCurrent() }}
              />
              <button
                type="button"
                className={s.btn}
                style={{ flex: '0 0 auto' }}
                onClick={saveCurrent}
                title="Save current sequence with this name"
              >
                💾 Save
              </button>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', lineHeight: 1.35 }}>
              Saved locally on this device. Tap ⧉ to copy a pattern's JSON
              so you can reference it elsewhere.
            </p>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Start effect</p>
            <div className={s.field}>
              <select
                className={s.select}
                value={startEffect?.type ?? 'none'}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'none') setStartEffect(null)
                  else if (v === 'appear') setStartEffect(defaultStartEffect('appear'))
                  else if (v === 'burst') setStartEffect(defaultStartEffect('burst'))
                  setReplayKey((k) => k + 1)
                }}
              >
                <option value="none">none</option>
                <option value="appear">appear</option>
                <option value="burst">burst</option>
              </select>
            </div>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>States</p>
            {states.map((state, i) => (
              <div key={i}>
                <div className={s.stateRow}>
                  <div className={s.stateRowHead}>
                    <span className={s.stateRowIndex}>#{i + 1}</span>
                    <select
                      className={s.select}
                      value={state.type}
                      onChange={(e) => switchTypeAt(i, e.target.value as StateType)}
                    >
                      {STATE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={s.stateRowExpand}
                      onClick={() => setExpanded({ ...expanded, [i]: !expanded[i] })}
                      aria-label={expanded[i] ? 'Collapse details' : 'Expand details'}
                    >
                      {expanded[i] ? '▴' : '▾'}
                    </button>
                  </div>
                  <div className={s.field}>
                    <span className={s.fieldLabel}>dur</span>
                    <input
                      className={s.slider}
                      type="range"
                      min={200}
                      max={6000}
                      step={50}
                      value={state.duration}
                      onChange={(e) => setStateAt(i, { ...state, duration: parseFloat(e.target.value) })}
                    />
                    <span className={s.fieldValue}>{state.duration}ms</span>
                  </div>
                  {expanded[i] && (
                    <div className={s.stateRowDetail}>
                      <StateDetails config={state} setConfig={(c) => setStateAt(i, c)} />
                    </div>
                  )}
                  {compositionErrors[i - 1] && i > 0 && (
                    <div className={s.warning}>{compositionErrors[i - 1]}</div>
                  )}
                </div>
                {i < states.length - 1 && (
                  <div className={s.windowRow}>
                    <span style={{ flex: '0 0 60px' }}>↓ transition</span>
                    <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                      {transitionLabelFor(states[i], states[i + 1])}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button type="button" className={s.btn}
                style={{ flex: 1 }}
                disabled={states.length >= MAX_STATES}
                onClick={addState}>+ Add state</button>
              <button type="button" className={s.btn}
                style={{ flex: 1 }}
                disabled={states.length <= 2}
                onClick={removeState}>− Remove last</button>
            </div>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>End effect</p>
            <div className={s.field}>
              <select
                className={s.select}
                value={endEffect?.type ?? 'none'}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'none') setEndEffect(null)
                  else if (v === 'burst') setEndEffect(defaultEndEffect('burst'))
                  else if (v === 'fade') setEndEffect(defaultEndEffect('fade'))
                  setReplayKey((k) => k + 1)
                }}
              >
                <option value="none">none</option>
                <option value="burst">burst</option>
                <option value="fade">fade</option>
              </select>
            </div>
          </div>

          <div className={s.section}>
            <p className={s.sectionLabel}>Camera (zoom)</p>
            <div className={s.field}>
              <span className={s.fieldLabel}>z</span>
              <input className={s.slider} type="range" min={3} max={30} step={0.1}
                value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
              <span className={s.fieldValue}>{zoom.toFixed(1)}</span>
            </div>
          </div>

          <button className={s.replayBtn} type="button" disabled={anyError} onClick={replay}>
            ↻ Replay
          </button>
        </div>
      )}

      <button type="button" className={s.canvasReplay}
        onClick={replay} disabled={anyError} aria-label="Replay" title="Replay">↻</button>
      <div className={s.canvasZoomCluster}>
        <button type="button" className={s.canvasZoomBtn}
          onClick={() => setZoom((z) => Math.max(3, +(z - 0.5).toFixed(2)))}
          aria-label="Zoom in" title="Zoom in">−</button>
        <button type="button" className={s.canvasZoomBtn}
          onClick={() => setZoom((z) => Math.min(30, +(z + 0.5).toFixed(2)))}
          aria-label="Zoom out" title="Zoom out">+</button>
      </div>
      <span className={s.canvasZoomLabel}>z={zoom.toFixed(1)}</span>

      <LabsNav />
      <AtomLabHud config={hudConfig} mathRef={mathRef} events={events} tone="dark" />
    </div>
  )
}

/* --------------------------- Per-state details --------------------------- */

function StateDetails({ config, setConfig }: { config: StateConfig; setConfig: (c: StateConfig) => void }) {
  if (config.type === 'orbit' || config.type === 'spiral') {
    return (
      <>
        <RangeRow label="size" value={config.size} min={0.2} max={2.5} step={0.05}
          onChange={(v) => setConfig({ ...config, size: v })} format={(v) => v.toFixed(2)} />
        <RangeRow label="aspect" value={config.aspect} min={0.2} max={2.0} step={0.05}
          onChange={(v) => setConfig({ ...config, aspect: v })} format={(v) => v.toFixed(2)} />
        <RangeRow label="revs" value={config.revolutions} min={0.25} max={5} step={0.25}
          onChange={(v) => setConfig({ ...config, revolutions: v })} format={(v) => v.toFixed(2)} />
        {config.type === 'spiral' && (
          <div className={s.field}>
            <span className={s.fieldLabel}>dir</span>
            <select
              className={s.select}
              value={config.direction}
              onChange={(e) => setConfig({ ...config, direction: e.target.value as 'inward' | 'outward' })}
            >
              <option value="inward">inward</option>
              <option value="outward">outward</option>
            </select>
          </div>
        )}
        <div className={s.field}>
          <span className={s.fieldLabel}>plane</span>
          <select
            className={s.select}
            value={config.plane}
            onChange={(e) => setConfig({ ...config, plane: e.target.value as 'xy' | 'yz' | 'xz' })}
          >
            <option value="xy">xy</option>
            <option value="yz">yz</option>
            <option value="xz">xz</option>
          </select>
        </div>
        <RangeRow label="tilt X°" value={(config.tiltX ?? 0) * 180 / Math.PI} min={-180} max={180} step={1}
          onChange={(v) => setConfig({ ...config, tiltX: v * Math.PI / 180 })} format={(v) => `${v.toFixed(0)}°`} />
        <RangeRow label="tilt Y°" value={(config.tiltY ?? 0) * 180 / Math.PI} min={-180} max={180} step={1}
          onChange={(v) => setConfig({ ...config, tiltY: v * Math.PI / 180 })} format={(v) => `${v.toFixed(0)}°`} />
      </>
    )
  }
  if (config.type === 'straight') {
    return (
      <>
        <RangeRow label="x" value={config.target[0]} min={-2} max={2} step={0.05}
          onChange={(v) => setConfig({ ...config, target: [v, config.target[1], config.target[2]] })} format={(v) => v.toFixed(2)} />
        <RangeRow label="y" value={config.target[1]} min={-2} max={2} step={0.05}
          onChange={(v) => setConfig({ ...config, target: [config.target[0], v, config.target[2]] })} format={(v) => v.toFixed(2)} />
        <RangeRow label="z" value={config.target[2]} min={-2} max={2} step={0.05}
          onChange={(v) => setConfig({ ...config, target: [config.target[0], config.target[1], v] })} format={(v) => v.toFixed(2)} />
      </>
    )
  }
  if (config.type === 'pulsate') {
    return (
      <>
        <RangeRow label="peak" value={config.intensity} min={1.0} max={3.0} step={0.05}
          onChange={(v) => setConfig({ ...config, intensity: v })} format={(v) => v.toFixed(2)} />
        <RangeRow label="pulses" value={config.pulses} min={1} max={8} step={1}
          onChange={(v) => setConfig({ ...config, pulses: Math.round(v) })} format={(v) => v.toFixed(0)} />
      </>
    )
  }
  return null
}

/** Tag the canonical transition geometry for a given state pair. The
 *  geometry is locked per pair (no user knobs); this label just tells
 *  the user which one is active. */
function transitionLabelFor(a: StateConfig, b: StateConfig): string {
  if (a.type === 'straight' && b.type === 'orbit') return 'corkscrew (line opens into orbit)'
  if (a.type === 'orbit' && b.type === 'straight') return 'corkscrew (orbit coils into line)'
  return 'smooth blend (Hermite cubic)'
}

function RangeRow({ label, value, min, max, step, onChange, format }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <input className={s.slider} type="range" min={min} max={max} step={step}
        value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className={s.fieldValue}>{format(value)}</span>
    </div>
  )
}
