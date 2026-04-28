import { Canvas } from '@react-three/fiber'
import { TrackballControls } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo } from 'react'
import type { Vec3 } from './runtime/types'

type SlotLocation = 'A' | 'B' | 'none'

const SPHERE_RADIUS = 1
const RING_TUBE = 0.014
const POLE_RADIUS = 0.05
const X_AXIS = new THREE.Vector3(1, 0, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

function OrbitRing({
  upHat,
  occupied,
  armed,
  color,
}: {
  upHat: Vec3
  occupied: boolean
  armed: boolean
  color: string
}) {
  const quaternion = useMemo(() => {
    const upVec = new THREE.Vector3(upHat[0], upHat[1], upHat[2])
    const normal = new THREE.Vector3().crossVectors(X_AXIS, upVec).normalize()
    return new THREE.Quaternion().setFromUnitVectors(Z_AXIS, normal)
  }, [upHat])

  const ringColor = armed ? '#ff5050' : occupied ? color : '#9aa0a6'
  const opacity = armed || occupied ? 0.95 : 0.18
  const tubeRadius = armed ? RING_TUBE * 1.6 : RING_TUBE

  return (
    <mesh quaternion={quaternion}>
      <torusGeometry args={[SPHERE_RADIUS, tubeRadius, 8, 96]} />
      <meshBasicMaterial color={ringColor} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function ChordPoles() {
  return (
    <group>
      {[1, -1].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <sphereGeometry args={[POLE_RADIUS, 12, 12]} />
          <meshBasicMaterial color="#cfd2d6" />
        </mesh>
      ))}
    </group>
  )
}

export function OrbitMap({
  upHats,
  slotLocations,
  electronColors,
  armedSlot,
}: {
  upHats: Vec3[]
  slotLocations: SlotLocation[]
  electronColors: string[]
  armedSlot: number | null
}) {
  return (
    <Canvas
      camera={{ position: [2.6, 1.7, 2.6], fov: 35 }}
      style={{ width: '100%', aspectRatio: '1 / 1', background: 'transparent' }}
      aria-hidden="true"
    >
      <TrackballControls makeDefault rotateSpeed={2.5} noPan noZoom />
      <ChordPoles />
      {upHats.map((upHat, i) => (
        <OrbitRing
          key={i}
          upHat={upHat}
          occupied={slotLocations[i] !== 'none'}
          armed={armedSlot === i}
          color={electronColors[i] ?? '#9aa0a6'}
        />
      ))}
    </Canvas>
  )
}
