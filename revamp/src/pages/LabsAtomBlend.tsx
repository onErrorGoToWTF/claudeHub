/*
 * /labs/atom-blend-test — Phase-blend math prototype.
 *
 * NOT a production component. NOT extracted to src/ui/atom/. NOT in nav.
 * Diagnostic instrument for one decision: does hand-rolled math achieve
 * C1 (velocity continuity) at boundaries between four sequential phases
 * on a single electron? If no, GSAP becomes a candidate (separate chunk).
 *
 * Phase sequence (1s each, 4s total, then loops):
 *   Phase 0  circle-orbit       r=1.0, 1 lap
 *   Phase 1  ellipse-stretch    radii (1.0,1.0) → (1.4,0.85), 1 lap
 *   Phase 2  straight           (1.4, 0, 0) → (0.4, 0.4, 0)
 *   Phase 3  spiral inward      from (0.4, 0.4, 0) to (0, 0, 0), 1 rev
 *
 * Three boundaries — each has a per-boundary <select> for blend mode:
 *   B1  phase 0 → phase 1   (controls ellipse-stretch's radius easing)
 *   B2  phase 1 → phase 2   (controls straight's lerp easing)
 *   B3  phase 2 → phase 3   (controls spiral's radius-shrink easing)
 *
 * Blend modes:
 *   sharp       linear easing — derivative ≠ 0 at boundary, kink expected
 *   smoothstep  s²(3-2s)    — derivative 0 at both ends, C1 IF the
 *                              boundary velocity is also 0 (won't be)
 *   cubic       1-(1-s)³   — derivative 3 at start, 0 at end. Snappy entry.
 *
 * Cleanliness criterion (committed to before reading results):
 *   Δ|v| between adjacent frames at a boundary, relative to peak |v|
 *   anywhere in the sequence. Pass = ratio < 5% (eye-perceptible threshold).
 *   Fail = ratio > 5% AND visible kink in the persistent trail.
 *
 * Math state held in refs only — no React state writes inside useFrame.
 * Readout updates via ref-write to a <pre> element's textContent.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import s from './LabsAtomBlend.module.css'

type BlendMode = 'sharp' | 'smoothstep' | 'cubic' | 'hermite'

const BLEND_MODES: BlendMode[] = ['sharp', 'smoothstep', 'cubic', 'hermite']

// Body easing for the phase's interior. Hermite mode uses sharp (linear)
// for the body so the segment past the boundary window has predictable
// constant velocity; the boundary itself is interpolated via Hermite cubic.
function ease(x: number, mode: BlendMode): number {
  if (mode === 'sharp' || mode === 'hermite') return x
  if (mode === 'smoothstep') return x * x * (3 - 2 * x)
  return 1 - Math.pow(1 - x, 3) // easeOutCubic
}

// Width of the Hermite boundary window in s-units (sInPhase). 0.08 ≈ 80ms
// per 1s phase — ~5 frames @ 60fps. Big enough to read on the trail; small
// enough that the body of the phase still dominates the visual.
const HERMITE_WINDOW_S = 0.08

type Phase =
  | { type: 'circle-orbit'; revolutions: number }
  | { type: 'ellipse-stretch'; rxStart: number; ryStart: number; rxEnd: number; ryEnd: number; revolutions: number }
  | { type: 'straight'; from: [number, number, number]; to: [number, number, number] }
  | { type: 'spiral'; orbitCenter: [number, number, number]; startRadius: number; startAngle: number; revolutions: number }

const PHASES: Phase[] = [
  { type: 'circle-orbit', revolutions: 1 },
  { type: 'ellipse-stretch', rxStart: 1.0, ryStart: 1.0, rxEnd: 1.4, ryEnd: 0.85, revolutions: 1 },
  { type: 'straight', from: [1.4, 0, 0], to: [0.4, 0.4, 0] },
  // Spiral starts at (0.4, 0.4, 0). |start| = √(0.32) ≈ 0.566.
  // startAngle = atan2(0.4, 0.4) = π/4. Orbit center = origin so the
  // electron arrives at (0,0,0) when the radius shrinks to 0.
  {
    type: 'spiral',
    orbitCenter: [0, 0, 0],
    startRadius: Math.SQRT2 * 0.4,
    startAngle: Math.PI / 4,
    revolutions: 1,
  },
]

const PHASE_DURATION_S = 1
const TOTAL_DURATION_S = PHASES.length * PHASE_DURATION_S
const TRAIL_LENGTH = 600 // ~10s @ 60fps; covers ~2.5 loops, kinks accumulate

function evaluatePhase(phase: Phase, sIn: number, blend: BlendMode): [number, number, number] {
  const e = ease(sIn, blend)
  switch (phase.type) {
    case 'circle-orbit': {
      // Orbit progresses uniformly in angle (no easing on θ — orbits are
      // intrinsically uniform-angular-velocity). Blend has NO effect here;
      // its first effective use is in phase 1.
      const theta = 2 * Math.PI * phase.revolutions * sIn
      return [Math.cos(theta), Math.sin(theta), 0]
    }
    case 'ellipse-stretch': {
      // Angle still uniform; blend controls how rx/ry interpolate from
      // start radii to end radii. C1 with previous orbit IFF derivative
      // of `e` at sIn=0 equals 0 (smoothstep ✓, cubic ✗, sharp ✗).
      const rx = phase.rxStart + (phase.rxEnd - phase.rxStart) * e
      const ry = phase.ryStart + (phase.ryEnd - phase.ryStart) * e
      const theta = 2 * Math.PI * phase.revolutions * sIn
      return [rx * Math.cos(theta), ry * Math.sin(theta), 0]
    }
    case 'straight': {
      // Pure positional lerp. Initial velocity ∝ e'(0). With smoothstep
      // e'(0)=0, the line starts AT REST — but the previous phase exits
      // with nonzero orbital velocity, so smoothstep here gives a sudden
      // velocity DROP not a smooth handoff. This is the prototype's
      // central reveal: lerp+smoothstep ≠ C1 across orbit→straight.
      return [
        phase.from[0] + (phase.to[0] - phase.from[0]) * e,
        phase.from[1] + (phase.to[1] - phase.from[1]) * e,
        phase.from[2] + (phase.to[2] - phase.from[2]) * e,
      ]
    }
    case 'spiral': {
      // Radius shrinks via `e`; angle progresses uniformly. Initial velocity
      // has BOTH a radial component (∝ e'(0)) and a tangential component
      // (∝ angular speed × radius). Tangential is always nonzero at sIn=0.
      // So even with smoothstep, spiral entry has a baseline tangential
      // velocity that won't match a stopped (smoothstep-ended) straight.
      const radius = phase.startRadius * (1 - e)
      const theta = phase.startAngle + 2 * Math.PI * phase.revolutions * sIn
      return [
        phase.orbitCenter[0] + radius * Math.cos(theta),
        phase.orbitCenter[1] + radius * Math.sin(theta),
        phase.orbitCenter[2],
      ]
    }
  }
}

// Numerical tangent (dP/ds) via central finite-difference. Cheap and good
// enough for the prototype — analytic tangents per phase type would be
// ~5x faster but require derivatives we'd have to recompute on every
// phase shape tweak. This prototype's value is in the EXPERIMENTAL surface,
// not perf.
function tangent(phase: Phase, sIn: number, blend: BlendMode): [number, number, number] {
  const eps = 1e-3
  const a = evaluatePhase(phase, Math.max(0, sIn - eps), blend)
  const b = evaluatePhase(phase, Math.min(1, sIn + eps), blend)
  const denom = Math.min(1, sIn + eps) - Math.max(0, sIn - eps)
  return [(b[0] - a[0]) / denom, (b[1] - a[1]) / denom, (b[2] - a[2]) / denom]
}

// Cubic Hermite basis (Wikipedia / Pomax / geometry-blending.md):
//   p(u) = (2u³-3u²+1)·P₀ + (u³-2u²+u)·m₀
//        + (-2u³+3u²)·P₁  + (u³-u²)·m₁
// with u ∈ [0, 1]. m₀, m₁ are tangents IN u-SPACE (dP/du at endpoints).
function hermiteCubic(
  u: number,
  P0: [number, number, number], P1: [number, number, number],
  m0: [number, number, number], m1: [number, number, number],
): [number, number, number] {
  const u2 = u * u, u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2
  return [
    h00 * P0[0] + h10 * m0[0] + h01 * P1[0] + h11 * m1[0],
    h00 * P0[1] + h10 * m0[1] + h01 * P1[1] + h11 * m1[1],
    h00 * P0[2] + h10 * m0[2] + h01 * P1[2] + h11 * m1[2],
  ]
}

// Top-level frame evaluator. When the current phase's incoming blend is
// 'hermite' AND we're inside the boundary window, the position comes from
// a cubic Hermite curve that explicitly matches:
//   P₀ = previous phase's exit position (s=1 of prev)
//   m₀ = previous phase's exit tangent  (in s-space) × HERMITE_WINDOW_S
//   P₁ = current phase's natural pos at s=HERMITE_WINDOW_S (sharp body)
//   m₁ = current phase's natural tangent at s=HERMITE_WINDOW_S × window
//
// The × window scaling converts dP/ds tangents to dP/du tangents because
// u = sInPhase / HERMITE_WINDOW_S. C1 at both endpoints is by construction.
function frameAt(t: number, blends: BlendMode[]): [number, number, number] {
  const phaseIdx = Math.min(PHASES.length - 1, Math.floor(t / PHASE_DURATION_S))
  const sInPhase = (t - phaseIdx * PHASE_DURATION_S) / PHASE_DURATION_S
  const blend: BlendMode = phaseIdx === 0 ? 'sharp' : blends[phaseIdx - 1]

  if (phaseIdx > 0 && sInPhase < HERMITE_WINDOW_S && blend === 'hermite') {
    const u = sInPhase / HERMITE_WINDOW_S
    const prevPhase = PHASES[phaseIdx - 1]
    const currPhase = PHASES[phaseIdx]
    const prevBlend: BlendMode = phaseIdx === 1 ? 'sharp' : blends[phaseIdx - 2]
    // Body of any hermite phase is sharp; otherwise its declared blend.
    const prevBodyBlend: BlendMode = prevBlend === 'hermite' ? 'sharp' : prevBlend
    const P0 = evaluatePhase(prevPhase, 1, prevBodyBlend)
    const v0 = tangent(prevPhase, 1, prevBodyBlend)
    const P1 = evaluatePhase(currPhase, HERMITE_WINDOW_S, 'sharp')
    const v1 = tangent(currPhase, HERMITE_WINDOW_S, 'sharp')
    const m0: [number, number, number] = [v0[0] * HERMITE_WINDOW_S, v0[1] * HERMITE_WINDOW_S, v0[2] * HERMITE_WINDOW_S]
    const m1: [number, number, number] = [v1[0] * HERMITE_WINDOW_S, v1[1] * HERMITE_WINDOW_S, v1[2] * HERMITE_WINDOW_S]
    return hermiteCubic(u, P0, P1, m0, m1)
  }

  return evaluatePhase(PHASES[phaseIdx], sInPhase, blend)
}

type Metrics = {
  t: number
  phaseIdx: number
  sInPhase: number
  pos: [number, number, number]
  velMag: number
  dVel: number
  peakVel: number
}

function ProtoElectron({
  blendsRef,
  metricsRef,
  boundaryRatiosRef,
}: {
  blendsRef: React.MutableRefObject<BlendMode[]>
  metricsRef: React.MutableRefObject<Metrics | null>
  // Worst-observed Δ|v|/peak ratio per boundary, captured at the frame
  // immediately AFTER the phaseIdx changes. Persists across frames so the
  // chip shows the loop's worst-case reading rather than the live value.
  boundaryRatiosRef: React.MutableRefObject<[number, number, number]>
}) {
  const headRef = useRef<THREE.Mesh>(null!)
  const trailRef = useRef<THREE.BufferGeometry>(null!)
  const tRef = useRef(0)
  const lastPosRef = useRef<[number, number, number]>([1, 0, 0])
  const lastVelMagRef = useRef(0)
  const peakVelRef = useRef(0)
  const lastPhaseIdxRef = useRef(0)
  // Skip velocity sampling for the first N frames after mount or reset.
  // Avoids R3F's first-frame delta wonkiness (sometimes near-zero, which
  // would divide |Δpos| by a tiny dt and produce a stale peak that
  // permanently pins the chip ratios at 0%).
  const velWarmupRef = useRef(3)
  // Persistent positions buffer for the trail — reused across frames so
  // the polyline shows accumulated history through phase boundaries.
  const trailPositionsRef = useRef<Float32Array>(new Float32Array(TRAIL_LENGTH * 3))
  const trailFilledRef = useRef(0)

  useEffect(() => {
    // Initialize the trail BufferGeometry's position attribute once. We
    // mutate the underlying Float32Array in-place each frame and only
    // call needsUpdate=true; never reallocate.
    const geo = trailRef.current
    if (!geo) return
    geo.setAttribute('position', new THREE.BufferAttribute(trailPositionsRef.current, 3))
    geo.setDrawRange(0, 0)
  }, [])

  useFrame((_, delta) => {
    // Floor at 1/240 (4ms) so a tiny first-frame delta can't divide
    // a finite Δpos and produce a 60+ velocity spike that pins peakVel.
    const dt = Math.max(1 / 240, Math.min(delta, 1 / 30))
    tRef.current += dt
    if (tRef.current >= TOTAL_DURATION_S) {
      tRef.current = 0
      // Reset trail + per-boundary worst readings when the loop restarts
      // so a fresh loop after a blend change isn't shadowed by stale data.
      // Also re-anchor lastPos to phase-0-start (1, 0, 0) — without this,
      // the next frame's finite-difference would span phase-3-end → phase-0-start
      // (a ~1-unit jump in one frame ≈ 60 unit/s spike) and lock peakVel high,
      // which makes every boundary chip read ~0% even when it's actually 30%+.
      trailFilledRef.current = 0
      peakVelRef.current = 0
      boundaryRatiosRef.current = [0, 0, 0]
      lastPhaseIdxRef.current = 0
      lastPosRef.current = [1, 0, 0]
      lastVelMagRef.current = 0
      velWarmupRef.current = 3
    }

    const t = tRef.current
    const phaseIdx = Math.min(PHASES.length - 1, Math.floor(t / PHASE_DURATION_S))
    const sInPhase = (t - phaseIdx * PHASE_DURATION_S) / PHASE_DURATION_S
    const blends = blendsRef.current
    const [x, y, z] = frameAt(t, blends)

    headRef.current.position.set(x, y, z)

    // Frame-by-frame velocity via finite-difference. Magnitude only —
    // direction would need a vector readout that's noisier to interpret.
    const lp = lastPosRef.current
    const dx = x - lp[0]
    const dy = y - lp[1]
    const dz = z - lp[2]
    const velMag = Math.hypot(dx, dy, dz) / dt
    const dVel = velMag - lastVelMagRef.current

    // Skip peak / boundary updates during the warmup window so a wonky
    // first-frame doesn't lock peakVel high. Position + trail still draw.
    const warmingUp = velWarmupRef.current > 0
    if (warmingUp) {
      velWarmupRef.current -= 1
    } else {
      if (velMag > peakVelRef.current) peakVelRef.current = velMag

      // Boundary capture: when phaseIdx just changed (this is the first
      // frame of a new phase), the |dVel| measured against the previous
      // frame IS the boundary discontinuity. Record it as the worst-so-far
      // for that boundary index (boundaryIdx = phaseIdx - 1).
      if (phaseIdx !== lastPhaseIdxRef.current && phaseIdx > 0 && phaseIdx <= 3) {
        const boundaryIdx = phaseIdx - 1
        const ratio = peakVelRef.current > 0 ? Math.abs(dVel) / peakVelRef.current : 0
        const stored = boundaryRatiosRef.current[boundaryIdx]
        if (ratio > stored) {
          const next: [number, number, number] = [...boundaryRatiosRef.current]
          next[boundaryIdx] = ratio
          boundaryRatiosRef.current = next
        }
      }
    }
    lastPhaseIdxRef.current = phaseIdx

    metricsRef.current = {
      t,
      phaseIdx,
      sInPhase,
      pos: [x, y, z],
      velMag,
      dVel,
      peakVel: peakVelRef.current,
    }

    // Append to trail (ring fill until full, then stop appending — the
    // trail captures one full loop, then the loop reset clears it).
    const filled = trailFilledRef.current
    if (filled < TRAIL_LENGTH) {
      const buf = trailPositionsRef.current
      buf[filled * 3] = x
      buf[filled * 3 + 1] = y
      buf[filled * 3 + 2] = z
      trailFilledRef.current = filled + 1
      const geo = trailRef.current
      if (geo) {
        const attr = geo.getAttribute('position') as THREE.BufferAttribute
        attr.needsUpdate = true
        geo.setDrawRange(0, filled + 1)
      }
    }

    lastPosRef.current = [x, y, z]
    lastVelMagRef.current = velMag
  })

  return (
    <>
      <line>
        <bufferGeometry ref={trailRef} />
        <lineBasicMaterial color="#ff4d4d" toneMapped={false} />
      </line>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </>
  )
}

function NucleusSphere() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.04, 16, 16]} />
      <meshBasicMaterial color="#4d9eff" toneMapped={false} />
    </mesh>
  )
}

// Updates the readout <pre> element via direct DOM write at ~30 Hz so we
// don't render-storm React. Reads metricsRef inside its own RAF loop.
// Same loop also syncs boundary-ratios into React state at ~4 Hz so the
// chip strip re-renders at low frequency without spamming reconciliation.
function useReadoutPump(
  metricsRef: React.MutableRefObject<Metrics | null>,
  preRef: React.RefObject<HTMLPreElement | null>,
  boundaryRatiosRef: React.MutableRefObject<[number, number, number]>,
  setBoundaryRatios: (r: [number, number, number]) => void,
) {
  useEffect(() => {
    let rafId = 0
    let lastWriteMs = 0
    let lastChipMs = 0
    const tick = (now: number) => {
      if (now - lastWriteMs > 33) {
        const m = metricsRef.current
        const pre = preRef.current
        if (m && pre) {
          const phaseLabel = PHASE_LABELS[m.phaseIdx]
          // Highlight when we're within ±2 frames of a phase boundary
          const sFromBoundary = Math.min(m.sInPhase, 1 - m.sInPhase)
          const nearBoundary = sFromBoundary < 0.034 // ~2 frames @ 60fps
          const ratio = m.peakVel > 0 ? Math.abs(m.dVel) / m.peakVel : 0
          pre.textContent =
            `t=${m.t.toFixed(3)}s  phase=${m.phaseIdx} ${phaseLabel}\n` +
            `s=${m.sInPhase.toFixed(3)}\n` +
            `pos=(${m.pos[0].toFixed(3)}, ${m.pos[1].toFixed(3)}, ${m.pos[2].toFixed(3)})\n` +
            `|v|=${m.velMag.toFixed(3)}  Δ|v|=${m.dVel >= 0 ? '+' : ''}${m.dVel.toFixed(3)}\n` +
            `peak |v|=${m.peakVel.toFixed(3)}\n` +
            `Δ|v| / peak = ${(ratio * 100).toFixed(1)}%${nearBoundary ? '   ← AT BOUNDARY' : ''}`
        }
        lastWriteMs = now
      }
      if (now - lastChipMs > 250) {
        const r = boundaryRatiosRef.current
        setBoundaryRatios([r[0], r[1], r[2]])
        lastChipMs = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [metricsRef, preRef, boundaryRatiosRef, setBoundaryRatios])
}

// Pass criterion locked at 5% (eye-perceptible velocity discontinuity).
// 5–20% is observable but borderline; ≥20% is a clear kink.
const PASS_RATIO = 0.05
const WARN_RATIO = 0.20

function ratioVerdict(ratio: number): 'pass' | 'warn' | 'fail' | 'idle' {
  if (ratio === 0) return 'idle'
  if (ratio < PASS_RATIO) return 'pass'
  if (ratio < WARN_RATIO) return 'warn'
  return 'fail'
}

function BoundaryChip({ idx, ratio }: { idx: number; ratio: number }) {
  const verdict = ratioVerdict(ratio)
  const cls = `${s.chip} ${s[`chip_${verdict}`]}`
  const label = verdict === 'idle' ? '—' : `${(ratio * 100).toFixed(1)}%`
  return (
    <span className={cls} title={`Boundary B${idx + 1} worst Δ|v|/peak this loop`}>
      <span className={s.chipKey}>B{idx + 1}</span>
      <span className={s.chipValue}>{label}</span>
    </span>
  )
}

const PHASE_LABELS = ['circle-orbit', 'ellipse-stretch', 'straight', 'spiral']

const BOUNDARY_LABELS = [
  'B1: orbit → ellipse-stretch (controls ellipse radius easing)',
  'B2: ellipse → straight (controls straight lerp easing)',
  'B3: straight → spiral (controls spiral radius easing)',
]

function BlendSelect({
  idx,
  value,
  onChange,
}: {
  idx: number
  value: BlendMode
  onChange: (v: BlendMode) => void
}) {
  return (
    <label className={s.field}>
      <span className={s.fieldLabel}>{BOUNDARY_LABELS[idx]}</span>
      <select
        className={s.select}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as BlendMode)}
      >
        {BLEND_MODES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </label>
  )
}

export function LabsAtomBlend() {
  const [b1, setB1] = useState<BlendMode>('smoothstep')
  const [b2, setB2] = useState<BlendMode>('smoothstep')
  const [b3, setB3] = useState<BlendMode>('smoothstep')
  const [showNucleus, setShowNucleus] = useState(true)
  const blendsRef = useRef<BlendMode[]>([b1, b2, b3])
  const boundaryRatiosRef = useRef<[number, number, number]>([0, 0, 0])
  const [boundaryRatios, setBoundaryRatios] = useState<[number, number, number]>([0, 0, 0])
  // Mirror current blends into the ref. Pure ref-write; the chip reset
  // happens in the user-facing setter wrapper (resetReadings) below to
  // avoid a setState-in-effect.
  useEffect(() => { blendsRef.current = [b1, b2, b3] }, [b1, b2, b3])
  const metricsRef = useRef<Metrics | null>(null)
  const preRef = useRef<HTMLPreElement | null>(null)
  useReadoutPump(metricsRef, preRef, boundaryRatiosRef, setBoundaryRatios)

  // Reset chip readings whenever the user changes any blend — otherwise
  // the worst-case from the previous setting lingers and reads stale.
  // Done in response to user action (not via effect) so it doesn't trip
  // react-hooks/set-state-in-effect.
  const resetReadings = () => {
    boundaryRatiosRef.current = [0, 0, 0]
    setBoundaryRatios([0, 0, 0])
  }
  const setBlend = (idx: 0 | 1 | 2, mode: BlendMode) => {
    if (idx === 0) setB1(mode)
    if (idx === 1) setB2(mode)
    if (idx === 2) setB3(mode)
    resetReadings()
  }
  // Apply one blend mode to all three boundaries — quick A/B testing.
  const setAll = (mode: BlendMode) => {
    setB1(mode); setB2(mode); setB3(mode)
    resetReadings()
  }

  // Memo'd Canvas children to keep the React tree stable across blend changes
  // (blends propagate via ref, not props, so the Canvas body doesn't re-render).
  const sceneChildren = useMemo(() => (
    <>
      <ProtoElectron
        blendsRef={blendsRef}
        metricsRef={metricsRef}
        boundaryRatiosRef={boundaryRatiosRef}
      />
      {showNucleus && <NucleusSphere />}
      <axesHelper args={[1.6]} />
    </>
  ), [showNucleus])

  return (
    <div className={s.wrap}>
      <div className={s.canvasArea}>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 4.5], fov: 45, near: 0.1, far: 50 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        >
          {sceneChildren}
        </Canvas>
      </div>

      <aside className={s.panel}>
        <h1 className={s.h1}>Phase-blend math test</h1>
        <p className={s.lede}>
          Single electron through 4 phases (1s each, looping). Per-boundary
          select changes the easing of the SECOND phase's progression. Watch
          the red trail for kinks at boundaries; watch <code>Δ|v| / peak</code>
          for the velocity-discontinuity ratio. Pass criterion: &lt;5% at
          every boundary.
        </p>

        <h2 className={s.h2}>Boundary readings (worst Δ|v|/peak this loop)</h2>
        <div className={s.chipRow}>
          <BoundaryChip idx={0} ratio={boundaryRatios[0]} />
          <BoundaryChip idx={1} ratio={boundaryRatios[1]} />
          <BoundaryChip idx={2} ratio={boundaryRatios[2]} />
        </div>
        <p className={s.chipLegend}>green &lt;5%  ·  yellow 5–20%  ·  red ≥20%</p>

        <h2 className={s.h2}>Blend per boundary</h2>
        <BlendSelect idx={0} value={b1} onChange={(m) => setBlend(0, m)} />
        <BlendSelect idx={1} value={b2} onChange={(m) => setBlend(1, m)} />
        <BlendSelect idx={2} value={b3} onChange={(m) => setBlend(2, m)} />

        <div className={s.row}>
          <span className={s.fieldLabel}>Apply to all:</span>
          {BLEND_MODES.map((m) => (
            <button key={m} type="button" className={s.miniBtn} onClick={() => setAll(m)}>
              {m}
            </button>
          ))}
        </div>

        <label className={`${s.field} ${s.fieldRow}`}>
          <input
            type="checkbox"
            checked={showNucleus}
            onChange={(e) => setShowNucleus(e.target.checked)}
          />
          <span className={s.fieldLabel}>Show nucleus (origin)</span>
        </label>

        <h2 className={s.h2}>Live readout</h2>
        <pre ref={preRef} className={s.readout}>
          (waiting for first frame…)
        </pre>

        <h2 className={s.h2}>Phase legend</h2>
        <ol className={s.legend}>
          <li><b>0 circle-orbit</b> r=1.0, 1 lap (no easing — uniform angular)</li>
          <li><b>1 ellipse-stretch</b> radii 1.0,1.0 → 1.4,0.85, 1 lap</li>
          <li><b>2 straight</b> (1.4,0) → (0.4,0.4) — pure lerp</li>
          <li><b>3 spiral</b> from (0.4,0.4) to (0,0), 1 rev</li>
        </ol>

        <h2 className={s.h2}>Expected reading (pre-test prediction)</h2>
        <ul className={s.legend}>
          <li><b>B1 smoothstep</b> ≈ C1 — orbit and ellipse share angular velocity at the seam; only radii change, and smoothstep zeros that derivative</li>
          <li><b>B2 smoothstep</b> ≠ C1 — ellipse exits with nonzero tangent; lerp+smoothstep starts at rest</li>
          <li><b>B3 smoothstep</b> ≠ C1 — straight ends at rest; spiral entry has baseline tangential velocity</li>
          <li><b>any boundary, hermite</b> ≈ C1 — Hermite cubic over an
            80ms window explicitly matches both endpoint tangents.
            Pass criterion: Δ|v|/peak should drop to ~0% at every boundary
            with hermite selected. Trade-off: phase body becomes linear
            (lerp/uniform-orbit), so visual character of cubic eased
            radius-shrinks etc. is lost in the body.
          </li>
        </ul>
      </aside>
    </div>
  )
}
