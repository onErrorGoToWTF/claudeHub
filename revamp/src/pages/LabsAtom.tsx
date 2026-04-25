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
  // Optional spiral-in overrides. Default: ELECTRON.settleDurationT + easeOutCubic
  // — a fast inward pull that decelerates toward the target. Set these on
  // an orbit that needs a smoother blend from orbit to spiral (e.g. start
  // the spiral earlier via `laps`, widen it via settleDurationT, and swap
  // to smoothstep so velocity is continuous at the transition boundary).
  settleDurationT?: number
  settleEase?: 'outCubic' | 'smoothstep'
}

/* =========================================================
   ATOM ANIMATION CONSTANTS — three nested namespaces.
   Verbatim baseline values live in revamp/docs/atom-baseline-2026-04-25.md;
   when the user says "go back to default settings" or "logo constants",
   that doc + this file's exported objects are the single source of truth.

     ELECTRON  ← primitive: head/halo/trail visuals + electron-frame timing
     ATOM      ← composition: orbit geometry/speed, scene rotation, nucleus
     LOGO      ← wordmark composition: ai/uni colors + settle ramp timing

   AppShell.tsx imports `LOGO.mountDelayMs` from this file. That `app/` →
   `pages/` import direction is upside-down; Chunk 3 of the atom-system
   plan moves these constants to `src/ui/atom/constants.ts` and resolves it.
   ========================================================= */

type Rgb = readonly [number, number, number]

export const ELECTRON = {
  head: {
    color: '#ffffff',          // tiny solid sphere at the orbit head
    postScale: 1.45,           // head scale at rest after landing
  },
  halo: {
    color: '#ffffff',          // expanding glow burst on strike
    postScale: 2.4,            // halo scale at rest after landing
    postOpacity: 0.5,          // halo opacity at rest after landing
  },
  trail: {
    color: '#ffffff',          // ring-buffer line behind the head
    segments: 96,
    arc: Math.PI * 0.62,
  },
  // Electron-frame timings (orbit-speed-relative units except where noted).
  fadeInT: 4 * Math.PI,        // smooth appearance over first ~2 orbits
  strikeLeadT: 0.5,            // strike fires this much before landing
  settleDurationT: 2 * Math.PI, // default spiral duration (1 lap)
  postLandHoldT: 2.3,          // hold at full lit after pulse before fade
  postLandFadeT: 5.0,          // fade duration after the post-land hold
}

export const ATOM = {
  orbit: {
    radiusA: 1.40,             // semi-major axis
    radiusB: 0.85,             // semi-minor axis
    speed: 3.30,
  },
  scene: {
    // Scene-wide group rotation — exposed so target world→local conversion
    // in AtomComposition matches the rendered orientation exactly.
    groupRotation: [Math.PI / 4, Math.PI / 4, 0] as [number, number, number],
  },
  nucleus: {
    // Wired up in Chunk 3 (<Atom> component extraction); current logo
    // composition is implicitly nucleus = invisible at origin.
    defaultRender: 'invisible' as 'invisible' | 'sphere' | 'icon',
    defaultColor: '#ffffff',
    defaultSize: 0.06,
  },
}

export const LOGO = {
  mountDelayMs: 400,           // delay before topbar Canvas mounts (Safari layer race)
  ai: {
    color: {
      litLight: [255, 255, 255] as Rgb,   // bright on light bg
      litDark:  [235, 235, 235] as Rgb,   // bright on dark bg
      deboss:   [0, 0, 0]       as Rgb,   // dark deboss (light bg)
      emboss:   [255, 255, 255] as Rgb,   // light emboss (dark bg)
      glow:     [255, 255, 255] as Rgb,   // labs-page glow stack
    },
    /* Duration of the .aiPulse strike-flicker. Must match the aiStrikeN
       keyframe animation duration in LabsAtom.module.css — the JS timer
       here is what clears the pulsing class so the CSS transition can
       re-engage and fade/hold the text back to its rest state. */
    strikePulseMs: 560,
    glow: {
      // After the final electron lands + the pulse completes, hold the
      // 'ai' at full glow for a beat, then decay the white glow stack
      // to zero so the wordmark resolves to clean flat white text.
      holdMs: 700,
      decayMs: 1500,
    },
    // Empirical font-metric nudges for landing the electron on the i-dot.
    // Both are typeface-dependent — retune on font swap.
    iDotNudge: { x: 0.5, y: -2.5 },
  },
  uni: {
    color: {
      litLight: [255, 255, 255] as Rgb,
      litDark:  [235, 235, 235] as Rgb,
      deboss:   [0, 0, 0]       as Rgb,
      emboss:   [255, 255, 255] as Rgb,
    },
    // "University" neon-tube reveal — letters flash on left → right after
    // the final strike's pulse ends. Stagger is per-letter delay between
    // flash starts; flashMs is the per-letter animation duration.
    stagger: {
      compactMs: 50,           // ~13px font in topbar
      labsMs: 80,              // ~32px font in /labs/atom
    },
    flashMs: 300,
    revealDelayMs: 200,        // pause after final strike before letters start
  },
  // After "University" is fully lit, hold briefly then dim everything
  // (ai + university + i-dot glow) to the debossed resting state.
  settle: {
    delayMs: 400,
    durationMs: 3500,
  },
}

