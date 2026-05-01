/*
 * BohrModel — single-element textbook Bohr diagram. Static rings, drag-to-
 * reposition electrons.
 *
 * Geometry (factor names + numbers ported from
 * bamer.biruni.edu.tr/lab/interactive-periodic-table `script.js`):
 *
 *   nucleus radius     0.15 * scale
 *   electron radius    0.06 * scale
 *   shell spacing      0.35 * scale          (innermost = nucleusR + spacing)
 *   ring thickness     0.015 * scale         (RingGeometry inner/outer offset)
 *
 * Rings sit in the xy-plane (no rotation) so they render as perfect
 * concentric circles when viewed straight on. Electrons are placed at
 * angle 0 = top of screen (position = (sin θ · r, cos θ · r, 0)) so
 * ring 1's two electrons land at north and south.
 *
 * Drag: each electron captures its pointer on press, then re-projects
 * the pointer ray onto the z=0 plane every move and snaps to that angle
 * at its ring's fixed radius. The electron stays on its ring — only the
 * angle changes.
 */
import { useMemo, useState } from 'react'
import { DoubleSide, Plane, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { categoryColorHex, type Element as ChemElement } from '../../db/elements'

const NUCLEUS_RADIUS_FACTOR = 0.15
const ELECTRON_RADIUS_FACTOR = 0.06
const SHELL_SPACING_FACTOR = 0.35
const RING_THICKNESS_FACTOR = 0.015

const NUCLEUS_BASE_EMISSIVE = 0.3
const ELECTRON_BASE_EMISSIVE = 0.4
const ELECTRON_DRAG_EMISSIVE = 0.9

const ELECTRON_COLOR = 0x66ccff
const RING_COLOR = 0xaaaaaa

// Reused for every pointer-move ray-plane intersection. Allocating a new
// Vector3 per event would generate GC pressure during sustained drags.
const Z_PLANE = new Plane(new Vector3(0, 0, 1), 0)
const HIT = new Vector3()

type Shell = {
  shellIdx: number
  radius: number
  numElectrons: number
  baseAngleOffset: number
}

export type BohrModelProps = {
  element: ChemElement
  scale?: number
}

type DraggableElectronProps = {
  initialAngle: number
  radius: number
  electronR: number
}

function DraggableElectron({ initialAngle, radius, electronR }: DraggableElectronProps) {
  const [angle, setAngle] = useState(initialAngle)
  const [dragging, setDragging] = useState(false)

  const x = Math.sin(angle) * radius
  const y = Math.cos(angle) * radius

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return
    e.stopPropagation()
    if (!e.ray.intersectPlane(Z_PLANE, HIT)) return
    // atan2(x, y) keeps angle 0 = top of screen, increasing clockwise —
    // matches the (sin θ · r, cos θ · r) placement convention.
    setAngle(Math.atan2(HIT.x, HIT.y))
  }

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    setDragging(false)
  }

  return (
    <mesh
      position={[x, y, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDragging(false)}
    >
      <sphereGeometry args={[electronR, 8, 6]} />
      <meshStandardMaterial
        color={ELECTRON_COLOR}
        emissive={ELECTRON_COLOR}
        emissiveIntensity={dragging ? ELECTRON_DRAG_EMISSIVE : ELECTRON_BASE_EMISSIVE}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  )
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

  return (
    <group>
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
          {/* Shell ring — flat in the xy-plane, perfect circle to camera */}
          <mesh>
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

          {/* Electrons — angle 0 = top (north), placed every 2π/n. Drag
              each one along its ring (radius is locked, only angle moves). */}
          {Array.from({ length: shell.numElectrons }).map((_, i) => {
            const initialAngle =
              shell.baseAngleOffset + (i / shell.numElectrons) * Math.PI * 2
            return (
              <DraggableElectron
                key={`${shell.shellIdx}-${i}`}
                initialAngle={initialAngle}
                radius={shell.radius}
                electronR={electronR}
              />
            )
          })}
        </group>
      ))}
    </group>
  )
}
