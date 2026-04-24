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
}

const RADIUS_A = 1.40
const RADIUS_B = 0.85
const ORBIT_SPEED = 3.30
const ORBITS: OrbitConfig[] = [
  { plane: 'xy', speed: ORBIT_SPEED, phase: 0,                 laps: 3,   postLandVisibility: 0 },
  { plane: 'yz', speed: ORBIT_SPEED, phase: (2 * Math.PI) / 3, laps: 5,   postLandVisibility: 0.33 },
  { plane: 'xz', speed: ORBIT_SPEED, phase: (4 * Math.PI) / 3, laps: 6.5, postLandVisibility: 1 },
]

const ELECTRON_COLOR = '#ffffff'

const N_TRAIL = 96
const ARC = Math.PI * 0.62

// Settle parameters — for the "lands on the i-dot" composition.
const SETTLE_DURATION_T = 2 * Math.PI         // 1 lap to spiral in

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

function Electron({
  config,
  fadeTex,
  color,
  settleTarget,
  settle,
  onLand,
}: {
  config: OrbitConfig
  fadeTex: THREE.DataTexture
  color: string
  settleTarget?: THREE.Vector3
  settle?: boolean
  onLand?: () => void
}) {
  const settleAfterT = settle ? config.laps * 2 * Math.PI : undefined
  const landedRef = useRef(false)
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
      // radii scale from 1 → 0, easeOutCubic'd. Electron keeps advancing
      // through t, tracing a smooth spiral into the target point.
      const p = Math.min(1, (t - settleAfterT) / SETTLE_DURATION_T)
      const e = easeOutCubic(p)
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
      const doneT = settleAfterT + SETTLE_DURATION_T
      const PULSE_T = Math.PI * 0.7
      if (t >= doneT && !landedRef.current) {
        landedRef.current = true
        if (onLand) onLand()
      }
      const postScale = vis > 0 ? POST_SCALE : 1
      const postHaloScale = vis > 0 ? POST_HALO_SCALE : 0.0001
      if (t >= doneT + PULSE_T) {
        // Post-pulse rest — scale + halo + opacity determined by vis.
        electronScale = postScale
        electronOpacity = vis
        haloScale = postHaloScale
        haloOpacity = POST_HALO_OPACITY * vis
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
        <sphereGeometry args={[0.042, 32, 32]} />
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
        <sphereGeometry args={[0.042, 32, 32]} />
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
}: {
  color: string
  onlyPlane?: Plane
  settleTarget?: THREE.Vector3
  settle?: boolean
  onLand?: () => void
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
// via the CSS transition after the 420ms pulse.
function buildAiStyle(progress: number, onDark: boolean): CSSProperties {
  const g = progress
  if (onDark) {
    const alpha = 0.55 + g * 0.4
    const embossAlpha = (1 - g) * 0.18
    return {
      color: `rgba(235, 235, 235, ${alpha.toFixed(3)})`,
      textShadow: [
        `0 1px 1px rgba(255, 255, 255, ${embossAlpha.toFixed(3)})`,
        `0 0 3px rgba(255, 255, 255, ${(0.9 * g).toFixed(3)})`,
        `0 0 6px rgba(255, 255, 255, ${(0.65 * g).toFixed(3)})`,
        `0 0 12px rgba(255, 255, 255, ${(0.4 * g).toFixed(3)})`,
        `0 0 22px rgba(255, 255, 255, ${(0.2 * g).toFixed(3)})`,
      ].join(', '),
    }
  }
  const gray = 255 * g
  const colorAlpha = 0.28 + g * 0.7
  const debossAlpha = (1 - g) * 0.14
  return {
    color: `rgba(${gray}, ${gray}, ${gray}, ${colorAlpha})`,
    textShadow: [
      `0 -1px 1px rgba(0, 0, 0, ${debossAlpha.toFixed(3)})`,
      `0 0 3px rgba(255, 255, 255, ${(0.9 * g).toFixed(3)})`,
      `0 0 6px rgba(255, 255, 255, ${(0.65 * g).toFixed(3)})`,
      `0 0 12px rgba(255, 255, 255, ${(0.4 * g).toFixed(3)})`,
      `0 0 22px rgba(255, 255, 255, ${(0.2 * g).toFixed(3)})`,
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

  // Camera closer for the compact logo so the atom fills the smaller canvas.
  const camZ = compact ? 5.5 : 11
  const totalElectrons = onlyPlane ? 1 : ORBITS.length

  const onLand = useCallback(() => {
    setStrikeCount((c) => c + 1)
    setLandedCount((c) => c + 1)
  }, [])

  // On each landing, fire the 420ms .aiPulse flash. 'ai' snaps bright +
  // flickers, then CSS transition either fades it back to debossed
  // (intermediate strikes) or leaves it at full brightness (final strike,
  // when allLanded below is true).
  useEffect(() => {
    if (strikeCount === 0) return
    setPulsing(true)
    const timer = setTimeout(() => setPulsing(false), 420)
    return () => clearTimeout(timer)
  }, [strikeCount])

  // Once every electron has landed, 'ai' stays lit permanently —
  // post-final-strike the progress doesn't decay to debossed.
  const allLanded = settle === true && landedCount >= totalElectrons
  const progress = pulsing ? 1 : allLanded ? 1 : 0

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
    const dotX = iRect.left + iRect.width / 2
    const dotY = iRect.top + iRect.height * 0.32 - 2
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
          className={`${s.ai} ${pulsing ? s.aiPulse : ''}`}
          style={buildAiStyle(progress, onDark ?? false)}
        >
          a<span ref={iRef}>i</span>
        </span>
        <span className={`${s.university} ${onDark ? s.universityDark : ''}`}>University</span>
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
