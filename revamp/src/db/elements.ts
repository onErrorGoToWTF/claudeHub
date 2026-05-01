/*
 * Element data for /labs/elements 3D Bohr models.
 *
 * Schema is intentionally compact: enough to draw a textbook Bohr diagram
 * (shell counts, category color) plus the info-panel basics. Add elements
 * one at a time as labs need them — no need to seed all 118 up front.
 *
 * Category color hexes ported verbatim from the Three.js reference at
 * bamer.biruni.edu.tr/lab/interactive-periodic-table.
 */

export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth-metal'
  | 'lanthanide'
  | 'actinide'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'diatomic-nonmetal'
  | 'polyatomic-nonmetal'
  | 'reactive-nonmetal'
  | 'noble-gas'
  | 'unknown'

export type Element = {
  number: number
  symbol: string
  name: string
  mass: number
  category: ElementCategory
  /** Bohr-shell electron counts, innermost first. Length = shell count. */
  electronsPerShell: number[]
}

export const ELEMENTS: Record<string, Element> = {
  Og: {
    number: 118,
    symbol: 'Og',
    name: 'Oganesson',
    mass: 294,
    category: 'noble-gas',
    electronsPerShell: [2, 8, 18, 32, 32, 18, 8],
  },
}

export function categoryColorHex(category: ElementCategory): number {
  switch (category) {
    case 'alkali-metal': return 0xc62828
    case 'alkaline-earth-metal': return 0xad8c00
    case 'lanthanide': return 0x6a1b9a
    case 'actinide': return 0xd81b60
    case 'transition-metal': return 0x00695c
    case 'post-transition-metal': return 0x455a64
    case 'metalloid': return 0x5d4037
    case 'diatomic-nonmetal':
    case 'polyatomic-nonmetal':
    case 'reactive-nonmetal': return 0x2e7d32
    case 'noble-gas': return 0x01579b
    case 'unknown':
    default: return 0x37474f
  }
}
