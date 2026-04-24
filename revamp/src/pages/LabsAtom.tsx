import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import s from './LabsAtom.module.css'

extend({ MeshLineGeometry, MeshLineMaterial })

declare module '@react-three/fiber' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements {
    meshLineGeometry: object
    meshLineMaterial: object
  }
}

type Plane = 'xy' | 'yz' | 'xz'
type OrbitConfig = {
  plane: Plane
  speed: number
  phase: number
  laps: number
  // How visible the electron stays after it lands + flashes. 0 = disappears
  // after the flash. 0.33 = stays dim over the i-dot. 1 = stays fully lit.
  postLandVisibility: number
  // Optional spiral-in overrides. Default: SETTLE_DURATION_T + easeOutCubic
  // — a fast inward pull that decelerates toward the target. Set these on
  // an orbit that needs a smoother blend from orbit to spiral (e.g. start
  // the spiral earlier via `laps`, widen it via settleDurationT, and swap
  // to smoothstep so velocity is continuous at the transition boundary).
  settleDurationT?: number
  settleEase?: 'outCubic' | 'smoothstep'
}

const RADIUS_A = 1.40
const RADIUS_B = 0.85
const ORBIT_SPEED = 3.30
const ORBITS: OrbitConfig[] = [
  { plane: 'xy', speed: ORBIT_SPEED, phase: 0,                 laps: 3,   postLandVisibility: 0 },
  { plane: 'yz', speed: ORBIT_SPEED, phase: (2 * Math.PI) / 3, laps: 5,   postLandVisibility: 0.33 },
  // Final electron gets a gentler spiral — starts half a lap earlier
  // (6.0 instead of 6.5) and takes 1.5× as long (3π instead of 2π),
  // with smoothstep easing so the orbit→spiral handoff has no velocity
  // discontinuity. Total-time-to-land stays 7.5 laps (6.0 + 1.5, same
  // as the old 6.5 + 1) so the strike timing still aligns.
  {
    plane: 'xz',
    speed: ORBIT_SPEED,
    phase: (4 * Math.PI) / 3,
    laps: 6.0,
    postLandVisibility: 1,
    settleDurationT: 3 * Math.PI,
    settleEase: 'smoothstep',
  },
]

const ELECTRON_COLOR = '#ffffff'

/* Duration of the .aiPulse strike-flicker. Must match the aiStrikeN
   keyframe animation duration in LabsAtom.module.css — the JS timer
   here is what clears the pulsing class so the CSS transition can
   re-engage and fade/hold the text back to its rest state. */
const PULSE_DURATION_MS = 560

// Strike 1 is a subtle tap, 2 lands harder, 3+ is the full slam. More
// than three strikes would stay at .aiPulse3.
function pulseClassForStrike(strike: number, s: Record<string, string>): string {
  if (strike <= 1) return s.aiPulse1
  if (strike === 2) return s.aiPulse2
  return s.aiPulse3
}

const N_TRAIL = 96
const ARC = Math.PI * 0.62

// Settle parameters — for the "lands on the i-dot" composition.
const SETTLE_DURATION_T = 2 * Math.PI         // 1 lap to spiral in
// How far before actual landing the strike flash fires. At ORBIT_SPEED
// 3.30, 0.5 t-units ≈ 150ms real time — enough for the first keyframe
// peak (10% of 560ms = 56ms in) to fire before impact, so the text is
// already mid-flicker when the electron hits the i-dot.
const STRIKE_LEAD_T = 0.5
// After the final electron lands + the pulse completes, hold the 'ai'
// at full glow for a beat, then decay the white glow stack to zero so
// the wordmark resolves to clean flat white text and the scene settles.
const POST_STRIKE_HOLD_MS = 700
const GLOW_DECAY_MS = 1500

// After each electron's post-pulse rest, hold briefly then fade both
// the electron body and its halo to zero. At ORBIT_SPEED 3.30 these
// t-units map to ~700ms hold + ~1500ms fade, matching the CSS
// glow-stack decay so the 3D scene + text resolve together to a
// crisp flat-white wordmark with nothing overlaid on the i-dot.
const POST_LAND_HOLD_T = 2.3
const POST_LAND_FADE_T = 5.0

