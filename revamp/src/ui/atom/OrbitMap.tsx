import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { TrackballControls } from '@react-three/drei'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { ELECTRON } from './constants'
import { makeFadeTexture } from './Electron'
import type { Vec3 } from './runtime/types'

extend({ MeshLineGeometry, MeshLineMaterial })

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module '@react-three/fiber' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements {
    meshLineGeometry: object
    meshLineMaterial: object
  }
}

type SlotLocation = 'A' | 'B' | 'none'

const SPHERE_RADIUS = 1
const RING_TUBE = 0.006
const ARMED_GLOW_TUBE = 0.030
const NUCLEUS_RADIUS = 0.045
const X_AXIS = new THREE.Vector3(1, 0, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

// Mini orbit constants — match the main scene's orbit-A feel so the
// preview electron position stays in lockstep with what it'll do on the
// main stage. cwAtA = true everywhere → omega is negative.
const MINI_OMEGA_BASE = 2.4
const MINI_FADE_DUR = 0.55
// Trail-smoothness budget — see same constant in LabsAtomMotion.tsx.
// Substep count auto-tunes off this so the polyline stays curved at
// any speedMult.
const TARGET_RAD_PER_SAMPLE = 0.02

// Same head-sprite texture recipe as the main scene. Local copy so the
// preview canvas owns its own GL upload (textures don't share across
// renderer contexts).
function makeSoftOrbTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0.00, 'rgba(255, 255, 255, 1.00)')
  g.addColorStop(0.10, 'rgba(255, 255, 255, 1.00)')
  g.addColorStop(0.14, 'rgba(255, 255, 255, 0.40)')
  g.addColorStop(0.22, 'rgba(255, 255, 255, 0.40)')
  g.addColorStop(0.26, 'rgba(255, 255, 255, 0.80)')
  g.addColorStop(0.34, 'rgba(255, 255, 255, 0.80)')
  g.addColorStop(0.38, 'rgba(255, 255, 255, 0.28)')
  g.addColorStop(0.55, 'rgba(255, 255, 255, 0.28)')
  g.addColorStop(0.78, 'rgba(255, 255, 255, 0.10)')
  g.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function OrbitRing({
  upHat,
  armed,
}: {
  upHat: Vec3
  armed: boolean
}) {
  const quaternion = useMemo(() => {
    const upVec = new THREE.Vector3(upHat[0], upHat[1], upHat[2])
    const normal = new THREE.Vector3().crossVectors(X_AXIS, upVec).normalize()
    return new THREE.Quaternion().setFromUnitVectors(Z_AXIS, normal)
  }, [upHat])

  // Rings are uniform faint grey — the orbiting electron provides its own
  // visual signal for the occupied state. Only the armed-for-delete state
  // lights the ring (red), since the electron alone wouldn't communicate
  // "next tap will remove this."
  const ringColor = armed ? '#ff5050' : '#9aa0a6'
  const lineOpacity = armed ? 0.85 : 0.22

  return (
    <group quaternion={quaternion}>
      {armed && (
        <mesh>
          <torusGeometry args={[SPHERE_RADIUS, ARMED_GLOW_TUBE, 8, 64]} />
          <meshBasicMaterial
            color={ringColor}
            transparent
            opacity={0.30}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      <mesh>
        <torusGeometry args={[SPHERE_RADIUS, RING_TUBE, 8, 128]} />
        <meshBasicMaterial color={ringColor} transparent opacity={lineOpacity} depthWrite={false} />
      </mesh>
    </group>
  )
}

// Single nucleus at scene origin. Mirrors the main-scene Nuclei material
// (color, opacity, geometry resolution) so the preview shows the same
// look as one half of the chord pair.
function MiniNucleus({ color }: { color: string }) {
  return (
    <mesh>
      <sphereGeometry args={[NUCLEUS_RADIUS, 24, 24]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
    </mesh>
  )
}

// Continuously-orbiting electron — head sprite + halo + mesh-line trail
// with the SAME materials, fade texture, and additive blending the main
// stage uses. No phase machine; just orbitA forever, syncing to the
// global clock so the preview's angular position matches what this slot
// is doing on the main stage at any given moment.
function MiniOrbitElectron({
  upHat,
  initialPhase,
  color,
  headScale,
  haloScale,
  trailWidth,
  fadeTex,
  orbTex,
  globalScaledTimeRef,
  reducedMotion,
}: {
  upHat: Vec3
  initialPhase: number
  color: string
  headScale: number
  haloScale: number
  trailWidth: number
  fadeTex: THREE.DataTexture
  orbTex: THREE.CanvasTexture
  globalScaledTimeRef: React.MutableRefObject<number>
  reducedMotion: boolean
}) {
  const headRef = useRef<THREE.Sprite>(null!)
  const headMatRef = useRef<THREE.SpriteMaterial>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailGeomRef = useRef<any>(null!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailMatRef = useRef<any>(null!)

  const opacityRef = useRef(0)
  const bufRef = useRef<Float32Array | null>(null)
  const insertIdxRef = useRef(0)
  // Tracks last frame's global scaled-time so the substep loop knows how
  // much orbital time elapsed this frame. Initialized lazily on first
  // useFrame so we substep across the actual delta, not a 0→now jump.
  const lastGlobalTRef = useRef<number | null>(null)
  if (!bufRef.current) {
    bufRef.current = new Float32Array(ELECTRON.trail.segments * 3)
  }

  const { size, invalidate } = useThree()
  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  )

  // Position function — orbit on the great circle whose plane is spanned
  // by chordAxis = +X and upHat. SPHERE_RADIUS scales onto the unit guide
  // sphere. Sign of omega flipped to match cwAtA = true (the main scene's
  // default — slot specs all use cwAtA = true).
  const posAt = (theta: number): Vec3 => {
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    return [
      SPHERE_RADIUS * (c + s * upHat[0]),
      SPHERE_RADIUS * s * upHat[1],
      SPHERE_RADIUS * s * upHat[2],
    ]
  }

  // Seed the trail buffer + park the sprite at initialPhase the first
  // time this electron mounts, so the trail draws from frame 1 instead
  // of streaking out from origin.
  useEffect(() => {
    const omega = -MINI_OMEGA_BASE
    const theta = initialPhase + omega * globalScaledTimeRef.current
    const seed = posAt(theta)
    if (bufRef.current) {
      for (let i = 0; i < ELECTRON.trail.segments; i++) {
        bufRef.current[i * 3] = seed[0]
        bufRef.current[i * 3 + 1] = seed[1]
        bufRef.current[i * 3 + 2] = seed[2]
      }
    }
    insertIdxRef.current = 0
    if (headRef.current) headRef.current.position.set(seed[0], seed[1], seed[2])
    if (haloRef.current) haloRef.current.position.set(seed[0], seed[1], seed[2])
    invalidate()
    // upHat / initialPhase changes restart the trail — for a slot identity
    // these never change after mount, so this only fires once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhase, upHat])

  // Reduced-motion: park at initialPhase, full opacity, no animation.
  useEffect(() => {
    if (!reducedMotion) return
    const restPos = posAt(initialPhase)
    if (bufRef.current) {
      for (let i = 0; i < ELECTRON.trail.segments; i++) {
        bufRef.current[i * 3] = restPos[0]
        bufRef.current[i * 3 + 1] = restPos[1]
        bufRef.current[i * 3 + 2] = restPos[2]
      }
    }
    insertIdxRef.current = 0
    if (headRef.current) headRef.current.position.set(restPos[0], restPos[1], restPos[2])
    if (haloRef.current) haloRef.current.position.set(restPos[0], restPos[1], restPos[2])
    if (headMatRef.current) headMatRef.current.opacity = 1
    if (haloMatRef.current) haloMatRef.current.opacity = 0.42
    if (trailMatRef.current) trailMatRef.current.opacity = 1
    opacityRef.current = 1
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, initialPhase, upHat])

  useFrame((_, delta) => {
    if (reducedMotion) return

    // Fade-in to full opacity. Electron mounts when slot becomes occupied,
    // unmounts when it empties — so we just ramp toward 1 here.
    const opacityRate = delta / MINI_FADE_DUR
    if (opacityRef.current < 1) {
      opacityRef.current = Math.min(1, opacityRef.current + opacityRate)
    }

    const omega = -MINI_OMEGA_BASE
    const currGlobalT = globalScaledTimeRef.current
    const prevGlobalT = lastGlobalTRef.current ?? currGlobalT
    lastGlobalTRef.current = currGlobalT
    const span = currGlobalT - prevGlobalT

    // Auto-tune substeps — keep angular delta per polyline sample under
    // TARGET_RAD_PER_SAMPLE so the orbit reads as a curve, not a polygon,
    // at any speedMult. See companion logic + revisit note in
    // LabsAtomMotion.tsx → ElectronProbe.
    //
    // NOTE — REVISIT TAIL LENGTH. Buffer is fixed at
    // ELECTRON.trail.segments (96), so substepping shortens visual tail
    // arc at high speed. To restore "tail extends with speed" behavior,
    // multiply buffer + unroll length by `substeps`.
    let substeps = 1
    if (span > 0) {
      const angularSpan = MINI_OMEGA_BASE * span
      substeps = Math.max(1, Math.ceil(angularSpan / TARGET_RAD_PER_SAMPLE))
    }

    let pos: Vec3 = [0, 0, 0]
    const buf = bufRef.current!
    for (let i = 1; i <= substeps; i++) {
      const sampleGlobalT = prevGlobalT + (span * i) / substeps
      const theta = initialPhase + omega * sampleGlobalT
      pos = posAt(theta)
      const idx = insertIdxRef.current
      buf[idx * 3] = pos[0]
      buf[idx * 3 + 1] = pos[1]
      buf[idx * 3 + 2] = pos[2]
      insertIdxRef.current = (idx + 1) % ELECTRON.trail.segments
    }

    if (headRef.current) headRef.current.position.set(pos[0], pos[1], pos[2])
    if (haloRef.current) haloRef.current.position.set(pos[0], pos[1], pos[2])

    const unroll = new Float32Array(ELECTRON.trail.segments * 3)
    for (let i = 0; i < ELECTRON.trail.segments; i++) {
      const src = (insertIdxRef.current + i) % ELECTRON.trail.segments
      unroll[i * 3] = buf[src * 3]
      unroll[i * 3 + 1] = buf[src * 3 + 1]
      unroll[i * 3 + 2] = buf[src * 3 + 2]
    }
    if (trailGeomRef.current?.setPoints) trailGeomRef.current.setPoints(unroll)

    if (headMatRef.current) headMatRef.current.opacity = opacityRef.current
    if (haloMatRef.current) haloMatRef.current.opacity = opacityRef.current * 0.42
    if (trailMatRef.current) trailMatRef.current.opacity = opacityRef.current
  })

  return (
    <>
      <mesh>
        <meshLineGeometry ref={trailGeomRef} />
        <meshLineMaterial
          ref={trailMatRef}
          color={color}
          lineWidth={trailWidth}
          transparent
          opacity={0}
          depthWrite={false}
          alphaMap={fadeTex}
          useAlphaMap={1}
          toneMapped={false}
          resolution={resolution}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={haloRef} scale={haloScale}>
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={color}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <sprite ref={headRef} scale={[headScale, headScale, 1]}>
        <spriteMaterial
          ref={headMatRef}
          map={orbTex}
          color={color}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </sprite>
    </>
  )
}

export function OrbitMap({
  upHats,
  initialPhases,
  slotLocations,
  electronColors,
  armedSlot,
  headScale,
  haloScale,
  trailWidth,
  nucleusColor,
  showGuides,
  globalScaledTimeRef,
  reducedMotion,
}: {
  upHats: Vec3[]
  initialPhases: number[]
  slotLocations: SlotLocation[]
  electronColors: string[]
  armedSlot: number | null
  headScale: number
  haloScale: number
  trailWidth: number
  nucleusColor: string
  showGuides: boolean
  globalScaledTimeRef: React.MutableRefObject<number>
  reducedMotion: boolean
}) {
  // Per-canvas textures — Three textures don't share across separate WebGL
  // contexts, so the mini canvas owns its own copy.
  const fadeTex = useMemo(() => makeFadeTexture(5), [])
  const orbTex = useMemo(() => makeSoftOrbTexture(), [])

  return (
    <Canvas
      camera={{ position: [2.6, 1.7, 2.6], fov: 35 }}
      style={{ width: '100%', aspectRatio: '1 / 1', background: 'transparent' }}
      aria-hidden="true"
    >
      <TrackballControls makeDefault rotateSpeed={2.5} noPan noZoom />
      <MiniNucleus color={nucleusColor} />
      {upHats.map((upHat, i) => {
        // When guides are off, only render the armed-slot ring (the red
        // delete-arm signal still needs to be visible).
        if (!showGuides && armedSlot !== i) return null
        return (
          <OrbitRing
            key={`ring-${i}`}
            upHat={upHat}
            armed={armedSlot === i}
          />
        )
      })}
      {upHats.map((upHat, i) =>
        slotLocations[i] !== 'none' ? (
          <MiniOrbitElectron
            key={`e-${i}`}
            upHat={upHat}
            initialPhase={initialPhases[i] ?? 0}
            color={electronColors[i] ?? '#ffdbd8'}
            headScale={headScale}
            haloScale={haloScale}
            trailWidth={trailWidth}
            fadeTex={fadeTex}
            orbTex={orbTex}
            globalScaledTimeRef={globalScaledTimeRef}
            reducedMotion={reducedMotion}
          />
        ) : null,
      )}
    </Canvas>
  )
}
