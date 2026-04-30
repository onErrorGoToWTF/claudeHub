/*
 * Bohr-style electron diagram. Axis-locked geometry:
 *   - Electrons live on 8 axes through the nucleus
 *     (N, E, S, W cardinals + NE, SE, SW, NW ordinals).
 *   - Single = dot centered on its axis line.
 *   - Pair = two dots straddling its axis line with a FIXED PIXEL gap
 *     (identical on every ring — never grows with radius).
 *   - Multiple pairs on the same axis stack RADIALLY OUTWARD with a
 *     fixed pixel step.
 *   - Same-axis electrons across rings are colinear with the nucleus.
 *
 * Per-shell axis sets:
 *   shell 1: N only
 *   shell 2: 4 cardinals
 *   shell 3+: all 8 axes
 *
 * Fill order (Hund-style, clockwise from N):
 *   for each stack k = 0, 1, 2, …
 *     pass 1: drop a single at every axis in order
 *     pass 2: convert each axis's single into a pair, in the same order
 *
 * Angle convention: 0° = +x (right), 90° = down (+y) — SVG.
 */
import s from './LewisDiagram.module.css'

const SIZE = 200
const ELECTRON_R_FACTOR = 0.02
const NUCLEUS_R_FACTOR = 0.04
const NUCLEUS_STROKE = 1.2

// FIXED ring radii — same value for every element. Ring n=1 is always
// at RING_BASE; each subsequent shell adds RING_GAP.
const RING_BASE = 16
const RING_GAP = 12

const ELECTRON_R = ELECTRON_R_FACTOR * SIZE       // 4
const NUCLEUS_R = NUCLEUS_R_FACTOR * SIZE         // 8

// Tangential half-gap of a pair (pixels). Total pair-dot separation = 2×.
const PAIR_HALF_GAP = 4
// Radial step between stack levels along an axis (pixels).
const STACK_STEP = 6

const N = -Math.PI / 2
const E = 0
const S = Math.PI / 2
const W = Math.PI
const NE = -Math.PI / 4
const SE = Math.PI / 4
const SW = (3 * Math.PI) / 4
const NW = (-3 * Math.PI) / 4

// Per-shell axis fill order. shellIdx is 0-based (0 = n=1).
const AXES_BY_SHELL: number[][] = [
  [N],
  [N, E, S, W],
  [N, E, S, W, NE, SE, SW, NW],
]

function axesForShell(shellIdx: number): number[] {
  return AXES_BY_SHELL[Math.min(shellIdx, AXES_BY_SHELL.length - 1)]
}

function shellRadius(shellIndex: number): number {
  return RING_BASE + shellIndex * RING_GAP
}

type Dot = { x: number; y: number }

function computeShellDots(
  shellIdx: number,
  K: number,
  cx: number,
  cy: number,
): Dot[] {
  if (K <= 0) return []
  const axes = axesForShell(shellIdx)
  const baseR = shellRadius(shellIdx)
  // Track per-axis state at the current stack level: 0 = empty, 1 = single, 2 = paired.
  const axisState: number[] = new Array(axes.length).fill(0)
  const dots: Dot[] = []
  let placed = 0
  let stack = 0

  while (placed < K) {
    const r = baseR + stack * STACK_STEP

    // Pass 1: singles at every axis.
    for (let i = 0; i < axes.length && placed < K; i++) {
      if (axisState[i] !== 0) continue
      const θ = axes[i]
      dots.push({ x: cx + r * Math.cos(θ), y: cy + r * Math.sin(θ) })
      axisState[i] = 1
      placed++
    }

    // Pass 2: promote each single to a pair.
    for (let i = 0; i < axes.length && placed < K; i++) {
      if (axisState[i] !== 1) continue
      const θ = axes[i]
      const ax = cx + r * Math.cos(θ)
      const ay = cy + r * Math.sin(θ)
      // Tangent unit vector (perpendicular to axis): (-sin θ, cos θ)
      const tx = -Math.sin(θ)
      const ty = Math.cos(θ)
      // Replace the single (last index in dots that matches) with two pair-dots.
      // Easier: find and rewrite. Walk back through dots at this stack level.
      for (let j = dots.length - 1; j >= 0; j--) {
        if (Math.abs(dots[j].x - ax) < 1e-6 && Math.abs(dots[j].y - ay) < 1e-6) {
          dots[j] = { x: ax - PAIR_HALF_GAP * tx, y: ay - PAIR_HALF_GAP * ty }
          break
        }
      }
      dots.push({ x: ax + PAIR_HALF_GAP * tx, y: ay + PAIR_HALF_GAP * ty })
      axisState[i] = 2
      placed++
    }

    if (placed < K) {
      // Stack k saturated — open the next stack.
      stack++
      axisState.fill(0)
    }
  }

  return dots
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
          r={shellRadius(i)}
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
        computeShellDots(i, K, cx, cy).map((pos, j) => (
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
