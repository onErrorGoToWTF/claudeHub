/*
 * BohrModel — single-element textbook Bohr diagram. Static. No motion.
 *
 * Geometry (factor names + numbers ported from
 * bamer.biruni.edu.tr/lab/interactive-periodic-table `script.js`):
 *
 *   nucleus radius     0.15 * scale
 *   electron radius    0.06 * scale
 *   shell spacing      0.35 * scale          (innermost = nucleusR + spacing)
 *   ring thickness     0.015 * scale         (RingGeometry inner/outer offset)
 *   shell rings        coplanar on y=0       (rotation x = π/2)
 *   electrons          fixed on the y=0 plane (x = cos θ · r, z = sin θ · r)
 *
 * Random initial tilt on x/z so rings read as 3D rather than dead-on; the
 * group never rotates after mount and the electrons never move. Materials
 * use emissive + UnrealBloom (in the parent canvas) for the glow.
 */
import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { categoryColorHex, type Element } from '../../db/elements'

const NUCLEUS_RADIUS_FACTOR = 0.15
const ELECTRON_RADIUS_FACTOR = 0.06
const SHELL_SPACING_FACTOR = 0.35
const RING_THICKNESS_FACTOR = 0.015

const NUCLEUS_BASE_EMISSIVE = 0.3
const ELECTRON_BASE_EMISSIVE = 0.4

const ELECTRON_COLOR = 0x66ccff
const RING_COLOR = 0xaaaaaa

type Shell = {
  shellIdx: number
  radius: number
  numElectrons: number
  baseAngleOffset: number
}

export type BohrModelProps = {
  element: Element
  scale?: number
}

export function BohrModel({ element, scale = 1 }: BohrModelProps) {
  const nucleusR = NUCLEUS_RADIUS_FACTOR * scale
  const electronR = ELECTRON_RADIUS_FACTOR * scale
  const shellSpacing = SHELL_SPACING_FACTOR * scale
  const ringT = RING_THICKNESS_FACTOR * scale

  const nucleusColor = categoryColorHex(element.category)

  const shells = useMemo<Shell[]>(() => {
    const out: Shell[] = []
    let r = nucleusR + shellSpacing
    element.electronsPerShell.forEach((n, idx) => {
      out.push({
        shellIdx: idx,
        radius: r,
        numElectrons: n,
        baseAngleOffset: idx * 0.5,
      })
      r += shellSpacing
    })
    return out
  }, [element, nucleusR, shellSpacing])

  const initialRotation = useMemo<[number, number, number]>(
    () => [
      (Math.random() - 0.5) * 0.2,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.2,
    ],
    [],
  )

  return (
    <group rotation={initialRotation}>
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

      {shells.map((shell) => (
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

          {/* Electrons — frozen at their computed angle, no animation */}
          {Array.from({ length: shell.numElectrons }).map((_, i) => {
            const angle = shell.baseAngleOffset + (i / shell.numElectrons) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * shell.radius, 0, Math.sin(angle) * shell.radius]}
              >
                <sphereGeometry args={[electronR, 8, 6]} />
                <meshStandardMaterial
                  color={ELECTRON_COLOR}
                  emissive={ELECTRON_COLOR}
                  emissiveIntensity={ELECTRON_BASE_EMISSIVE}
                  roughness={0.5}
                  metalness={0.1}
                />
              </mesh>
            )
          })}
        </group>
      ))}
    </group>
  )
}
