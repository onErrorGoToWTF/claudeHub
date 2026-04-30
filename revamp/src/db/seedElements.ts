/*
 * First 20 elements (H–Ca) — atomic numbers, isotopes, stability flags,
 * orbital configs, default isotopes, atomic weights, plus per-element
 * neutron-range and electron-range restrictions for dial enforcement.
 *
 * Sources: IUPAC 2023 atomic weights, NUBASE 2020 / NNDC isotope tables,
 * Greenwood & Earnshaw "Chemistry of the Elements" oxidation states.
 *
 * Used by /labs/elements. Dials cannot move past the per-element ranges
 * so invalid configurations (e.g. an oxygen nucleus with zero electrons)
 * are not reachable.
 *
 * neutronRange  = [N min, N max] of all known isotopes (any half-life)
 * electronRange = [Z − OS_max, Z − OS_min] from observed oxidation states
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
  neutronRange: [number, number]
  electronRange: [number, number]
}

export const ELEMENTS: ElementData[] = [
  {
    z: 1, symbol: 'H', name: 'Hydrogen',
    defaultIsotope: 'Hydrogen-1', atomicWeight: 1.008,
    electronConfig: '1s¹',
    neutronRange: [0, 6], electronRange: [0, 2],
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
    neutronRange: [0, 8], electronRange: [1, 2],
    isotopes: [
      { name: 'Helium-3', protons: 2, neutrons: 1, electrons: 2, stable: true, orbitals: '1s2' },
      { name: 'Helium-4', protons: 2, neutrons: 2, electrons: 2, stable: true, orbitals: '1s2' },
    ],
  },
  {
    z: 3, symbol: 'Li', name: 'Lithium',
    defaultIsotope: 'Lithium-7', atomicWeight: 6.94,
    electronConfig: '[He] 2s¹',
    neutronRange: [1, 10], electronRange: [2, 4],
    isotopes: [
      { name: 'Lithium-6', protons: 3, neutrons: 3, electrons: 3, stable: true, orbitals: '1s2 2s1' },
      { name: 'Lithium-7', protons: 3, neutrons: 4, electrons: 3, stable: true, orbitals: '1s2 2s1' },
    ],
  },
  {
    z: 4, symbol: 'Be', name: 'Beryllium',
    defaultIsotope: 'Beryllium-9', atomicWeight: 9.012,
    electronConfig: '[He] 2s²',
    neutronRange: [2, 12], electronRange: [2, 6],
    isotopes: [
      { name: 'Beryllium-9', protons: 4, neutrons: 5, electrons: 4, stable: true, orbitals: '1s2 2s2' },
    ],
  },
  {
    z: 5, symbol: 'B', name: 'Boron',
    defaultIsotope: 'Boron-11', atomicWeight: 10.81,
    electronConfig: '[He] 2s² 2p¹',
    neutronRange: [2, 16], electronRange: [2, 10],
    isotopes: [
      { name: 'Boron-10', protons: 5, neutrons: 5, electrons: 5, stable: true, orbitals: '1s2 2s2 2p1' },
      { name: 'Boron-11', protons: 5, neutrons: 6, electrons: 5, stable: true, orbitals: '1s2 2s2 2p1' },
    ],
  },
  {
    z: 6, symbol: 'C', name: 'Carbon',
    defaultIsotope: 'Carbon-12', atomicWeight: 12.011,
    electronConfig: '[He] 2s² 2p²',
    neutronRange: [2, 16], electronRange: [2, 10],
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
    neutronRange: [2, 18], electronRange: [2, 10],
    isotopes: [
      { name: 'Nitrogen-14', protons: 7, neutrons: 7, electrons: 7, stable: true, orbitals: '1s2 2s2 2p3' },
      { name: 'Nitrogen-15', protons: 7, neutrons: 8, electrons: 7, stable: true, orbitals: '1s2 2s2 2p3' },
    ],
  },
  {
    z: 8, symbol: 'O', name: 'Oxygen',
    defaultIsotope: 'Oxygen-16', atomicWeight: 15.999,
    electronConfig: '[He] 2s² 2p⁴',
    neutronRange: [3, 20], electronRange: [6, 10],
    isotopes: [
      { name: 'Oxygen-16', protons: 8, neutrons: 8,  electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
      { name: 'Oxygen-17', protons: 8, neutrons: 9,  electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
      { name: 'Oxygen-18', protons: 8, neutrons: 10, electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
    ],
  },
  {
    z: 9, symbol: 'F', name: 'Fluorine',
    defaultIsotope: 'Fluorine-19', atomicWeight: 18.998,
    electronConfig: '[He] 2s² 2p⁵',
    neutronRange: [4, 22], electronRange: [9, 10],
    isotopes: [
      { name: 'Fluorine-19', protons: 9, neutrons: 10, electrons: 9, stable: true, orbitals: '1s2 2s2 2p5' },
    ],
  },
  {
    z: 10, symbol: 'Ne', name: 'Neon',
    defaultIsotope: 'Neon-20', atomicWeight: 20.180,
    electronConfig: '[He] 2s² 2p⁶',
    neutronRange: [5, 24], electronRange: [10, 10],
    isotopes: [
      { name: 'Neon-20', protons: 10, neutrons: 10, electrons: 10, stable: true, orbitals: '1s2 2s2 2p6' },
      { name: 'Neon-21', protons: 10, neutrons: 11, electrons: 10, stable: true, orbitals: '1s2 2s2 2p6' },
      { name: 'Neon-22', protons: 10, neutrons: 12, electrons: 10, stable: true, orbitals: '1s2 2s2 2p6' },
    ],
  },
  {
    z: 11, symbol: 'Na', name: 'Sodium',
    defaultIsotope: 'Sodium-23', atomicWeight: 22.990,
    electronConfig: '[Ne] 3s¹',
    neutronRange: [6, 28], electronRange: [10, 12],
    isotopes: [
      { name: 'Sodium-23', protons: 11, neutrons: 12, electrons: 11, stable: true, orbitals: '1s2 2s2 2p6 3s1' },
    ],
  },
  {
    z: 12, symbol: 'Mg', name: 'Magnesium',
    defaultIsotope: 'Magnesium-24', atomicWeight: 24.305,
    electronConfig: '[Ne] 3s²',
    neutronRange: [6, 28], electronRange: [10, 14],
    isotopes: [
      { name: 'Magnesium-24', protons: 12, neutrons: 12, electrons: 12, stable: true, orbitals: '1s2 2s2 2p6 3s2' },
      { name: 'Magnesium-25', protons: 12, neutrons: 13, electrons: 12, stable: true, orbitals: '1s2 2s2 2p6 3s2' },
      { name: 'Magnesium-26', protons: 12, neutrons: 14, electrons: 12, stable: true, orbitals: '1s2 2s2 2p6 3s2' },
    ],
  },
  {
    z: 13, symbol: 'Al', name: 'Aluminum',
    defaultIsotope: 'Aluminum-27', atomicWeight: 26.982,
    electronConfig: '[Ne] 3s² 3p¹',
    neutronRange: [7, 30], electronRange: [11, 15],
    isotopes: [
      { name: 'Aluminum-27', protons: 13, neutrons: 14, electrons: 13, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p1' },
    ],
  },
  {
    z: 14, symbol: 'Si', name: 'Silicon',
    defaultIsotope: 'Silicon-28', atomicWeight: 28.085,
    electronConfig: '[Ne] 3s² 3p²',
    neutronRange: [8, 32], electronRange: [10, 18],
    isotopes: [
      { name: 'Silicon-28', protons: 14, neutrons: 14, electrons: 14, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p2' },
      { name: 'Silicon-29', protons: 14, neutrons: 15, electrons: 14, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p2' },
      { name: 'Silicon-30', protons: 14, neutrons: 16, electrons: 14, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p2' },
    ],
  },
  {
    z: 15, symbol: 'P', name: 'Phosphorus',
    defaultIsotope: 'Phosphorus-31', atomicWeight: 30.974,
    electronConfig: '[Ne] 3s² 3p³',
    neutronRange: [11, 32], electronRange: [12, 18],
    isotopes: [
      { name: 'Phosphorus-31', protons: 15, neutrons: 16, electrons: 15, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p3' },
    ],
  },
  {
    z: 16, symbol: 'S', name: 'Sulfur',
    defaultIsotope: 'Sulfur-32', atomicWeight: 32.06,
    electronConfig: '[Ne] 3s² 3p⁴',
    neutronRange: [11, 33], electronRange: [10, 18],
    isotopes: [
      { name: 'Sulfur-32', protons: 16, neutrons: 16, electrons: 16, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p4' },
      { name: 'Sulfur-33', protons: 16, neutrons: 17, electrons: 16, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p4' },
      { name: 'Sulfur-34', protons: 16, neutrons: 18, electrons: 16, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p4' },
      { name: 'Sulfur-36', protons: 16, neutrons: 20, electrons: 16, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p4' },
    ],
  },
  {
    z: 17, symbol: 'Cl', name: 'Chlorine',
    defaultIsotope: 'Chlorine-35', atomicWeight: 35.45,
    electronConfig: '[Ne] 3s² 3p⁵',
    neutronRange: [11, 35], electronRange: [10, 18],
    isotopes: [
      { name: 'Chlorine-35', protons: 17, neutrons: 18, electrons: 17, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p5' },
      { name: 'Chlorine-37', protons: 17, neutrons: 20, electrons: 17, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p5' },
    ],
  },
  {
    z: 18, symbol: 'Ar', name: 'Argon',
    defaultIsotope: 'Argon-40', atomicWeight: 39.95,
    electronConfig: '[Ne] 3s² 3p⁶',
    neutronRange: [11, 36], electronRange: [17, 18],
    isotopes: [
      { name: 'Argon-36', protons: 18, neutrons: 18, electrons: 18, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6' },
      { name: 'Argon-38', protons: 18, neutrons: 20, electrons: 18, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6' },
      { name: 'Argon-40', protons: 18, neutrons: 22, electrons: 18, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6' },
    ],
  },
  {
    z: 19, symbol: 'K', name: 'Potassium',
    defaultIsotope: 'Potassium-39', atomicWeight: 39.098,
    electronConfig: '[Ar] 4s¹',
    neutronRange: [12, 40], electronRange: [18, 20],
    isotopes: [
      { name: 'Potassium-39', protons: 19, neutrons: 20, electrons: 19, stable: true,  orbitals: '1s2 2s2 2p6 3s2 3p6 4s1' },
      { name: 'Potassium-40', protons: 19, neutrons: 21, electrons: 19, stable: false, orbitals: '1s2 2s2 2p6 3s2 3p6 4s1' },
      { name: 'Potassium-41', protons: 19, neutrons: 22, electrons: 19, stable: true,  orbitals: '1s2 2s2 2p6 3s2 3p6 4s1' },
    ],
  },
  {
    z: 20, symbol: 'Ca', name: 'Calcium',
    defaultIsotope: 'Calcium-40', atomicWeight: 40.078,
    electronConfig: '[Ar] 4s²',
    neutronRange: [15, 40], electronRange: [18, 22],
    isotopes: [
      { name: 'Calcium-40', protons: 20, neutrons: 20, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-42', protons: 20, neutrons: 22, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-43', protons: 20, neutrons: 23, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-44', protons: 20, neutrons: 24, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-46', protons: 20, neutrons: 26, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-48', protons: 20, neutrons: 28, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
    ],
  },
]

// Hydrogen is the only element whose isotopes have proper names.
export const SPECIAL_ISOTOPE_NAMES: Record<string, string> = {
  'Hydrogen-1': 'Protium',
  'Hydrogen-2': 'Deuterium',
  'Hydrogen-3': 'Tritium',
}

// Bohr-Rutherford shell-fill convention for Z 1–20: 2-8-8-2.
// (4s fills before 3d so K + Ca have a fourth shell before Sc starts
// populating the third further.) Anything past 20 electrons spills
// into a fifth notional shell — we'll refine when Phase 2 extends.
export function shellDistribution(electrons: number): number[] {
  if (electrons <= 0) return []
  const limits = [2, 8, 8, 2]
  const shells: number[] = []
  let remaining = electrons
  for (const cap of limits) {
    if (remaining <= 0) break
    const fill = Math.min(remaining, cap)
    shells.push(fill)
    remaining -= fill
  }
  if (remaining > 0) shells.push(remaining)
  return shells
}

export function findElementByZ(z: number): ElementData | undefined {
  return ELEMENTS.find(el => el.z === z)
}

// Clamp v to [min, max].
export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}