// Scene-wide group rotation applied around the atom. Exposed so target
// world→local conversion in AtomComposition matches exactly.
const GROUP_ROTATION: [number, number, number] = [Math.PI / 4, Math.PI / 4, 0]

function orbitPos(t: number, plane: Plane): [number, number, number] {
  const c = Math.cos(t), sn = Math.sin(t)
  if (plane === 'xy') return [RADIUS_A * c, RADIUS_B * sn, 0]
  if (plane === 'yz') return [0, RADIUS_A * c, RADIUS_B * sn]
  return [RADIUS_A * c, 0, RADIUS_B * sn]
}

// Same orbit but with a shifted center and scaled radii — the settling
// path morphs from the original orbit (center=0, scale=1) to a zero-radius
// orbit collapsed on the target (center=target, scale=0). Electron keeps
// spinning through t as the orbit deforms, so its path is a smooth organic
// spiral rather than a straight-line dash.
function orbitPosMorphed(
  t: number,
  plane: Plane,
  cx: number, cy: number, cz: number,
  scale: number,
): [number, number, number] {
  const c = Math.cos(t), sn = Math.sin(t)
  if (plane === 'xy') return [cx + RADIUS_A * scale * c, cy + RADIUS_B * scale * sn, cz]
  if (plane === 'yz') return [cx, cy + RADIUS_A * scale * c, cz + RADIUS_B * scale * sn]
  return [cx + RADIUS_A * scale * c, cy, cz + RADIUS_B * scale * sn]
}

function makeFadeTexture() {
  const n = 128
  const data = new Uint8Array(n * 4)
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1)
    const a = Math.pow(x, 2.2) * 255
    data[i * 4] = 255
    data[i * 4 + 1] = 255
    data[i * 4 + 2] = 255
    data[i * 4 + 3] = a
  }
  const tex = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3)
}

// Smoothstep — zero derivative at both ends, so the orbit→spiral
// transition has no velocity discontinuity (gradual pull-in instead of
// the sharp inward snap easeOutCubic produces at p≈0).
function smoothstep(x: number): number {
  return x * x * (3 - 2 * x)
}

