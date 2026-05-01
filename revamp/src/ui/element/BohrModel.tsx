/*
 * BohrModel — single-element textbook Bohr diagram, rendered as flat coplanar
 * rings tilted in 3D so the user can orbit around it.
 *
 * Geometry recipe (ported from bamer.biruni.edu.tr/lab/interactive-periodic-table
 * `script.js` — same factor names, same numbers):
 *
 *   nucleus radius     0.15 * scale
 *   electron radius    0.06 * scale
 *   shell spacing      0.35 * scale          (innermost = nucleusR + spacing)
 *   ring thickness     0.015 * scale         (RingGeometry inner/outer offset)
 *   shell rings        coplanar on y=0       (rotation x = π/2)
 *   electrons          orbit the y=0 plane   (x = cos θ · r, z = sin θ · r)
 *
 * Per-shell speed factor matches the reference:
 *   speed = ANIMATION_SPEED · (1 + (totalShells − shellIdx) · 0.1)
 * — inner shells rotate slightly faster than outer ones.
 *
 * The whole group also rotates slowly around y so the diagram is never
 * frozen, plus a small random initial tilt on x/z so each mount looks
 * organic. Materials use emissive + UnrealBloom in the parent canvas to
 * get the glowing-electron look.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, type Group } from 'three'
import { categoryColorHex, type Element } from '../../db/elements'

const NUCLEUS_RADIUS_FACTOR = 0.15
const ELECTRON_RADIUS_FACTOR = 0.06
const SHELL_SPACING_FACTOR = 0.35
const RING_THICKNESS_FACTOR = 0.015
const ANIMATION_SPEED = 0.3
const GROUP_Y_ROT_PER_SEC = 0.03 // ~0.0005 rad/frame at 60fps

const NUCLEUS_BASE_EMISSIVE = 0.3
const ELECTRON_BASE_EMISSIVE = 0.4

const ELECTRON_COLOR = 0x66ccff
const RING_COLOR = 0xaaaaaa

type Shell = {
  shellIdx: number
  radius: number
  numElectrons: number
  speedFactor: number
  baseAngleOffset: number
}

export type BohrModelProps = {
  element: Element
  scale?: number
}

export function BohrModel({ element, scale = 1 }: BohrModelProps) {
  const groupRef = useRef<Group>(null!)
  const shellGroupsRef = useRef<Array<Group | null>>([])

  const nucleusR = NUCLEUS_RADIUS_FACTOR * scale
  const electronR = ELECTRON_RADIUS_FACTOR * scale
  const shellSpacing = SHELL_SPACING_FACTOR * scale
  const ringT = RING_THICKNESS_FACTOR * scale

  const nucleusColor = categoryColorHex(element.category)
  const totalShells = element.electronsPerShell.length

  const shells = useMemo<Shell[]>(() => {
    const out: Shell[] = []
    let r = nucleusR + shellSpacing
    element.electronsPerShell.forEach((n, idx) => {
      out.push({
        shellIdx: idx,
        radius: r,
        numElectrons: n,
        speedFactor: ANIMATION_SPEED * (1 + (totalShells - idx) * 0.1),
        baseAngleOffset: idx * 0.5,
      })
      r += shellSpacing
    })
    return out
  }, [element, nucleusR, shellSpacing, totalShells])

  // Random initial tilt + a randomized phase offset so refresh-to-refresh the
  // electrons aren't always at the same starting angle.
  const initialRotation = useMemo<[number, number, number]>(
    () => [
      (Math.random() - 0.5) * 0.2,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.2,
    ],
    [],
  )
  const phaseOffset = useMemo(() => Math.random() * 100, [])

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += GROUP_Y_ROT_PER_SEC * delta
    }
    const t = state.clock.elapsedTime + phaseOffset
    shells.forEach((shell, idx) => {
      const shellGroup = shellGroupsRef.current[idx]
      if (!shellGroup) return
      const children = shellGroup.children
      for (let i = 0; i < children.length; i++) {
        const angle = shell.baseAngleOffset + (i / shell.numElectrons) * Math.PI * 2 + t * shell.speedFactor
        children[i].position.set(Math.cos(angle) * shell.radius, 0, Math.sin(angle) * shell.radius)
      }
    })
  })

  return (
    <group ref={groupRef} rotation={initialRotation}>
      {/* Nucleus */}
      <mesh>
        <sphereGeometry args={[nucleusR, 16, 12]} />
        <meshStandardMaterial
          color={nucleusColor}
          emissive={nucleusColor}
          emissiveIntensity={NUCLEUS_BASE_EMISSIVE}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {shells.map((shell, idx) => (
        <group key={shell.shellIdx}>
          {/* Shell ring (flat on the y=0 plane) */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[shell.radius - ringT, shell.radius + ringT, 64]} />
            <meshStandardMaterial
              color={RING_COLOR}
              side={DoubleSide}
              transparent
              opacity={0.3}
              roughness={0.8}
              metalness={0}
            />
          </mesh>

          {/* Electrons — useFrame writes their positions every tick */}
          <group ref={(el) => { shellGroupsRef.current[idx] = el }}>
            {Array.from({ length: shell.numElectrons }).map((_, i) => (
              <mesh key={i}>
                <sphereGeometry args={[electronR, 8, 6]} />
                <meshStandardMaterial
                  color={ELECTRON_COLOR}
                  emissive={ELECTRON_COLOR}
                  emissiveIntensity={ELECTRON_BASE_EMISSIVE}
                  roughness={0.5}
                  metalness={0.1}
                />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  )
}
