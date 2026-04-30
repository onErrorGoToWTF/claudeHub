/*
 * /labs/hydrogen — single hydrogen atom on stage.
 *
 * 1 nucleus (proton) + 1 electron orbiting on the xy plane. Trackball
 * camera so the user can drag to see the orbit in 3D. No HUD, no
 * controls. First step toward a hydrogen-first landing.
 */
import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { TrackballControls } from '@react-three/drei'
import { ATOM } from '../ui/atom/constants'
import { Electron, makeFadeTexture, type OrbitConfig } from '../ui/atom/Electron'

const HYDROGEN_ELECTRON: OrbitConfig = {
  plane: 'xy',
  speed: 1.5,
  phase: 0,
  laps: 0,
  postLandVisibility: 1,
  headSize: 0.02,
  haloSize: 0.02,
  trailWidth: 0.08,
}

export function LabsHydrogen() {
  const fadeTex = useMemo(() => makeFadeTexture(), [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0c' }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6], fov: 38, near: 0.1, far: 50 }}
        gl={{
          alpha: true,
          antialias: true,
          stencil: false,
          powerPreference: 'high-performance',
        }}
      >
        <TrackballControls noPan rotateSpeed={2.5} />
        <group rotation={ATOM.scene.groupRotation}>
          <mesh>
            <sphereGeometry args={[0.07, 24, 24]} />
            <meshBasicMaterial
              color="#ffffff"
              toneMapped={false}
              transparent
              opacity={0.85}
            />
          </mesh>
          <Electron config={HYDROGEN_ELECTRON} fadeTex={fadeTex} />
        </group>
      </Canvas>
    </div>
  )
}
