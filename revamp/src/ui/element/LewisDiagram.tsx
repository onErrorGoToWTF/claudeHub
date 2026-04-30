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
// Inner-anchored ring layout: n=1 always at RING_BASE; each next shell
// is RING_GAP further out. Heaviest natural element (Z=87, 7 shells)
// lands at r = 14 + 6·12 = 86, leaving margin inside the 200 viewBox.
// Tight by design — Phase-1 elements (1–2 shells) cluster near center.
const RING_BASE = 14
const RING_GAP = 12

function ringRadius(shellIndex: number): number {
  return RING_BASE + shellIndex * RING_GAP
}

// Pair offset in degrees, sized so the paired-dot on-screen gap stays
// roughly constant across rings (small offset on outer rings, larger
// on inner rings).
function pairOffsetDeg(r: number): number {
  return (2.6 * ELECTRON_R / r) * (180 / Math.PI)
}

// Canonical Lewis-octet placement for K electrons on the given shell.
//   Shell 0 (n=1, max 2): K=1 → top; K=2 → top + bottom
//   Shell 1+ (n=2+, max 8): cardinals filled in order top, bottom, right,
//   left; once all four are singled, pair up at each in same order with
//   a tangential offset that scales to keep the on-screen pair-gap
//   consistent regardless of ring radius.
function bohrPositions(K: number, shellIndex: number): number[] {
  if (K <= 0) return []

  if (shellIndex === 0) {
    if (K === 1) return [0]
    return [0, 180]
  }

  const off = pairOffsetDeg(ringRadius(shellIndex))
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
      if (idx >= 0) positions[idx] = center - off
      positions.push(center + off)
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
          r={ringRadius(i)}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.8}
          opacity={0.32}
        />
      ))}

      <circle cx={cx} cy={cy} r={NUCLEUS_R} fill="currentColor" />

      {shells.map((K, i) => {
        const r = ringRadius(i)
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
