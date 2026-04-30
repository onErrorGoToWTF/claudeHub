/*
 * First 8 elements (H–O) — atomic numbers, isotopes, stability flags,
 * orbital configs, default isotopes, and atomic weights. Sources: IUPAC
 * 2023 atomic weights, NIST half-life data, Wikipedia isotope tables.
 *
 * Used by /labs/elements for the periodic-table tile feature. The
 * default-isotope value is the most-abundant naturally occurring
 * isotope and is what the tile shows on first load for each element.
 */

export type Isotope = {
  name: string
  protons: number
  neutrons: number
  electrons: number
  stable: boolean
  orbitals: string
}

export type ElementData = {
  z: number
  symbol: string
  name: string
  isotopes: Isotope[]
  defaultIsotope: string
  atomicWeight: number
  electronConfig: string
}

export const ELEMENTS: ElementData[] = [
  {
    z: 1, symbol: 'H', name: 'Hydrogen',
    defaultIsotope: 'Hydrogen-1', atomicWeight: 1.008,
    electronConfig: '1s¹',
    isotopes: [
      { name: 'Hydrogen-1', protons: 1, neutrons: 0, electrons: 1, stable: true,  orbitals: '1s1' },
      { name: 'Hydrogen-2', protons: 1, neutrons: 1, electrons: 1, stable: true,  orbitals: '1s1' },
      { name: 'Hydrogen-3', protons: 1, neutrons: 2, electrons: 1, stable: false, orbitals: '1s1' },
    ],
  },
  {
    z: 2, symbol: 'He', name: 'Helium',
    defaultIsotope: 'Helium-4', atomicWeight: 4.003,
    electronConfig: '1s²',
    isotopes: [
      { name: 'Helium-3', protons: 2, neutrons: 1, electrons: 2, stable: true, orbitals: '1s2' },
      { name: 'Helium-4', protons: 2, neutrons: 2, electrons: 2, stable: true, orbitals: '1s2' },
    ],
  },
  {
    z: 3, symbol: 'Li', name: 'Lithium',
    defaultIsotope: 'Lithium-7', atomicWeight: 6.94,
    electronConfig: '[He] 2s¹',
    isotopes: [
      { name: 'Lithium-6', protons: 3, neutrons: 3, electrons: 3, stable: true, orbitals: '1s2 2s1' },
      { name: 'Lithium-7', protons: 3, neutrons: 4, electrons: 3, stable: true, orbitals: '1s2 2s1' },
    ],
  },
  {
    z: 4, symbol: 'Be', name: 'Beryllium',
    defaultIsotope: 'Beryllium-9', atomicWeight: 9.012,
    electronConfig: '[He] 2s²',
    isotopes: [
      { name: 'Beryllium-9', protons: 4, neutrons: 5, electrons: 4, stable: true, orbitals: '1s2 2s2' },
    ],
  },
  {
    z: 5, symbol: 'B', name: 'Boron',
    defaultIsotope: 'Boron-11', atomicWeight: 10.81,
    electronConfig: '[He] 2s² 2p¹',
    isotopes: [
      { name: 'Boron-10', protons: 5, neutrons: 5, electrons: 5, stable: true, orbitals: '1s2 2s2 2p1' },
      { name: 'Boron-11', protons: 5, neutrons: 6, electrons: 5, stable: true, orbitals: '1s2 2s2 2p1' },
    ],
  },
  {
    z: 6, symbol: 'C', name: 'Carbon',
    defaultIsotope: 'Carbon-12', atomicWeight: 12.011,
    electronConfig: '[He] 2s² 2p²',
    isotopes: [
      { name: 'Carbon-12', protons: 6, neutrons: 6, electrons: 6, stable: true,  orbitals: '1s2 2s2 2p2' },
      { name: 'Carbon-13', protons: 6, neutrons: 7, electrons: 6, stable: true,  orbitals: '1s2 2s2 2p2' },
      { name: 'Carbon-14', protons: 6, neutrons: 8, electrons: 6, stable: false, orbitals: '1s2 2s2 2p2' },
    ],
  },
  {
    z: 7, symbol: 'N', name: 'Nitrogen',
    defaultIsotope: 'Nitrogen-14', atomicWeight: 14.007,
    electronConfig: '[He] 2s² 2p³',
    isotopes: [
      { name: 'Nitrogen-14', protons: 7, neutrons: 7, electrons: 7, stable: true, orbitals: '1s2 2s2 2p3' },
      { name: 'Nitrogen-15', protons: 7, neutrons: 8, electrons: 7, stable: true, orbitals: '1s2 2s2 2p3' },
    ],
  },
  {
    z: 8, symbol: 'O', name: 'Oxygen',
    defaultIsotope: 'Oxygen-16', atomicWeight: 15.999,
    electronConfig: '[He] 2s² 2p⁴',
    isotopes: [
      { name: 'Oxygen-16', protons: 8, neutrons: 8,  electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
      { name: 'Oxygen-17', protons: 8, neutrons: 9,  electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
      { name: 'Oxygen-18', protons: 8, neutrons: 10, electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
    ],
  },
]

// Hydrogen is the only element whose isotopes have proper names.
export const SPECIAL_ISOTOPE_NAMES: Record<string, string> = {
  'Hydrogen-1': 'Protium',
  'Hydrogen-2': 'Deuterium',
  'Hydrogen-3': 'Tritium',
}

// Electron capacities per shell: 2, 8, 18, 32. For Phase 1 (Z 1–8 +
// reasonable ions), we only need shells 1–2.
export function shellDistribution(electrons: number): number[] {
  const caps = [2, 8, 18, 32]
  const shells: number[] = []
  let remaining = Math.max(0, electrons)
  for (const cap of caps) {
    if (remaining <= 0) break
    const fill = Math.min(remaining, cap)
    shells.push(fill)
    remaining -= fill
  }
  return shells
}

export function findElementByZ(z: number): ElementData | undefined {
  return ELEMENTS.find(el => el.z === z)
}
