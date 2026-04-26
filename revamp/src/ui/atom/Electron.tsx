import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { ATOM, ELECTRON } from './constants'

// Side-effect: register meshline as JSX-renderable. Must execute before
// any <Electron> renders. Idempotent.
extend({ MeshLineGeometry, MeshLineMaterial })

declare module '@react-three/fiber' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements {
    meshLineGeometry: object
    meshLineMaterial: object
  }
}

export type Plane = 'xy' | 'yz' | 'xz'

export type OrbitConfig = {
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

export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3)
}

// Smoothstep — zero derivative at both ends, so the orbit→spiral
// transition has no velocity discontinuity (gradual pull-in instead of
// the sharp inward snap easeOutCubic produces at p≈0).
export function smoothstep(x: number): number {
  return x * x * (3 - 2 * x)
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

export function makeFadeTexture(power = 2.2) {
  const n = 128
  const data = new Uint8Array(n * 4)
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1)
    const a = Math.pow(x, power) * 255
    data[i * 4] = 255
    data[i * 4 + 1] = 255
    data[i * 4 + 2] = 255
    data[i * 4 + 3] = a
  }
  const tex = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

export function Electron({
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