function Electron({
  config,
  fadeTex,
  color,
  settleTarget,
  settle,
  onLand,
  onStrike,
}: {
  config: OrbitConfig
  fadeTex: THREE.DataTexture
  color: string
  settleTarget?: THREE.Vector3
  settle?: boolean
  onLand?: () => void
  onStrike?: () => void
}) {
  const settleAfterT = settle ? config.laps * 2 * Math.PI : undefined
  const settleDurT = config.settleDurationT ?? SETTLE_DURATION_T
  const settleEaseFn = config.settleEase === 'smoothstep' ? smoothstep : easeOutCubic
  const landedRef = useRef(false)
  const struckRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geomRef = useRef<any>(null!)
  const headRef = useRef<THREE.Mesh>(null!)
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const tRef = useRef(config.phase)
  const { size } = useThree()
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  )

  // Ring-buffer of recent world positions (pre-rotation, since we're inside
  // the rotated group) — used for the trail. Initialized with a history
  // along the orbit behind the starting phase so the trail is visible on
  // first frame.
  const bufRef = useRef<Float32Array | null>(null)
  const insertIdxRef = useRef(0)
  if (!bufRef.current) {
    const buf = new Float32Array(N_TRAIL * 3)
    for (let i = 0; i < N_TRAIL; i++) {
      const tSample = config.phase - ARC + (ARC * i) / (N_TRAIL - 1)
      const [x, y, z] = orbitPos(tSample, config.plane)
      buf[i * 3] = x
      buf[i * 3 + 1] = y
      buf[i * 3 + 2] = z
    }
    bufRef.current = buf
    insertIdxRef.current = 0
  }

  useFrame((_, delta) => {
    const d = Math.min(delta, 1 / 30) * config.speed
    tRef.current += d
    const t = tRef.current

    let hx: number, hy: number, hz: number

    if (settleTarget && settleAfterT !== undefined && t >= settleAfterT) {
      // Orbit-morphing settle: center slides from origin → target while
      // radii scale from 1 → 0, eased. Electron keeps advancing through
      // t, tracing a smooth spiral into the target point. Duration +
      // easing are per-orbit (see OrbitConfig).
      const p = Math.min(1, (t - settleAfterT) / settleDurT)
      const e = settleEaseFn(p)
      const cx = settleTarget.x * e
      const cy = settleTarget.y * e
      const cz = settleTarget.z * e
      const scale = 1 - e
      const pos = orbitPosMorphed(t, config.plane, cx, cy, cz, scale)
      hx = pos[0]; hy = pos[1]; hz = pos[2]
    } else {
      const p = orbitPos(t, config.plane)
      hx = p[0]; hy = p[1]; hz = p[2]
    }

    headRef.current.position.set(hx, hy, hz)

    // Insert into ring buffer at current index, advance index.
    const buf = bufRef.current!
    const idx = insertIdxRef.current
    buf[idx * 3] = hx
    buf[idx * 3 + 1] = hy
    buf[idx * 3 + 2] = hz
    insertIdxRef.current = (idx + 1) % N_TRAIL

    // Unroll buffer to a contiguous "oldest → newest" array for meshline.
    const unroll = new Float32Array(N_TRAIL * 3)
    for (let i = 0; i < N_TRAIL; i++) {
      const src = (insertIdxRef.current + i) % N_TRAIL
      unroll[i * 3] = buf[src * 3]
      unroll[i * 3 + 1] = buf[src * 3 + 1]
      unroll[i * 3 + 2] = buf[src * 3 + 2]
    }
    if (geomRef.current?.setPoints) {
      geomRef.current.setPoints(unroll)
    }

    // Post-land behavior is driven per-orbit via postLandVisibility:
    //   0    → flash, then electron disappears (first to land)
    //   0.33 → flash, then stays dim at 33% opacity over i-dot (second)
    //   1    → flash, then stays fully lit forever (third, final)
    // Halo is pumped to fully swallow the i-dot silhouette.
    const POST_SCALE = 1.45
    const POST_HALO_SCALE = 2.6
    const POST_HALO_OPACITY = 0.5
    const vis = config.postLandVisibility
    let electronScale = 1
    let electronOpacity = 1
    let haloScale = 0.0001
    let haloOpacity = 0
    if (settleTarget && settleAfterT !== undefined) {
      const doneT = settleAfterT + settleDurT
      const PULSE_T = Math.PI * 0.7
      // Strike fires slightly before landing so the flash stutter is
      // already mid-cycle when the electron actually hits the i-dot.
      if (t >= doneT - STRIKE_LEAD_T && !struckRef.current) {
        struckRef.current = true
        if (onStrike) onStrike()
      }
      if (t >= doneT && !landedRef.current) {
        landedRef.current = true
        if (onLand) onLand()
      }
      const postScale = vis > 0 ? POST_SCALE : 1
      const postHaloScale = vis > 0 ? POST_HALO_SCALE : 0.0001
      if (t >= doneT + PULSE_T) {
        // Post-pulse rest — hold at full post-land visibility, then
        // fade electron body + halo to zero so the final resting state
        // on the i-dot is nothing (no dot overlay, no halo, just the
        // crisp typographic 'ai' underneath).
        const elapsedAfterPulse = t - (doneT + PULSE_T)
        let fadeMult = 1
        if (elapsedAfterPulse > POST_LAND_HOLD_T) {
          const p = Math.min(1, (elapsedAfterPulse - POST_LAND_HOLD_T) / POST_LAND_FADE_T)
          fadeMult = 1 - easeOutCubic(p)
        }
        electronScale = postScale
        electronOpacity = vis * fadeMult
        haloScale = postHaloScale
        haloOpacity = POST_HALO_OPACITY * vis * fadeMult
      } else if (t >= doneT) {
        // Pulse window — full-intensity flash, ramps toward vis by p=1.
        const p = (t - doneT) / PULSE_T
        const pulse = Math.sin(p * Math.PI)
        electronScale = 1 + pulse * 0.5 + p * (postScale - 1)
        electronOpacity = 1 + p * (vis - 1)            // 1 → vis over pulse
        haloScale = 1 + p * (postHaloScale - 1)
        haloOpacity = pulse * 0.35 + p * POST_HALO_OPACITY * vis
      }
    }
    headRef.current.scale.setScalar(electronScale)
    if (headMatRef.current) {
      headMatRef.current.opacity = electronOpacity
    }
    if (haloRef.current) {
      haloRef.current.position.set(hx, hy, hz)
      haloRef.current.scale.setScalar(haloScale)
    }
    if (haloMatRef.current) {
      haloMatRef.current.opacity = haloOpacity
    }
  })

  return (
    <>
      <mesh>
        <meshLineGeometry ref={geomRef} />
        <meshLineMaterial
          color={color}
          lineWidth={0.17}
          transparent
          depthWrite={false}
          alphaMap={fadeTex}
          useAlphaMap={1}
          toneMapped={false}
          resolution={resolution}
        />
      </mesh>
      <mesh ref={haloRef} scale={0.0001}>
        <sphereGeometry args={[0.050, 32, 32]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.050, 32, 32]} />
        <meshBasicMaterial
          ref={headMatRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={1}
        />
      </mesh>
    </>
  )
}

