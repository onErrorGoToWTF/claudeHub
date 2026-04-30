/*
 * Bohr-Rutherford "Lewis-style" diagram. SVG. Concentric rings + nucleus
 * at center + electrons grouped into cardinal CLUSTERS (top, bottom,
 * right, left) — the same artistic layout the reference periodic-table
 * cards use.
 *
 * Distribution rule: split K electrons across 4 cardinal slots in order
 * top → bottom → right → left, first slots get one extra when K is not
 * divisible by 4. Each slot's M dots render in a tight 2-column grid
 * centered on the ring point.
 *
 * Nucleus is a small outlined circle with an inner dot — visible as a
 * proper "circle" not just a black dot, and ready to act as a tap area
 * for the future "zoom into the nucleus" feature.
 *
 * Sizes are locked: nucleus, ring radii, electron radius, cluster
 * spacing all stay constant across every element.
 */
import s from './LewisDiagram.module.css'

const SIZE = 200
const NUCLEUS_OUTER_R = 9
const NUCLEUS_INNER_R = 2.6
const NUCLEUS_STROKE = 1.2
const ELECTRON_R = 3
const RING_BASE = 19
const RING_GAP = 10
const CLUSTER_SPACING = 7

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

// Cluster-local positions for M dots in a 2-column grid centered on the
// ring point. Tangent axis runs along the ring; radial axis runs outward
// from the nucleus. Last dot of an odd M is centered tangentially.
function clusterOffsets(M: number): Array<[number, number]> {
  if (M <= 0) return []
  if (M === 1) return [[0, 0]]
  const cols = 2
  const rows = Math.ceil(M / cols)
  const out: Array<[number, number]> = []
  for (let i = 0; i < M; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const radial = row - (rows - 1) / 2
    const isOddLast = M % 2 === 1 && i === M - 1
    const tangent = isOddLast ? 0 : col - 0.5
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
    const dirDeg = CARDINALS[s]
    const dirRad = (dirDeg * Math.PI) / 180
    // tangent (along ring) and radial (outward) unit vectors
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

      {/* Nucleus = outlined circle + small inner dot. Will become a tap
          target for the nuclear-physics zoom view later. */}
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
