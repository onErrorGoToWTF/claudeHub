/*
 * BohrModel — single-element textbook Bohr diagram. Rings static, electrons
 * draggable along their ring with snap-to-compass + automatic pairing.
 *
 * Geometry (factor names + numbers ported from
 * bamer.biruni.edu.tr/lab/interactive-periodic-table `script.js`):
 *
 *   nucleus radius     0.15 * scale
 *   electron radius    0.06 * scale
 *   shell spacing      0.35 * scale          (innermost = nucleusR + spacing)
 *   ring thickness     0.015 * scale         (RingGeometry inner/outer offset)
 *
 * Rings sit in the xy-plane (no rotation), perfect concentric circles when
 * viewed straight on. Electrons start at evenly-spaced initial angles with
 * angle 0 = top of screen ((sin θ · r, cos θ · r, 0)) so ring 1's two land
 * at north and south.
 *
 * Drag → snap → pair:
 *   - Press an electron, drag freely along the ring (radius locked).
 *   - On release the angle snaps to the nearest of 8 compass slots (N, NE,
 *     E, SE, S, SW, W, NW — π/4 apart).
 *   - When multiple electrons land in the same compass slot the shell
 *     redistributes them evenly around that slot, separated by a fixed
 *     world-space chord PAIR_CHORD. 1 = exact compass; 2 = pair flanking
 *     the compass; 3 = triple straddling it; etc.
 *   - Electrons that haven't been dragged yet stay at their initial
 *     evenly-spaced angle (slot = null) and don't participate in pairing.
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

// Snap geometry. 8 compass slots → π/4 apart. Pair separation is a fixed
// chord in world units (not radians) so pairs read at the same physical
// gap on every shell — the inner rings would otherwise overlap.
const COMPASS_COUNT = 8
const COMPASS_STEP = (Math.PI * 2) / COMPASS_COUNT
const PAIR_CHORD = 0.18

// Reused for every pointer-move ray-plane intersection. Allocating new
// Vector3s per event would cause GC pressure during sustained drags.
const Z_PLANE = new Plane(new Vector3(0, 0, 1), 0)
const HIT = new Vector3()

function nearestCompassSlot(angle: number): number {
  const TWO_PI = Math.PI * 2
  const norm = ((angle % TWO_PI) + TWO_PI) % TWO_PI
  return Math.round(norm / COMPASS_STEP) % COMPASS_COUNT
}

function slotToAngle(slot: number): number {
  return slot * COMPASS_STEP
}

// Convert a desired chord length into the angular span it subtends on a
// ring of the given radius. Clamped so very small radii don't overshoot.
function chordToAngle(chord: number, radius: number): number {
  return 2 * Math.asin(Math.min(chord / (2 * radius), 1))
}

type Shell = {
  shellIdx: number
  radius: number
  numElectrons: number
  baseAngleOffset: number
}

type DraggableElectronProps = {
  angle: number
  radius: number
  electronR: number
  onRelease: (releaseAngle: number) => void
}

function DraggableElectron({ angle, radius, electronR, onRelease }: DraggableElectronProps) {
  const [dragAngle, setDragAngle] = useState<number | null>(null)
  const dragging = dragAngle !== null
  const renderAngle = dragAngle ?? angle

  const x = Math.sin(renderAngle) * radius
  const y = Math.cos(renderAngle) * radius

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setDragAngle(angle)
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return
    e.stopPropagation()
    if (!e.ray.intersectPlane(Z_PLANE, HIT)) return
    setDragAngle(Math.atan2(HIT.x, HIT.y))
  }

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (dragAngle === null) return
    e.stopPropagation()
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    const finalAngle = dragAngle
    setDragAngle(null)
    onRelease(finalAngle)
  }

  return (
    <mesh
      position={[x, y, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDragAngle(null)}
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

type ShellWithElectronsProps = {
  shell: Shell
  electronR: number
  ringT: number
}

function ShellWithElectrons({ shell, electronR, ringT }: ShellWithElectronsProps) {
  const initialAngles = useMemo(
    () =>
      Array.from(
        { length: shell.numElectrons },
        (_, i) => shell.baseAngleOffset + (i / shell.numElectrons) * Math.PI * 2,
      ),
    [shell.baseAngleOffset, shell.numElectrons],
  )

  // slots[i] = compass slot 0..7 once electron i has been dragged + released,
  // null while it's still at its initial evenly-spaced angle.
  const [slots, setSlots] = useState<(number | null)[]>(() =>
    Array(shell.numElectrons).fill(null),
  )

  const renderAngles = useMemo(() => {
    const pairStep = chordToAngle(PAIR_CHORD, shell.radius)
    return slots.map((slot, i) => {
      if (slot === null) return initialAngles[i]
      const sameSlot: number[] = []
      slots.forEach((s, j) => {
        if (s === slot) sameSlot.push(j)
      })
      const positionInSlot = sameSlot.indexOf(i)
      const K = sameSlot.length
      // Center the slot's K members around the compass angle.
      // 1 → offset 0; 2 → ±pairStep/2; 3 → -pairStep, 0, +pairStep; etc.
      return slotToAngle(slot) + (positionInSlot - (K - 1) / 2) * pairStep
    })
  }, [slots, initialAngles, shell.radius])

  const handleRelease = (idx: number, releasedAngle: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[idx] = nearestCompassSlot(releasedAngle)
      return next
    })
  }

  return (
    <group>
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

      {renderAngles.map((angle, i) => (
        <DraggableElectron
          key={i}
          angle={angle}
          radius={shell.radius}
          electronR={electronR}
          onRelease={(releasedAngle) => handleRelease(i, releasedAngle)}
        />
      ))}
    </group>
  )
}

export type BohrModelProps = {
  element: ChemElement
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
        <ShellWithElectrons
          key={shell.shellIdx}
          shell={shell}
          electronR={electronR}
          ringT={ringT}
        />
      ))}
    </group>
  )
}
