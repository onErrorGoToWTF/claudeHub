import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { ATOM } from './constants'
import { Electron, makeFadeTexture, type OrbitConfig } from './Electron'

export type MotionPolicy = {
  // Render nothing when prefers-reduced-motion is set. Default true.
  respectReducedMotion: boolean
  // After the consumer signals `idle`, switch Canvas frameloop to 'demand'
  // (zero idle CPU). 'always' keeps it rendering forever. Default 'demand'.
  frameloopMode: 'always' | 'demand'
}

const ATOM_DEFAULT_POLICY: MotionPolicy = {
  respectReducedMotion: true,
  frameloopMode: 'demand',
}

export type NucleusProps = {
  position?: [number, number, number]
  render?: 'invisible' | 'sphere' | 'icon'
}

export function Atom({
  electrons,
  nucleus,
  groupRotation = ATOM.scene.groupRotation,
  cameraZ = 11,
  motionPolicy,
  idle = false,
  settleTarget,
  settle,
  onStrike,
  onLand,
  restProgressRef,
}: {
  electrons: OrbitConfig[]
  nucleus?: NucleusProps
  groupRotation?: [number, number, number]
  cameraZ?: number
  motionPolicy?: Partial<MotionPolicy>
  // Consumer signals "no further visual change expected" — Atom flips
  // Canvas frameloop to 'demand' to drop idle CPU to ~0.
  idle?: boolean
  settleTarget?: THREE.Vector3
  settle?: boolean
  onStrike?: () => void
  onLand?: () => void
  restProgressRef?: React.MutableRefObject<number>
}) {
  const policy: MotionPolicy = { ...ATOM_DEFAULT_POLICY, ...motionPolicy }
  const fadeTex = useMemo(() => makeFadeTexture(), [])

  // Track prefers-reduced-motion. Live-updated so a settings change while
  // the page is open takes effect on next render.
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (!policy.respectReducedMotion) return
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [policy.respectReducedMotion])

  if (policy.respectReducedMotion && reducedMotion) return null

  const nucleusRender = nucleus?.render ?? ATOM.nucleus.defaultRender
  const nucleusPos = nucleus?.position ?? ([0, 0, 0] as [number, number, number])
  const frameloop: 'always' | 'demand' =
    idle && policy.frameloopMode === 'demand' ? 'demand' : 'always'

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, cameraZ], fov: 38, near: 0.1, far: 50 }}
      gl={{
        alpha: true,
        antialias: true,
        stencil: false,
        powerPreference: 'high-performance',
      }}
      frameloop={frameloop}
      aria-hidden="true"
    >
      <group rotation={groupRotation}>
        {nucleusRender === 'sphere' && (
          <mesh position={nucleusPos}>
            <sphereGeometry args={[ATOM.nucleus.defaultSize, 16, 16]} />
            <meshBasicMaterial color={ATOM.nucleus.defaultColor} toneMapped={false} />
          </mesh>
        )}
        {electrons.map((cfg) => (
          <Electron
            key={`e-${cfg.plane}-${cfg.phase}`}
            config={cfg}
            fadeTex={fadeTex}
            settleTarget={settleTarget}
            settle={settle}
            onLand={onLand}
            onStrike={onStrike}
            restProgressRef={restProgressRef}
          />
        ))}
      </group>
    </Canvas>
  )
}
