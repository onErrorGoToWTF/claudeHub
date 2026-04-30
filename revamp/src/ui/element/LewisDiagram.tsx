/*
 * Bohr-Rutherford "Lewis-style" diagram. SVG. Concentric rings + nucleus
 * at center + electrons grouped into cardinal CLUSTERS (top, bottom,
 * right, left), matching the reference periodic-table card layout.
 *
 * Distribution rule: K electrons split across 4 cardinal slots in order
 * top → bottom → right → left; first (K mod 4) slots get one extra dot.
 *
 * Cluster shape per slot of M dots: a tight grid centered on the ring.
 *   M=1 → single dot
 *   M=2 → horizontal pair (along the tangent)
 *   M=3 → 2 + 1 triangle pointing radially outward
 *   M=4 → 2×2 square
 *   M=5–9 → 3-wide grid; last partial row centered tangentially
 *
 * Sizes are locked: nucleus, ring radii, electron radius, cluster
 * spacing all stay constant across every element. Cluster radial span
 * stays inside the inter-ring gap.
 *
 * Nucleus is a small outlined circle with an inner dot (acts as a
 * future tap target for the nuclear-physics zoom view).
 */
import s from './LewisDiagram.module.css'

const SIZE = 200
const NUCLEUS_OUTER_R = 9
const NUCLEUS_INNER_R = 2.6
const NUCLEUS_STROKE = 1.2
const ELECTRON_R = 3
const RING_BASE = 19
const RING_GAP = 10
const CLUSTER_SPACING = 6.5

const CARDINALS = [0, 180, 90, 270] as const   // top, bottom, right, left

function ringRadius(shellIndex: number): number {
  return RING_BASE + shellIndex * RING_GAP
}

// Split K across 4 cardinal slots; first (K mod 4) get one extra.
function distributeToCardinals(K: number): [number, number, number, number] {
  if (K <= 0) return [0, 0, 0, 0]
  const base = Math.floor(K / 4)
  const rem = K % 4
  return [
    base + (0 < rem ? 1 : 0),
    base + (1 < rem ? 1 : 0),
    base + (2 < rem ? 1 : 0),
    base + (3 < rem ? 1 : 0),
  ]
}

// Adaptive grid width: 2 cols for tight clusters (≤4), 3 cols for 5+.
// Keeps the radial span small relative to the inter-ring gap so the
// 18-electron shells (max cluster of 5 with our rule) don't crowd
// neighbouring rings.
function clusterCols(M: number): number {
  if (M <= 1) return 1
  if (M <= 4) return 2
  return 3
}

// Cluster-local (tangent, radial) offsets in CLUSTER_SPACING units.
// Tangent runs along the ring (perpendicular to radial). Radial runs
// outward from the nucleus. Cluster is centered on the ring point.
// Last partial row is centered tangentially.
function clusterOffsets(M: number): Array<[number, number]> {
  if (M <= 0) return []
  if (M === 1) return [[0, 0]]
  const cols = clusterCols(M)
  const rows = Math.ceil(M / cols)
  const out: Array<[number, number]> = []
  for (let i = 0; i < M; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const isLastRow = row === rows - 1
    const dotsInRow = isLastRow ? M - row * cols : cols
    const colOffset = (cols - dotsInRow) / 2
    const tangent = col + colOffset - (cols - 1) / 2
    const radial = row - (rows - 1) / 2
    out.push([tangent, radial])
  }
  return out
}

function placeShellElectrons(K: number, r: number, cx: number, cy: number) {
  if (K <= 0) return [] as Array<{ x: number; y: number }>
  const slots = distributeToCardinals(K)
  const result: Array<{ x: number; y: number }> = []
  for (let s = 0; s < 4; s++) {
    const M = slots[s]
    if (M === 0) continue
    const dirRad = (CARDINALS[s] * Math.PI) / 180
    const tx = Math.cos(dirRad)
    const ty = Math.sin(dirRad)
    const rx = Math.sin(dirRad)
    const ry = -Math.cos(dirRad)
    const ringX = cx + r * rx
    const ringY = cy + r * ry
    for (const [t, ρ] of clusterOffsets(M)) {
      result.push({
        x: ringX + t * CLUSTER_SPACING * tx + ρ * CLUSTER_SPACING * rx,
        y: ringY + t * CLUSTER_SPACING * ty + ρ * CLUSTER_SPACING * ry,
      })
    }
  }
  return result
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

      {/* Nucleus = outlined circle + small inner dot. Will become a
          tap target for the nuclear-physics zoom view later. */}
      <circle
        cx={cx}
        cy={cy}
        r={NUCLEUS_OUTER_R}
        fill="none"
        stroke="currentColor"
        strokeWidth={NUCLEUS_STROKE}
      />
      <circle cx={cx} cy={cy} r={NUCLEUS_INNER_R} fill="currentColor" />

      {shells.map((K, i) =>
        placeShellElectrons(K, ringRadius(i), cx, cy).map((pos, j) => (
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
