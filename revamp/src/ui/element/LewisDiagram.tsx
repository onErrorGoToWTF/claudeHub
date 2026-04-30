/*
 * Bohr-style electron diagram. Implements the user-supplied
 * UNIVERSAL ELECTRON POSITION MAP — fixed slot angles per shell;
 * an element with K electrons in shell i fills the FIRST K entries.
 * Electrons never move when the element changes.
 *
 * Card-relative factors (× SIZE):
 *   outer radius   0.38   electron radius 0.02
 *   nucleus radius 0.04   pair separation 0.04 (encoded as ±5° tangent)
 *
 * Shell radius = outer · (shellIndex + 1) / shellCount — the outermost
 * ring sits at the same on-card distance for every element; inner
 * shells fit proportionally.
 *
 * Angle convention: 0° = +x (right). y = sin(θ) (down in SVG).
 *   x = cx + r·cos(θ)
 *   y = cy + r·sin(θ)
 *
 * Nucleus = outlined circle (no center dot) — future tap target for
 * the nuclear-physics zoom view.
 */
import s from './LewisDiagram.module.css'

const SIZE = 200
const ELECTRON_R_FACTOR = 0.02
const NUCLEUS_R_FACTOR = 0.04
const NUCLEUS_STROKE = 1.2

// FIXED ring radii — same value for every element. Ring n=1 is always
// at RING_BASE; each subsequent shell adds RING_GAP. Heaviest natural
// element (Z=87, 7 shells) lands at 16 + 6·12 = 88, leaving viewBox
// margin for the electron radius.
const RING_BASE = 16
const RING_GAP = 12

const ELECTRON_R = ELECTRON_R_FACTOR * SIZE       // 4
const NUCLEUS_R = NUCLEUS_R_FACTOR * SIZE         // 8

// Per-shell fixed slot angles. First K entries are used.
const SHELL_SLOTS: number[][] = [
  // n=1 (max 2): tight pair around 0°
  [-5, 5],

  // n=2 (max 8): 4 cardinal pairs
  [-5, 5, 85, 95, 175, 185, 265, 275],

  // n=3 (max 18): 9 pairs evenly at 40° step
  [-5, 5, 35, 45, 75, 85, 115, 125, 155, 165, 195, 205, 235, 245, 275, 285, 315, 325],

  // n=4 (max 18 in our visualization): same as n=3 rotated 15°
  [10, 20, 50, 60, 90, 100, 130, 140, 170, 180, 210, 220, 250, 260, 290, 300, 330, 340],

  // n=5: 4 cardinal pairs + diagonal single — partial fills take first K
  [-5, 5, 85, 95, 175, 185, 265, 275, 225],

  // n=6 (max 18): same as n=3
  [-5, 5, 35, 45, 75, 85, 115, 125, 155, 165, 195, 205, 235, 245, 275, 285, 315, 325],

  // n=7 (max 8): same as n=2
  [-5, 5, 85, 95, 175, 185, 265, 275],
]

function shellRadius(shellIndex: number): number {
  return RING_BASE + shellIndex * RING_GAP
}

function shellElectronAngles(K: number, shellIndex: number): number[] {
  const slots = SHELL_SLOTS[shellIndex] ?? SHELL_SLOTS[SHELL_SLOTS.length - 1]
  return slots.slice(0, K)
}

function placeShellElectrons(
  K: number,
  shellIndex: number,
  cx: number,
  cy: number,
) {
  const r = shellRadius(shellIndex)
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
        placeShellElectrons(K, i, cx, cy).map((pos, j) => (
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