function Scene({
  color,
  onlyPlane,
  settleTarget,
  settle,
  onLand,
  onStrike,
}: {
  color: string
  onlyPlane?: Plane
  settleTarget?: THREE.Vector3
  settle?: boolean
  onLand?: () => void
  onStrike?: () => void
}) {
  const fadeTex = useMemo(() => makeFadeTexture(), [])
  const orbits = onlyPlane ? ORBITS.filter((o) => o.plane === onlyPlane) : ORBITS
  return (
    <group rotation={GROUP_ROTATION}>
      {orbits.map((o) => (
        <Electron
          key={`e-${o.plane}`}
          config={o}
          fadeTex={fadeTex}
          color={color}
          settleTarget={settleTarget}
          settle={settle}
          onLand={onLand}
          onStrike={onStrike}
        />
      ))}
    </group>
  )
}

// Project a CSS-pixel point on the canvas to a world coordinate at z=0,
// then invert the group rotation to get local coordinates the Electron
// mesh can use directly. Camera at (0,0,11), fov 38°, aspect follows
// canvas DOM rect. Pure math, no three.js scene dependency.
function projectPixelToLocal(
  dotPageX: number,
  dotPageY: number,
  canvasRect: DOMRect,
  camZ: number,
): THREE.Vector3 {
  const dx = dotPageX - (canvasRect.left + canvasRect.width / 2)
  const dy = dotPageY - (canvasRect.top + canvasRect.height / 2)

  const fovRad = (38 * Math.PI) / 180
  const viewHeight = 2 * camZ * Math.tan(fovRad / 2)
  const aspect = canvasRect.width / canvasRect.height
  const viewWidth = viewHeight * aspect

  const worldX = dx * (viewWidth / canvasRect.width)
  const worldY = -dy * (viewHeight / canvasRect.height)

  const world = new THREE.Vector3(worldX, worldY, 0)
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(GROUP_ROTATION[0], GROUP_ROTATION[1], GROUP_ROTATION[2], 'XYZ'),
  )
  return world.applyMatrix4(rotationMatrix.invert())
}

