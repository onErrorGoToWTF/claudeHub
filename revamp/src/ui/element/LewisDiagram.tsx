/*
 * Bohr-Rutherford "Lewis-style" diagram. SVG. Concentric rings + nucleus
 * at center + electrons grouped into cardinal CLUSTERS (top, bottom,
 * right, left) of TIGHT, ORTHOGONAL PAIRS, matching the reference
 * periodic-table card layout.
 *
 * Distribution: K electrons split across 4 cardinal slots in order
 * top → bottom → right → left; first (K mod 4) slots get one extra.
 *
 * Cluster shape per slot of M dots:
 *   M=1 → single dot
 *   M=2 → horizontal pair (along tangent — orthogonal to radial)
 *   M=3 → 2 + 1 (pair + single, stacked radially)
 *   M=4 → 2×2 square
 *   M=5 → 2 + 2 + 1 (vertical 2-2-1 stack — like the reference)
 *   M=6 → 2 + 2 + 2
 *   M=7 → 4 + 3 (4-wide grid; only super-heavy elements)
 *   M=8 → 4 + 4
 *
 * Each electron has a FIXED slot — adding the next electron just lights
 * up the next predetermined position. Sizes (nucleus, ring radii,
 * electron radius, cluster spacing) are constant across every element.
 *
 * Nucleus = outlined circle, NO inner dot — acts as a future tap target
 * for the nuclear-physics zoom view.
 */
import s from './LewisDiagram.module.css'

const SIZE = 200
const NUCLEUS_R = 9
const NUCLEUS_STROKE = 1.2
const ELECTRON_R = 2.6
const RING_BASE = 19
const RING_GAP = 12
const CLUSTER_SPACING = 5.5

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

// Always 2-wide for M ≤ 6 (matches the reference's 2-2-1 vertical stack
// for 5-electron clusters). 4-wide only for M ≥ 7 to keep the radial
// span inside the inter-ring gap on super-heavy elements.
function clusterCols(M: number): number {
  if (M <= 1) return 1
  if (M <= 6) return 2
  return 4
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

      {/* Nucleus = outlined circle only (no center dot). Future tap
          target for the nuclear-physics zoom view. */}
      <circle
        cx={cx}
        cy={cy}
        r={NUCLEUS_R}
        fill="none"
        stroke="currentColor"
        strokeWidth={NUCLEUS_STROKE}
      />

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
