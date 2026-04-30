/*
 * Bohr-style electron diagram. Implements the user-supplied layout spec:
 *
 *   - card-relative factors (multiply by SIZE):
 *       outer radius          0.38
 *       electron radius       0.02
 *       nucleus radius        0.04
 *       pair tangential half  0.04 (used as ±5° angular for tight pairs)
 *   - shell radius           = outerRadius * (shellIndex + 1) / shellCount
 *     (so the outermost ring stays at the same on-card distance for every
 *     element; inner shells fit proportionally)
 *   - electron angles per shell:
 *       K = 2   → [0°, 180°] (across-nucleus horizontal pair)
 *       K ∈ {8, 18, 32} (closed shells) → evenly spaced 360/K, with a
 *         half-step rotation on every other shell so adjacent same-K
 *         shells read as distinct rings
 *       partial valence K  → tight pairs at cardinals (0°, 90°, 180°, 270°)
 *         with ±5° tangential offset; if K is odd, the lone single sits
 *         at the midpoint of the largest unused arc
 *
 * Convention: angle 0° = +x (right), 90° = +y (down in SVG), counter-
 * clockwise math angles. Position formula:
 *   x = cx + r·cos(θ)
 *   y = cy + r·sin(θ)
 *
 * Each electron has a fixed predetermined slot — adding the next
 * electron just lights up the next position. Sizes are constant.
 *
 * Nucleus = outlined circle (no center dot) — future tap target for
 * the nuclear-physics zoom view.
 */
import s from './LewisDiagram.module.css'

const SIZE = 200
const OUTER_RADIUS_FACTOR = 0.38
const ELECTRON_R_FACTOR = 0.02
const NUCLEUS_R_FACTOR = 0.04
const NUCLEUS_STROKE = 1.2
const PAIR_HALF_DEG = 5     // ±5° tangential offset for tight pairs

const OUTER_RADIUS = OUTER_RADIUS_FACTOR * SIZE   // 76
const ELECTRON_R = ELECTRON_R_FACTOR * SIZE       // 4
const NUCLEUS_R = NUCLEUS_R_FACTOR * SIZE         // 8

const CLOSED_K = new Set([8, 18, 32])

function shellRadius(shellIndex: number, shellCount: number): number {
  return OUTER_RADIUS * (shellIndex + 1) / shellCount
}

function evenAngles(K: number, offsetDeg = 0): number[] {
  if (K <= 0) return []
  const step = 360 / K
  return Array.from({ length: K }, (_, k) => offsetDeg + k * step)
}

// Pairs at cardinals in order (0°, 90°, 180°, 270°), ±PAIR_HALF_DEG
// tangential offset. If K is odd, single sits at the midpoint of the
// largest unused arc.
function partialShellAngles(K: number): number[] {
  if (K <= 0) return []
  const cardinals = [0, 90, 180, 270]
  const pairs = Math.min(Math.floor(K / 2), 4)
  const angles: number[] = []
  for (let p = 0; p < pairs; p++) {
    angles.push(cardinals[p] - PAIR_HALF_DEG, cardinals[p] + PAIR_HALF_DEG)
  }
  if (K % 2 === 1) {
    if (pairs === 0) {
      angles.push(0)
    } else if (pairs >= 4) {
      angles.push(45)
    } else {
      const lastUsed = cardinals[pairs - 1] + PAIR_HALF_DEG
      const firstUsedWrap = cardinals[0] - PAIR_HALF_DEG + 360
      angles.push(((lastUsed + firstUsedWrap) / 2) % 360)
    }
  }
  return angles
}

function shellElectronAngles(K: number, shellIndex: number): number[] {
  if (K <= 0) return []
  if (K === 2) return [0, 180]
  if (CLOSED_K.has(K)) {
    const step = 360 / K
    const offset = (shellIndex % 2) * (step / 2)
    return evenAngles(K, offset)
  }
  return partialShellAngles(K)
}

function placeShellElectrons(
  K: number,
  shellIndex: number,
  shellCount: number,
  cx: number,
  cy: number,
) {
  const r = shellRadius(shellIndex, shellCount)
  return shellElectronAngles(K, shellIndex).map(deg => {
    const rad = (deg * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  })
}

export function LewisDiagram({ shells }: { shells: number[] }) {
  const cx = SIZE / 2
  const cy = SIZE / 2 + SIZE * 0.04
  const shellCount = shells.length

  return (
    <svg
      className={s.diagram}
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
    >
      {shells.map((_, i) => (
        <circle
          key={`ring-${i}`}
          cx={cx}
          cy={cy}
          r={shellRadius(i, shellCount)}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.8}
          opacity={0.32}
        />
      ))}

      <circle
        cx={cx}
        cy={cy}
        r={NUCLEUS_R}
        fill="none"
        stroke="currentColor"
        strokeWidth={NUCLEUS_STROKE}
      />

      {shells.map((K, i) =>
        placeShellElectrons(K, i, shellCount, cx, cy).map((pos, j) => (
          <circle
            key={`e-${i}-${j}`}
            cx={pos.x}
            cy={pos.y}
            r={ELECTRON_R}
            fill="currentColor"
          />
        )),
      )}
    </svg>
  )
}
