/*
 * Bohr-Rutherford "Lewis-style" diagram. SVG. Concentric rings + nucleus
 * at center + electrons placed at canonical Lewis-octet positions.
 *
 * Sizes are locked: nucleus, ring radii, electron radius stay constant
 * across all elements. Reality lives in a future deep-zoom layer
 * (orbital-probability shapes), not here.
 */
import s from './LewisDiagram.module.css'

const SIZE = 200
const NUCLEUS_R = 5
const ELECTRON_R = 2.6
const SHELL_RADII = [26, 48, 70, 92]
const PAIR_OFFSET_DEG = 6

// Canonical Lewis-octet placement for K electrons on the given shell.
//   Shell 0 (n=1, max 2): K=1 → top; K=2 → top + bottom
//   Shell 1+ (n=2+, max 8): cardinals filled in order top, bottom, right,
//   left; once all four are singled, pair up at each in same order with
//   a small tangential offset.
function bohrPositions(K: number, shellIndex: number): number[] {
  if (K <= 0) return []

  if (shellIndex === 0) {
    if (K === 1) return [0]
    return [0, 180]
  }

  const PAIR_ORDER = [0, 180, 90, 270]   // top, bottom, right, left
  const positions: number[] = []
  const filledOnce = [false, false, false, false]

  for (let i = 0; i < K; i++) {
    const slot = i % 4
    const center = PAIR_ORDER[slot]
    if (!filledOnce[slot]) {
      positions.push(center)
      filledOnce[slot] = true
    } else {
      const idx = positions.indexOf(center)
      if (idx >= 0) positions[idx] = center - PAIR_OFFSET_DEG
      positions.push(center + PAIR_OFFSET_DEG)
    }
  }
  return positions
}

function angleToXY(angleDeg: number, radius: number, cx: number, cy: number) {
  // 0° = top, clockwise. SVG y-axis points down.
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + radius * Math.sin(rad),
    y: cy - radius * Math.cos(rad),
  }
}

export function LewisDiagram({ shells }: { shells: number[] }) {
  const cx = SIZE / 2
  const cy = SIZE / 2 + SIZE * 0.04

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
          r={SHELL_RADII[i] ?? SHELL_RADII[SHELL_RADII.length - 1]}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.8}
          opacity={0.32}
        />
      ))}

      <circle cx={cx} cy={cy} r={NUCLEUS_R} fill="currentColor" />

      {shells.map((K, i) => {
        const r = SHELL_RADII[i] ?? SHELL_RADII[SHELL_RADII.length - 1]
        return bohrPositions(K, i).map((angleDeg, j) => {
          const { x, y } = angleToXY(angleDeg, r, cx, cy)
          return (
            <circle
              key={`e-${i}-${j}`}
              cx={x}
              cy={y}
              r={ELECTRON_R}
              fill="currentColor"
            />
          )
        })
      })}
    </svg>
  )
}
