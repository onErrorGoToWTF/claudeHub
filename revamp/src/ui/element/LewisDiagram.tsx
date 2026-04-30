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
 *   shell 2: 4 cardinals (N, E, S, W)
 *   shell 3+: cardinals first, then ordinals (NE, SE, SW, NW)
 *
 * Fill order (Hund-style, clockwise from N within each axis group):
 *   for each stack k = 0, 1, 2, …
 *     for each axis group (cardinals → ordinals):
 *       singles round: drop a single at every axis in order
 *       pairs round: convert each single into a pair, same order
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

// Pair offset is RADIAL — the two dots of a pair sit ON the axis line,
// one slightly inward and one slightly outward of the ring radius. This
// keeps every electron on its axis, so a ruler placed horizontally /
// vertically / on a 45° diagonal through the nucleus hits every dot
// that lives on that axis (singles and both pair-mates).
const PAIR_HALF_GAP = 5
// Radial step between stack levels along an axis (pixels).
const STACK_STEP = 11

const N = -Math.PI / 2
const E = 0
const S = Math.PI / 2
const W = Math.PI
const NE = -Math.PI / 4
const SE = Math.PI / 4
const SW = (3 * Math.PI) / 4
const NW = (-3 * Math.PI) / 4

// Axis groups. Within a shell, all electrons fill the cardinals group
// (singles round → pairs round) BEFORE any ordinal slot opens. This
// matches the user's reference: Cl (shell 3 = 7e) = pairs N/E/S + single
// W — cardinals only, not spread across 8 axes.
const CARDINALS = [N, E, S, W]
const ORDINALS = [NE, SE, SW, NW]

// Per-shell axis groups, filled in order. shellIdx is 0-based.
const AXIS_GROUPS_BY_SHELL: number[][][] = [
  [[N]],                       // shell 1: just N
  [CARDINALS],                 // shell 2: cardinals only
  [CARDINALS, ORDINALS],       // shell 3+: cardinals first, then ordinals
]

function axisGroupsForShell(shellIdx: number): number[][] {
  return AXIS_GROUPS_BY_SHELL[Math.min(shellIdx, AXIS_GROUPS_BY_SHELL.length - 1)]
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
  const groups = axisGroupsForShell(shellIdx)
  const baseR = shellRadius(shellIdx)
  const dots: Dot[] = []
  let placed = 0
  let stack = 0

  while (placed < K) {
    const r = baseR + stack * STACK_STEP

    // Within one stack level: fill each axis group fully (singles round
    // then pairs round) before opening the next group.
    for (let g = 0; g < groups.length && placed < K; g++) {
      const group = groups[g]
      // Track which axes in this group at this stack level hold a single.
      const singleIndex: number[] = []

      // Singles round.
      for (let i = 0; i < group.length && placed < K; i++) {
        const θ = group[i]
        dots.push({ x: cx + r * Math.cos(θ), y: cy + r * Math.sin(θ) })
        singleIndex.push(dots.length - 1)
        placed++
      }

      // Pairs round — promote each single to a pair, in same order.
      // Pair offset is RADIAL: dots sit on the axis line, one inward
      // and one outward of the ring radius by PAIR_HALF_GAP.
      for (let i = 0; i < singleIndex.length && placed < K; i++) {
        const θ = group[i]
        const idx = singleIndex[i]
        const ax = dots[idx].x
        const ay = dots[idx].y
        // Radial unit vector along the axis: (cos θ, sin θ)
        const nx = Math.cos(θ)
        const ny = Math.sin(θ)
        dots[idx] = { x: ax - PAIR_HALF_GAP * nx, y: ay - PAIR_HALF_GAP * ny }
        dots.push({ x: ax + PAIR_HALF_GAP * nx, y: ay + PAIR_HALF_GAP * ny })
        placed++
      }
    }

    if (placed < K) {
      // All groups saturated at this stack — open the next stack.
      stack++
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