export // Flash-only style. On light bg (default): rest is debossed dark;
// strike snaps white with glow. On dark bg (`onDark`): rest is a soft
// white-gray, strike pumps to full white + glow. Both return to rest
// via the CSS transition after the 560ms pulse. `compact` (topbar)
// drops the multi-layer glow stack — the wordmark reads flat against
// the chrome band instead of halo'd. `glowMultiplier` (0..1) scales
// only the white glow stack so the post-final-strike decay can fade
// the halo to zero while the text stays lit white.
function buildAiStyle(
  progress: number,
  onDark: boolean,
  compact: boolean,
  glowMultiplier: number,
): CSSProperties {
  const g = progress
  const gm = glowMultiplier
  if (onDark) {
    const alpha = 0.55 + g * 0.4
    const embossAlpha = (1 - g) * 0.18
    return {
      color: `rgba(235, 235, 235, ${alpha.toFixed(3)})`,
      textShadow: compact
        ? 'none'
        : [
            `0 1px 1px rgba(255, 255, 255, ${embossAlpha.toFixed(3)})`,
            `0 0 3px rgba(255, 255, 255, ${(0.9 * g * gm).toFixed(3)})`,
            `0 0 6px rgba(255, 255, 255, ${(0.65 * g * gm).toFixed(3)})`,
            `0 0 12px rgba(255, 255, 255, ${(0.4 * g * gm).toFixed(3)})`,
            `0 0 22px rgba(255, 255, 255, ${(0.2 * g * gm).toFixed(3)})`,
          ].join(', '),
    }
  }
  const gray = 255 * g
  const colorAlpha = 0.28 + g * 0.7
  const debossAlpha = (1 - g) * 0.14
  return {
    color: `rgba(${gray}, ${gray}, ${gray}, ${colorAlpha})`,
    textShadow: compact
      ? 'none'
      : [
          `0 -1px 1px rgba(0, 0, 0, ${debossAlpha.toFixed(3)})`,
          `0 0 3px rgba(255, 255, 255, ${(0.9 * g * gm).toFixed(3)})`,
          `0 0 6px rgba(255, 255, 255, ${(0.65 * g * gm).toFixed(3)})`,
          `0 0 12px rgba(255, 255, 255, ${(0.4 * g * gm).toFixed(3)})`,
          `0 0 22px rgba(255, 255, 255, ${(0.2 * g * gm).toFixed(3)})`,
        ].join(', '),
  }
}