const ORBITS: OrbitConfig[] = [
  { plane: 'xy', speed: ATOM.orbit.speed, phase: 0,                 laps: 3.5, postLandVisibility: 0 },
  { plane: 'yz', speed: ATOM.orbit.speed, phase: (2 * Math.PI) / 3, laps: 5,   postLandVisibility: 0.33 },
  // Final electron gets a gentler spiral via custom settleDurationT (3π
  // = 1.5 laps) and smoothstep easing so the orbit→spiral handoff has
  // no velocity discontinuity.
  {
    plane: 'xz',
    speed: ATOM.orbit.speed,
    phase: (4 * Math.PI) / 3,
    laps: 6,
    postLandVisibility: 1,
    settleDurationT: 3 * Math.PI,
    settleEase: 'smoothstep',
  },
]

function rgba(rgb: Rgb, a: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a.toFixed(3)})`
}

function blendRgb(a: Rgb, b: Rgb, t: number): [number, number, number] {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ]
}

// Strike 1 is a subtle tap, 2 lands harder, 3+ is the full slam. More
// than three strikes would stay at .aiPulse3.
function pulseClassForStrike(strike: number, s: Record<string, string>): string {
  if (strike <= 1) return s.aiPulse1
  if (strike === 2) return s.aiPulse2
  return s.aiPulse3
}

function orbitPos(t: number, plane: Plane): [number, number, number] {
  const c = Math.cos(t), sn = Math.sin(t)
  if (plane === 'xy') return [ATOM.orbit.radiusA * c, ATOM.orbit.radiusB * sn, 0]
  if (plane === 'yz') return [0, ATOM.orbit.radiusA * c, ATOM.orbit.radiusB * sn]
  return [ATOM.orbit.radiusA * c, 0, ATOM.orbit.radiusB * sn]
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
  if (plane === 'xy') return [cx + ATOM.orbit.radiusA * scale * c, cy + ATOM.orbit.radiusB * scale * sn, cz]
  if (plane === 'yz') return [cx, cy + ATOM.orbit.radiusA * scale * c, cz + ATOM.orbit.radiusB * scale * sn]
  return [cx + ATOM.orbit.radiusA * scale * c, cy, cz + ATOM.orbit.radiusB * scale * sn]
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
  settleTarget,
  settle,
  onLand,
  onStrike,
  restProgressRef,
}: {
  config: OrbitConfig
  fadeTex: THREE.DataTexture
  settleTarget?: THREE.Vector3
  settle?: boolean
  onLand?: () => void
  onStrike?: () => void
  restProgressRef?: React.MutableRefObject<number>
}) {
  const settleAfterT = settle ? config.laps * 2 * Math.PI : undefined
  const settleDurT = config.settleDurationT ?? ELECTRON.settleDurationT
  const settleEaseFn = config.settleEase === 'smoothstep' ? smoothstep : easeOutCubic
  const landedRef = useRef(false)
  const struckRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geomRef = useRef<any>(null!)
  const headRef = useRef<THREE.Mesh>(null!)
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailMatRef = useRef<any>(null!)
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
    const buf = new Float32Array(ELECTRON.trail.segments * 3)
    for (let i = 0; i < ELECTRON.trail.segments; i++) {
      const tSample = config.phase - ELECTRON.trail.arc + (ELECTRON.trail.arc * i) / (ELECTRON.trail.segments - 1)
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
    insertIdxRef.current = (idx + 1) % ELECTRON.trail.segments

    // Unroll buffer to a contiguous "oldest → newest" array for meshline.
    const unroll = new Float32Array(ELECTRON.trail.segments * 3)
    for (let i = 0; i < ELECTRON.trail.segments; i++) {
      const src = (insertIdxRef.current + i) % ELECTRON.trail.segments
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
      if (t >= doneT - ELECTRON.strikeLeadT && !struckRef.current) {
        struckRef.current = true
        if (onStrike) onStrike()
      }
      if (t >= doneT && !landedRef.current) {
        landedRef.current = true
        if (onLand) onLand()
      }
      const postScale = vis > 0 ? ELECTRON.head.postScale : 1
      const postHaloScale = vis > 0 ? ELECTRON.halo.postScale : 0.0001
      if (t >= doneT + PULSE_T) {
        // Post-pulse rest — hold then fade so the final resting state
        // on the i-dot has no dot overlay or halo. The FINAL electron
        // (postLandVisibility >= 1) syncs its fade to the University
        // settle ramp via restProgressRef so the i-dot glow loss and
        // the text dim share the same timeline. Other electrons keep
        // the t-based fade since they're already gone by settle time.
        let fadeMult = 1
        if (vis >= 1 && restProgressRef && restProgressRef.current > 0) {
          fadeMult = 1 - restProgressRef.current
        } else {
          const elapsedAfterPulse = t - (doneT + PULSE_T)
          if (elapsedAfterPulse > ELECTRON.postLandHoldT) {
            const p = Math.min(1, (elapsedAfterPulse - ELECTRON.postLandHoldT) / ELECTRON.postLandFadeT)
            fadeMult = 1 - easeOutCubic(p)
          }
        }
        electronScale = postScale
        electronOpacity = vis * fadeMult
        haloScale = postHaloScale
        haloOpacity = ELECTRON.halo.postOpacity * vis * fadeMult
      } else if (t >= doneT) {
        // Pulse window — full-intensity flash, ramps toward vis by p=1.
        const p = (t - doneT) / PULSE_T
        const pulse = Math.sin(p * Math.PI)
        electronScale = 1 + pulse * 0.5 + p * (postScale - 1)
        electronOpacity = 1 + p * (vis - 1)            // 1 → vis over pulse
        haloScale = 1 + p * (postHaloScale - 1)
        haloOpacity = pulse * 0.35 + p * ELECTRON.halo.postOpacity * vis
      }
    }
    // Initial fade-in: electrons appear smoothly over the first ~2 orbits
    // rather than popping in. Measured from config.phase so wall-time is
    // consistent across electrons regardless of starting phase.
    const fadeIn = Math.min(1, Math.max(0, (tRef.current - config.phase) / ELECTRON.fadeInT))

    headRef.current.scale.setScalar(electronScale)
    if (headMatRef.current) {
      headMatRef.current.opacity = electronOpacity * fadeIn
    }
    if (haloRef.current) {
      haloRef.current.position.set(hx, hy, hz)
      haloRef.current.scale.setScalar(haloScale)
    }
    if (haloMatRef.current) {
      haloMatRef.current.opacity = haloOpacity * fadeIn
    }
    if (trailMatRef.current) {
      trailMatRef.current.opacity = fadeIn
    }
  })

  return (
    <>
      <mesh>
        <meshLineGeometry ref={geomRef} />
        <meshLineMaterial
          ref={trailMatRef}
          color={ELECTRON.trail.color}
          lineWidth={0.17}
          transparent
          opacity={0}
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
          color={ELECTRON.halo.color}
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
          color={ELECTRON.head.color}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
    </>
  )
}

function Scene({
  onlyPlane,
  settleTarget,
  settle,
  onLand,
  onStrike,
  restProgressRef,
}: {
  onlyPlane?: Plane
  settleTarget?: THREE.Vector3
  settle?: boolean
  onLand?: () => void
  onStrike?: () => void
  restProgressRef?: React.MutableRefObject<number>
}) {
  const fadeTex = useMemo(() => makeFadeTexture(), [])
  const orbits = onlyPlane ? ORBITS.filter((o) => o.plane === onlyPlane) : ORBITS
  return (
    <group rotation={ATOM.scene.groupRotation}>
      {orbits.map((o) => (
        <Electron
          key={`e-${o.plane}`}
          config={o}
          fadeTex={fadeTex}
          settleTarget={settleTarget}
          settle={settle}
          onLand={onLand}
          onStrike={onStrike}
          restProgressRef={restProgressRef}
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
    new THREE.Euler(ATOM.scene.groupRotation[0], ATOM.scene.groupRotation[1], ATOM.scene.groupRotation[2], 'XYZ'),
  )
  return world.applyMatrix4(rotationMatrix.invert())
}

export // Flash-only style. Three driver states:
//   restProgress=0, progress=0  → fully invisible (text not yet revealed)
//   restProgress=0, progress=1  → bright white strike-flash with glow
//   restProgress=1, progress=*  → debossed/embossed resting state
// Intermediate restProgress blends white→debossed so the settle is smooth.
// Crucially: when restProgress=0 the RGB stays at white, so the CSS
// transition from progress=1→0 (after strikes 1 & 2) is alpha-only and
// the text fades out cleanly without passing through gray.
// `compact` (topbar) drops the multi-layer glow stack. `glowMultiplier`
// (0..1) scales the glow stack independently for the post-strike decay.
function buildAiStyle(
  progress: number,
  onDark: boolean,
  compact: boolean,
  glowMultiplier: number,
  restProgress: number = 0,
): CSSProperties {
  const g = progress
  const gm = glowMultiplier
  const r = restProgress
  if (onDark) {
    // Stays light throughout. Glow dissipates as r→1, top-emboss
    // highlight appears as r→1.
    const colorAlpha = g * 0.95
    const embossAlpha = r * 0.18
    const embossShadow = `0 1px 1px ${rgba(LOGO.ai.color.emboss, embossAlpha)}`
    return {
      color: rgba(LOGO.ai.color.litDark, colorAlpha),
      textShadow: compact
        ? (r > 0 ? embossShadow : 'none')
        : [
            embossShadow,
            `0 0 3px ${rgba(LOGO.ai.color.glow, 0.9 * g * gm * (1 - r))}`,
            `0 0 6px ${rgba(LOGO.ai.color.glow, 0.65 * g * gm * (1 - r))}`,
            `0 0 12px ${rgba(LOGO.ai.color.glow, 0.4 * g * gm * (1 - r))}`,
            `0 0 22px ${rgba(LOGO.ai.color.glow, 0.2 * g * gm * (1 - r))}`,
          ].join(', '),
    }
  }
  // Light mode: stays bright white throughout. Glow dissipates as r→1,
  // dark deboss shadow appears as r→1.
  const colorAlpha = g * 0.98
  const debossAlpha = r * 0.14
  const debossShadow = `0 -1px 1px ${rgba(LOGO.ai.color.deboss, debossAlpha)}`
  return {
    color: rgba(LOGO.ai.color.litLight, colorAlpha),
    textShadow: compact
      ? (r > 0 ? debossShadow : 'none')
      : [
          debossShadow,
          `0 0 3px ${rgba(LOGO.ai.color.glow, 0.9 * g * gm * (1 - r))}`,
          `0 0 6px ${rgba(LOGO.ai.color.glow, 0.65 * g * gm * (1 - r))}`,
          `0 0 12px ${rgba(LOGO.ai.color.glow, 0.4 * g * gm * (1 - r))}`,
          `0 0 22px ${rgba(LOGO.ai.color.glow, 0.2 * g * gm * (1 - r))}`,
        ].join(', '),
  }
}

// Per-letter "University" style. Once `triggered` is true, every letter
// gets an inline color so the neon flash reads white (overriding the
// debossed .university class color). When `restProgress` ramps 0→1, the
// inline color blends to the resting debossed/embossed state.
function buildUniversityStyle(
  triggered: boolean,
  restProgress: number,
  onDark: boolean,
  compact: boolean,
): CSSProperties {
  if (!triggered) return {}
  const r = restProgress
  if (onDark) {
    // Bright (1.0 alpha) → resting (0.55 alpha) — alpha-only blend
    const alpha = 1.0 * (1 - r) + 0.55 * r
    return {
      color: rgba(LOGO.uni.color.litDark, alpha),
      textShadow: r > 0
        ? `0 1px 1px ${rgba(LOGO.uni.color.emboss, r * 0.18)}`
        : 'none',
    }
  }
  // Light mode: blend RGB lit→deboss AND alpha 0.98→restAlpha together
  // so the dim feels like power draining (not just opacity fade).
  const restAlpha = compact ? 0.42 : 0.22
  const blended = blendRgb(LOGO.uni.color.litLight, LOGO.uni.color.deboss, r)
  const alpha = 0.98 * (1 - r) + restAlpha * r
  return {
    color: rgba(blended, alpha),
    textShadow: r > 0
      ? `0 -1px 1px ${rgba(LOGO.uni.color.deboss, r * 0.14)}`
      : 'none',
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
  // After the final strike, "University" reveals letter-by-letter.
  const [universityTriggered, setUniversityTriggered] = useState(false)
  // After University finishes revealing, everything settles to the
  // debossed resting state via this 0→1 ramp.
  const [restProgress, setRestProgress] = useState(0)
  // Mirror restProgress into a ref so the in-Canvas Electron useFrame
  // can read it without re-renders. Used to sync the i-dot electron's
  // post-pulse fade with the University settle.
  const restProgressRef = useRef(0)
  useEffect(() => { restProgressRef.current = restProgress }, [restProgress])

  // Defer Canvas mount so the sticky topbar's compositor layer is fully
  // committed before WebGL creates its own layer. Without this, Safari
  // races the two layer snapshots and the header gets stuck mid-page.

  // Camera closer for the compact logo so the atom fills the smaller canvas.
  const camZ = compact ? 5.5 : 11
  const totalElectrons = onlyPlane ? 1 : ORBITS.length

  // Strike fires slightly before landing (see ELECTRON.strikeLeadT) so the
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
    const timer = setTimeout(() => setPulsing(false), LOGO.ai.strikePulseMs)
    return () => clearTimeout(timer)
  }, [strikeCount])

  // After the FINAL strike fires, 'ai' stays lit (progress=1). Strikes
  // 1 & 2 set pulsing→true→false, so progress flips 1→0 and the CSS
  // transition fades the text back to invisible (alpha 0). Only the
  // final strike keeps progress=1 permanently.
  const allLanded = settle === true && landedCount >= totalElectrons
  const finalStrike = strikeCount >= totalElectrons
  const progress = pulsing ? 1 : finalStrike ? 1 : 0

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
        const p = Math.min(1, elapsed / LOGO.ai.glow.decayMs)
        setGlowMultiplier(1 - easeOutCubic(p))
        if (p < 1) rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }, LOGO.ai.glow.holdMs)
    return () => {
      clearTimeout(holdTimer)
      if (rafId !== undefined) cancelAnimationFrame(rafId)
    }
  }, [allLanded, compact])

  // After the final strike's pulse ends, kick off the "University"
  // letter-by-letter reveal (with a small breath so it doesn't step on
  // the strike's brightness flicker).
  useEffect(() => {
    if (!finalStrike || pulsing || universityTriggered) return
    const timer = setTimeout(() => setUniversityTriggered(true), LOGO.uni.revealDelayMs)
    return () => clearTimeout(timer)
  }, [finalStrike, pulsing, universityTriggered])

  // After "University" is fully revealed (all letters lit), wait a beat
  // then ramp restProgress 0→1 to dim everything to the debossed state.
  useEffect(() => {
    if (!universityTriggered) return
    const staggerMs = compact ? LOGO.uni.stagger.compactMs : LOGO.uni.stagger.labsMs
    const totalRevealMs = ('University'.length - 1) * staggerMs + LOGO.uni.flashMs
    let rafId: number | undefined
    const delayTimer = setTimeout(() => {
      const startTime = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - startTime) / LOGO.settle.durationMs)
        setRestProgress(easeOutCubic(p))
        if (p < 1) rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }, totalRevealMs + LOGO.settle.delayMs)
    return () => {
      clearTimeout(delayTimer)
      if (rafId !== undefined) cancelAnimationFrame(rafId)
    }
  }, [universityTriggered, compact])

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
    // Empirical font-metric nudges (see LOGO.ai.iDotNudge.x/Y at top of file)
    // place the landings right on the visual dot of the 'i'.
    const dotX = iRect.left + iRect.width / 2 + LOGO.ai.iDotNudge.x
    const dotY = iRect.top + iRect.height * 0.32 + LOGO.ai.iDotNudge.y
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
            onlyPlane={onlyPlane}
            settleTarget={settleTarget ?? undefined}
            settle={settle}
            onLand={onLand}
            onStrike={onStrike}
            restProgressRef={restProgressRef}
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
          className={`${s.ai} ${pulsing ? pulseClassForStrike(strikeCount, s) : ''} ${restProgress > 0 ? s.aiSettling : ''}`}
          style={buildAiStyle(progress, onDark ?? false, compact ?? false, glowMultiplier, restProgress)}
        >
          a<span ref={iRef}>i</span>
        </span>
        <span
          className={`${s.university} ${onDark ? s.universityDark : ''} ${compact ? s.universityCompact : ''}`}
        >
          {'University'.split('').map((ch, i) => {
            const staggerMs = compact ? LOGO.uni.stagger.compactMs : LOGO.uni.stagger.labsMs
            return (
              <span
                key={i}
                className={universityTriggered ? s.uniLetterOn : s.uniLetter}
                style={{
                  animationDelay: universityTriggered ? `${i * staggerMs}ms` : undefined,
                  ...buildUniversityStyle(universityTriggered, restProgress, onDark ?? false, compact ?? false),
                }}
              >
                {ch}
              </span>
            )
          })}
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