export function AtomComposition({
  onlyPlane,
  settle,
  compact,
  onDark,
}: {
  onlyPlane?: Plane
  settle?: boolean
  compact?: boolean
  onDark?: boolean
}) {
  const aiRef = useRef<HTMLSpanElement>(null)
  const iRef = useRef<HTMLSpanElement>(null)
  const atomLayerRef = useRef<HTMLDivElement>(null)
  const cellRef = useRef<HTMLDivElement>(null)
  const [aiHalf, setAiHalf] = useState(0)
  const [atomLeft, setAtomLeft] = useState<number | null>(null)
  const [settleTarget, setSettleTarget] = useState<THREE.Vector3 | null>(null)
  const [strikeCount, setStrikeCount] = useState(0)
  const [landedCount, setLandedCount] = useState(0)
  const [pulsing, setPulsing] = useState(false)
  const [glowMultiplier, setGlowMultiplier] = useState(1)

  // Camera closer for the compact logo so the atom fills the smaller canvas.
  const camZ = compact ? 5.5 : 11
  const totalElectrons = onlyPlane ? 1 : ORBITS.length

  // Strike fires slightly before landing (see STRIKE_LEAD_T) so the
  // stutter is already mid-cycle when the dot hits the i. The separate
  // landedCount drives the allLanded / permanent-lit logic on the
  // actual landing beat, after the strike has begun.
  const onStrike = useCallback(() => {
    setStrikeCount((c) => c + 1)
  }, [])
  const onLand = useCallback(() => {
    setLandedCount((c) => c + 1)
  }, [])

  // On each landing, fire the .aiPulse flash. 'ai' snaps bright +
  // flickers, then CSS transition either fades it back to debossed
  // (intermediate strikes) or leaves it at full brightness (final strike,
  // when allLanded below is true).
  useEffect(() => {
    if (strikeCount === 0) return
    setPulsing(true)
    const timer = setTimeout(() => setPulsing(false), PULSE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [strikeCount])

  // Once every electron has landed, 'ai' stays lit permanently —
  // post-final-strike the progress doesn't decay to debossed.
  const allLanded = settle === true && landedCount >= totalElectrons
  const progress = pulsing ? 1 : allLanded ? 1 : 0

  // After the final landing + a short hold at full glow, decay the
  // white glow stack to zero so the wordmark resolves to clean flat
  // white text. Compact (topbar) has no glow to decay — skip.
  useEffect(() => {
    if (!allLanded || compact) return
    let rafId: number | undefined
    const holdTimer = setTimeout(() => {
      const startTime = performance.now()
      const tick = (now: number) => {
        const elapsed = now - startTime
        const p = Math.min(1, elapsed / GLOW_DECAY_MS)
        setGlowMultiplier(1 - easeOutCubic(p))
        if (p < 1) rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }, POST_STRIKE_HOLD_MS)
    return () => {
      clearTimeout(holdTimer)
      if (rafId !== undefined) cancelAnimationFrame(rafId)
    }
  }, [allLanded, compact])

  // First pass: measure 'ai' width + (compact only) the pixel offset of
  // ai's center within the cell, so the atom canvas's `left` can be set
  // to sit the atom's 3D origin over the 'ai' glyphs.
  useLayoutEffect(() => {
    function measure() {
      if (!aiRef.current) return
      const aiRect = aiRef.current.getBoundingClientRect()
      setAiHalf(aiRect.width / 2)
      if (compact && cellRef.current) {
        const cellRect = cellRef.current.getBoundingClientRect()
        setAtomLeft(aiRect.left + aiRect.width / 2 - cellRect.left)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [compact])

  // Second pass: measure i-dot target. For compact mode we wait for
  // atomLeft to be set (so the canvas has been repositioned over 'ai');
  // for labs mode we wait for aiHalf (so the wordmark has shifted).
  useLayoutEffect(() => {
    if (!settle) return
    if (compact && atomLeft === null) return
    if (!compact && aiHalf === 0) return
    if (!iRef.current || !atomLayerRef.current) return
    const iRect = iRef.current.getBoundingClientRect()
    const canvasRect = atomLayerRef.current.getBoundingClientRect()
    // Empirical font-metric nudges: observed landings sat slightly below
    // + slightly left of the visual i-dot. -2.5 on Y and +0.5 on X place
    // the landings right on the dot. Both are typeface-dependent; retune
    // on font swap.
    const dotX = iRect.left + iRect.width / 2 + 0.5
    const dotY = iRect.top + iRect.height * 0.32 - 2.5
    const local = projectPixelToLocal(dotX, dotY, canvasRect, camZ)
    setSettleTarget(local)
  }, [settle, aiHalf, atomLeft, compact, camZ])

  const cellClass         = compact ? s.cellCompact         : s.cell
  const atomLayerClass    = compact ? s.atomLayerCompact    : s.atomLayer
  const wordmarkLayerClass = compact ? s.wordmarkLayerCompact : s.wordmarkLayer
  const textShadowClass   = compact ? s.textShadowCompact   : s.textShadow
  // Compact layer is inline-flex, no absolute centering, so the JS offset
  // isn't needed — the wordmark sits at cell origin and flexes naturally.
  const wordmarkTransform = compact
    ? undefined
    : `translate(${-aiHalf}px, -50%)`

  return (
    <div ref={cellRef} className={cellClass}>
      <div
        ref={atomLayerRef}
        className={atomLayerClass}
        style={compact && atomLeft !== null ? { left: `${atomLeft}px` } : undefined}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, camZ], fov: 38, near: 0.1, far: 50 }}
          gl={{
            alpha: true,
            antialias: true,
            stencil: false,
            powerPreference: 'high-performance',
          }}
        >
          <Scene
            color={ELECTRON_COLOR}
            onlyPlane={onlyPlane}
            settleTarget={settleTarget ?? undefined}
            settle={settle}
            onLand={onLand}
            onStrike={onStrike}
          />
        </Canvas>
      </div>

      <div
        className={wordmarkLayerClass}
        style={wordmarkTransform ? { transform: wordmarkTransform } : undefined}
      >
        <div className={textShadowClass} aria-hidden="true" />
        <span
          ref={aiRef}
          className={`${s.ai} ${pulsing ? pulseClassForStrike(strikeCount, s) : ''}`}
          style={buildAiStyle(progress, onDark ?? false, compact ?? false, glowMultiplier)}
        >
          a<span ref={iRef}>i</span>
        </span>
        <span
          className={`${s.university} ${onDark ? s.universityDark : ''} ${compact ? s.universityCompact : ''}`}
        >
          University
        </span>
      </div>
    </div>
  )
}

export function LabsAtom() {
  return (
    <div className={s.wrap}>
      {/* Single-orbit test cells — kept as backup for debugging one
          electron at a time. Uncomment to compare side-by-side.
          <AtomComposition onlyPlane="xy" settle />
          <AtomComposition onlyPlane="yz" settle />
          <AtomComposition onlyPlane="xz" settle /> */}
      <AtomComposition settle />
    </div>
  )
}
