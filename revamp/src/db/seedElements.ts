/*
 * Periodic table — all 118 elements (H through Og) — atomic numbers,
 * default isotopes, stability flags, electron configs, atomic weights,
 * plus per-element neutron-range and electron-range restrictions for
 * dial enforcement.
 *
 * Sources: IUPAC 2023 atomic weights, NUBASE 2020 / NNDC isotope tables,
 * Greenwood & Earnshaw "Chemistry of the Elements" oxidation states,
 * IUPAC transactinide confirmations.
 *
 * neutronRange  = [N min, N max] of all known isotopes (any half-life)
 * electronRange = [Z − OS_max, Z − OS_min] from observed oxidation states
 *
 * For Z 21+, only the default isotope is listed. Add specific isotopes
 * later if needed (the dial restricts to the neutron range regardless).
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
  { z: 1, symbol: 'H', name: 'Hydrogen', defaultIsotope: 'Hydrogen-1', atomicWeight: 1.008, electronConfig: '1s¹', neutronRange: [0, 6], electronRange: [0, 2],
    isotopes: [
      { name: 'Hydrogen-1', protons: 1, neutrons: 0, electrons: 1, stable: true,  orbitals: '1s1' },
      { name: 'Hydrogen-2', protons: 1, neutrons: 1, electrons: 1, stable: true,  orbitals: '1s1' },
      { name: 'Hydrogen-3', protons: 1, neutrons: 2, electrons: 1, stable: false, orbitals: '1s1' },
    ] },
  { z: 2, symbol: 'He', name: 'Helium', defaultIsotope: 'Helium-4', atomicWeight: 4.003, electronConfig: '1s²', neutronRange: [0, 8], electronRange: [1, 2],
    isotopes: [
      { name: 'Helium-3', protons: 2, neutrons: 1, electrons: 2, stable: true, orbitals: '1s2' },
      { name: 'Helium-4', protons: 2, neutrons: 2, electrons: 2, stable: true, orbitals: '1s2' },
    ] },
  { z: 3, symbol: 'Li', name: 'Lithium', defaultIsotope: 'Lithium-7', atomicWeight: 6.94, electronConfig: '[He] 2s¹', neutronRange: [1, 10], electronRange: [2, 4],
    isotopes: [
      { name: 'Lithium-6', protons: 3, neutrons: 3, electrons: 3, stable: true, orbitals: '1s2 2s1' },
      { name: 'Lithium-7', protons: 3, neutrons: 4, electrons: 3, stable: true, orbitals: '1s2 2s1' },
    ] },
  { z: 4, symbol: 'Be', name: 'Beryllium', defaultIsotope: 'Beryllium-9', atomicWeight: 9.012, electronConfig: '[He] 2s²', neutronRange: [2, 12], electronRange: [2, 6],
    isotopes: [{ name: 'Beryllium-9', protons: 4, neutrons: 5, electrons: 4, stable: true, orbitals: '1s2 2s2' }] },
  { z: 5, symbol: 'B', name: 'Boron', defaultIsotope: 'Boron-11', atomicWeight: 10.81, electronConfig: '[He] 2s² 2p¹', neutronRange: [2, 16], electronRange: [2, 10],
    isotopes: [
      { name: 'Boron-10', protons: 5, neutrons: 5, electrons: 5, stable: true, orbitals: '1s2 2s2 2p1' },
      { name: 'Boron-11', protons: 5, neutrons: 6, electrons: 5, stable: true, orbitals: '1s2 2s2 2p1' },
    ] },
  { z: 6, symbol: 'C', name: 'Carbon', defaultIsotope: 'Carbon-12', atomicWeight: 12.011, electronConfig: '[He] 2s² 2p²', neutronRange: [2, 16], electronRange: [2, 10],
    isotopes: [
      { name: 'Carbon-12', protons: 6, neutrons: 6, electrons: 6, stable: true,  orbitals: '1s2 2s2 2p2' },
      { name: 'Carbon-13', protons: 6, neutrons: 7, electrons: 6, stable: true,  orbitals: '1s2 2s2 2p2' },
      { name: 'Carbon-14', protons: 6, neutrons: 8, electrons: 6, stable: false, orbitals: '1s2 2s2 2p2' },
    ] },
  { z: 7, symbol: 'N', name: 'Nitrogen', defaultIsotope: 'Nitrogen-14', atomicWeight: 14.007, electronConfig: '[He] 2s² 2p³', neutronRange: [2, 18], electronRange: [2, 10],
    isotopes: [
      { name: 'Nitrogen-14', protons: 7, neutrons: 7, electrons: 7, stable: true, orbitals: '1s2 2s2 2p3' },
      { name: 'Nitrogen-15', protons: 7, neutrons: 8, electrons: 7, stable: true, orbitals: '1s2 2s2 2p3' },
    ] },
  { z: 8, symbol: 'O', name: 'Oxygen', defaultIsotope: 'Oxygen-16', atomicWeight: 15.999, electronConfig: '[He] 2s² 2p⁴', neutronRange: [3, 20], electronRange: [6, 10],
    isotopes: [
      { name: 'Oxygen-16', protons: 8, neutrons: 8,  electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
      { name: 'Oxygen-17', protons: 8, neutrons: 9,  electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
      { name: 'Oxygen-18', protons: 8, neutrons: 10, electrons: 8, stable: true, orbitals: '1s2 2s2 2p4' },
    ] },
  { z: 9, symbol: 'F', name: 'Fluorine', defaultIsotope: 'Fluorine-19', atomicWeight: 18.998, electronConfig: '[He] 2s² 2p⁵', neutronRange: [4, 22], electronRange: [9, 10],
    isotopes: [{ name: 'Fluorine-19', protons: 9, neutrons: 10, electrons: 9, stable: true, orbitals: '1s2 2s2 2p5' }] },
  { z: 10, symbol: 'Ne', name: 'Neon', defaultIsotope: 'Neon-20', atomicWeight: 20.180, electronConfig: '[He] 2s² 2p⁶', neutronRange: [5, 24], electronRange: [10, 10],
    isotopes: [
      { name: 'Neon-20', protons: 10, neutrons: 10, electrons: 10, stable: true, orbitals: '1s2 2s2 2p6' },
      { name: 'Neon-21', protons: 10, neutrons: 11, electrons: 10, stable: true, orbitals: '1s2 2s2 2p6' },
      { name: 'Neon-22', protons: 10, neutrons: 12, electrons: 10, stable: true, orbitals: '1s2 2s2 2p6' },
    ] },
  { z: 11, symbol: 'Na', name: 'Sodium', defaultIsotope: 'Sodium-23', atomicWeight: 22.990, electronConfig: '[Ne] 3s¹', neutronRange: [6, 28], electronRange: [10, 12],
    isotopes: [{ name: 'Sodium-23', protons: 11, neutrons: 12, electrons: 11, stable: true, orbitals: '1s2 2s2 2p6 3s1' }] },
  { z: 12, symbol: 'Mg', name: 'Magnesium', defaultIsotope: 'Magnesium-24', atomicWeight: 24.305, electronConfig: '[Ne] 3s²', neutronRange: [6, 28], electronRange: [10, 14],
    isotopes: [
      { name: 'Magnesium-24', protons: 12, neutrons: 12, electrons: 12, stable: true, orbitals: '1s2 2s2 2p6 3s2' },
      { name: 'Magnesium-25', protons: 12, neutrons: 13, electrons: 12, stable: true, orbitals: '1s2 2s2 2p6 3s2' },
      { name: 'Magnesium-26', protons: 12, neutrons: 14, electrons: 12, stable: true, orbitals: '1s2 2s2 2p6 3s2' },
    ] },
  { z: 13, symbol: 'Al', name: 'Aluminum', defaultIsotope: 'Aluminum-27', atomicWeight: 26.982, electronConfig: '[Ne] 3s² 3p¹', neutronRange: [7, 30], electronRange: [11, 15],
    isotopes: [{ name: 'Aluminum-27', protons: 13, neutrons: 14, electrons: 13, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p1' }] },
  { z: 14, symbol: 'Si', name: 'Silicon', defaultIsotope: 'Silicon-28', atomicWeight: 28.085, electronConfig: '[Ne] 3s² 3p²', neutronRange: [8, 32], electronRange: [10, 18],
    isotopes: [
      { name: 'Silicon-28', protons: 14, neutrons: 14, electrons: 14, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p2' },
      { name: 'Silicon-29', protons: 14, neutrons: 15, electrons: 14, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p2' },
      { name: 'Silicon-30', protons: 14, neutrons: 16, electrons: 14, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p2' },
    ] },
  { z: 15, symbol: 'P', name: 'Phosphorus', defaultIsotope: 'Phosphorus-31', atomicWeight: 30.974, electronConfig: '[Ne] 3s² 3p³', neutronRange: [11, 32], electronRange: [12, 18],
    isotopes: [{ name: 'Phosphorus-31', protons: 15, neutrons: 16, electrons: 15, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p3' }] },
  { z: 16, symbol: 'S', name: 'Sulfur', defaultIsotope: 'Sulfur-32', atomicWeight: 32.06, electronConfig: '[Ne] 3s² 3p⁴', neutronRange: [11, 33], electronRange: [10, 18],
    isotopes: [
      { name: 'Sulfur-32', protons: 16, neutrons: 16, electrons: 16, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p4' },
      { name: 'Sulfur-33', protons: 16, neutrons: 17, electrons: 16, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p4' },
      { name: 'Sulfur-34', protons: 16, neutrons: 18, electrons: 16, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p4' },
      { name: 'Sulfur-36', protons: 16, neutrons: 20, electrons: 16, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p4' },
    ] },
  { z: 17, symbol: 'Cl', name: 'Chlorine', defaultIsotope: 'Chlorine-35', atomicWeight: 35.45, electronConfig: '[Ne] 3s² 3p⁵', neutronRange: [11, 35], electronRange: [10, 18],
    isotopes: [
      { name: 'Chlorine-35', protons: 17, neutrons: 18, electrons: 17, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p5' },
      { name: 'Chlorine-37', protons: 17, neutrons: 20, electrons: 17, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p5' },
    ] },
  { z: 18, symbol: 'Ar', name: 'Argon', defaultIsotope: 'Argon-40', atomicWeight: 39.95, electronConfig: '[Ne] 3s² 3p⁶', neutronRange: [11, 36], electronRange: [17, 18],
    isotopes: [
      { name: 'Argon-36', protons: 18, neutrons: 18, electrons: 18, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6' },
      { name: 'Argon-38', protons: 18, neutrons: 20, electrons: 18, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6' },
      { name: 'Argon-40', protons: 18, neutrons: 22, electrons: 18, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6' },
    ] },
  { z: 19, symbol: 'K', name: 'Potassium', defaultIsotope: 'Potassium-39', atomicWeight: 39.098, electronConfig: '[Ar] 4s¹', neutronRange: [12, 40], electronRange: [18, 20],
    isotopes: [
      { name: 'Potassium-39', protons: 19, neutrons: 20, electrons: 19, stable: true,  orbitals: '1s2 2s2 2p6 3s2 3p6 4s1' },
      { name: 'Potassium-40', protons: 19, neutrons: 21, electrons: 19, stable: false, orbitals: '1s2 2s2 2p6 3s2 3p6 4s1' },
      { name: 'Potassium-41', protons: 19, neutrons: 22, electrons: 19, stable: true,  orbitals: '1s2 2s2 2p6 3s2 3p6 4s1' },
    ] },
  { z: 20, symbol: 'Ca', name: 'Calcium', defaultIsotope: 'Calcium-40', atomicWeight: 40.078, electronConfig: '[Ar] 4s²', neutronRange: [15, 40], electronRange: [18, 22],
    isotopes: [
      { name: 'Calcium-40', protons: 20, neutrons: 20, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-42', protons: 20, neutrons: 22, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-43', protons: 20, neutrons: 23, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-44', protons: 20, neutrons: 24, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-46', protons: 20, neutrons: 26, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
      { name: 'Calcium-48', protons: 20, neutrons: 28, electrons: 20, stable: true, orbitals: '1s2 2s2 2p6 3s2 3p6 4s2' },
    ] },
  // Z 21–118 — only the default isotope is listed; expand later as needed.
  { z: 21, symbol: 'Sc', name: 'Scandium', defaultIsotope: 'Scandium-45', atomicWeight: 44.956, electronConfig: '[Ar] 3d¹ 4s²', neutronRange: [16, 27], electronRange: [18, 23], isotopes: [{ name: 'Scandium-45', protons: 21, neutrons: 24, electrons: 21, stable: true, orbitals: '[Ar] 3d1 4s2' }] },
  { z: 22, symbol: 'Ti', name: 'Titanium', defaultIsotope: 'Titanium-48', atomicWeight: 47.867, electronConfig: '[Ar] 3d² 4s²', neutronRange: [22, 28], electronRange: [21, 23], isotopes: [{ name: 'Titanium-48', protons: 22, neutrons: 26, electrons: 22, stable: true, orbitals: '[Ar] 3d2 4s2' }] },
  { z: 23, symbol: 'V', name: 'Vanadium', defaultIsotope: 'Vanadium-51', atomicWeight: 50.942, electronConfig: '[Ar] 3d³ 4s²', neutronRange: [25, 28], electronRange: [21, 24], isotopes: [{ name: 'Vanadium-51', protons: 23, neutrons: 28, electrons: 23, stable: true, orbitals: '[Ar] 3d3 4s2' }] },
  { z: 24, symbol: 'Cr', name: 'Chromium', defaultIsotope: 'Chromium-52', atomicWeight: 51.996, electronConfig: '[Ar] 3d⁵ 4s¹', neutronRange: [26, 30], electronRange: [19, 26], isotopes: [{ name: 'Chromium-52', protons: 24, neutrons: 28, electrons: 24, stable: true, orbitals: '[Ar] 3d5 4s1' }] },
  { z: 25, symbol: 'Mn', name: 'Manganese', defaultIsotope: 'Manganese-55', atomicWeight: 54.938, electronConfig: '[Ar] 3d⁵ 4s²', neutronRange: [27, 29], electronRange: [18, 28], isotopes: [{ name: 'Manganese-55', protons: 25, neutrons: 30, electrons: 25, stable: true, orbitals: '[Ar] 3d5 4s2' }] },
  { z: 26, symbol: 'Fe', name: 'Iron', defaultIsotope: 'Iron-56', atomicWeight: 55.845, electronConfig: '[Ar] 3d⁶ 4s²', neutronRange: [28, 34], electronRange: [20, 28], isotopes: [{ name: 'Iron-56', protons: 26, neutrons: 30, electrons: 26, stable: true, orbitals: '[Ar] 3d6 4s2' }] },
  { z: 27, symbol: 'Co', name: 'Cobalt', defaultIsotope: 'Cobalt-59', atomicWeight: 58.933, electronConfig: '[Ar] 3d⁷ 4s²', neutronRange: [29, 33], electronRange: [22, 30], isotopes: [{ name: 'Cobalt-59', protons: 27, neutrons: 32, electrons: 27, stable: true, orbitals: '[Ar] 3d7 4s2' }] },
  { z: 28, symbol: 'Ni', name: 'Nickel', defaultIsotope: 'Nickel-58', atomicWeight: 58.693, electronConfig: '[Ar] 3d⁸ 4s²', neutronRange: [28, 38], electronRange: [25, 29], isotopes: [{ name: 'Nickel-58', protons: 28, neutrons: 30, electrons: 28, stable: true, orbitals: '[Ar] 3d8 4s2' }] },
  { z: 29, symbol: 'Cu', name: 'Copper', defaultIsotope: 'Copper-63', atomicWeight: 63.546, electronConfig: '[Ar] 3d¹⁰ 4s¹', neutronRange: [34, 38], electronRange: [26, 31], isotopes: [{ name: 'Copper-63', protons: 29, neutrons: 34, electrons: 29, stable: true, orbitals: '[Ar] 3d10 4s1' }] },
  { z: 30, symbol: 'Zn', name: 'Zinc', defaultIsotope: 'Zinc-64', atomicWeight: 65.38, electronConfig: '[Ar] 3d¹⁰ 4s²', neutronRange: [34, 42], electronRange: [28, 32], isotopes: [{ name: 'Zinc-64', protons: 30, neutrons: 34, electrons: 30, stable: true, orbitals: '[Ar] 3d10 4s2' }] },
  { z: 31, symbol: 'Ga', name: 'Gallium', defaultIsotope: 'Gallium-69', atomicWeight: 69.723, electronConfig: '[Ar] 3d¹⁰ 4s² 4p¹', neutronRange: [38, 40], electronRange: [28, 36], isotopes: [{ name: 'Gallium-69', protons: 31, neutrons: 38, electrons: 31, stable: true, orbitals: '[Ar] 3d10 4s2 4p1' }] },
  { z: 32, symbol: 'Ge', name: 'Germanium', defaultIsotope: 'Germanium-74', atomicWeight: 72.630, electronConfig: '[Ar] 3d¹⁰ 4s² 4p²', neutronRange: [36, 45], electronRange: [28, 36], isotopes: [{ name: 'Germanium-74', protons: 32, neutrons: 42, electrons: 32, stable: true, orbitals: '[Ar] 3d10 4s2 4p2' }] },
  { z: 33, symbol: 'As', name: 'Arsenic', defaultIsotope: 'Arsenic-75', atomicWeight: 74.922, electronConfig: '[Ar] 3d¹⁰ 4s² 4p³', neutronRange: [38, 44], electronRange: [28, 36], isotopes: [{ name: 'Arsenic-75', protons: 33, neutrons: 42, electrons: 33, stable: true, orbitals: '[Ar] 3d10 4s2 4p3' }] },
  { z: 34, symbol: 'Se', name: 'Selenium', defaultIsotope: 'Selenium-80', atomicWeight: 78.971, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁴', neutronRange: [38, 48], electronRange: [28, 36], isotopes: [{ name: 'Selenium-80', protons: 34, neutrons: 46, electrons: 34, stable: true, orbitals: '[Ar] 3d10 4s2 4p4' }] },
  { z: 35, symbol: 'Br', name: 'Bromine', defaultIsotope: 'Bromine-79', atomicWeight: 79.904, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵', neutronRange: [42, 47], electronRange: [28, 36], isotopes: [{ name: 'Bromine-79', protons: 35, neutrons: 44, electrons: 35, stable: true, orbitals: '[Ar] 3d10 4s2 4p5' }] },
  { z: 36, symbol: 'Kr', name: 'Krypton', defaultIsotope: 'Krypton-84', atomicWeight: 83.798, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶', neutronRange: [42, 50], electronRange: [28, 37], isotopes: [{ name: 'Krypton-84', protons: 36, neutrons: 48, electrons: 36, stable: true, orbitals: '[Ar] 3d10 4s2 4p6' }] },
  { z: 37, symbol: 'Rb', name: 'Rubidium', defaultIsotope: 'Rubidium-85', atomicWeight: 85.468, electronConfig: '[Kr] 5s¹', neutronRange: [46, 50], electronRange: [36, 38], isotopes: [{ name: 'Rubidium-85', protons: 37, neutrons: 48, electrons: 37, stable: true, orbitals: '[Kr] 5s1' }] },
  { z: 38, symbol: 'Sr', name: 'Strontium', defaultIsotope: 'Strontium-88', atomicWeight: 87.62, electronConfig: '[Kr] 5s²', neutronRange: [44, 52], electronRange: [36, 40], isotopes: [{ name: 'Strontium-88', protons: 38, neutrons: 50, electrons: 38, stable: true, orbitals: '[Kr] 5s2' }] },
  { z: 39, symbol: 'Y', name: 'Yttrium', defaultIsotope: 'Yttrium-89', atomicWeight: 88.906, electronConfig: '[Kr] 4d¹ 5s²', neutronRange: [48, 52], electronRange: [36, 41], isotopes: [{ name: 'Yttrium-89', protons: 39, neutrons: 50, electrons: 39, stable: true, orbitals: '[Kr] 4d1 5s2' }] },
  { z: 40, symbol: 'Zr', name: 'Zirconium', defaultIsotope: 'Zirconium-90', atomicWeight: 91.222, electronConfig: '[Kr] 4d² 5s²', neutronRange: [48, 56], electronRange: [36, 42], isotopes: [{ name: 'Zirconium-90', protons: 40, neutrons: 50, electrons: 40, stable: true, orbitals: '[Kr] 4d2 5s2' }] },
  { z: 41, symbol: 'Nb', name: 'Niobium', defaultIsotope: 'Niobium-93', atomicWeight: 92.906, electronConfig: '[Kr] 4d⁴ 5s¹', neutronRange: [50, 55], electronRange: [36, 44], isotopes: [{ name: 'Niobium-93', protons: 41, neutrons: 52, electrons: 41, stable: true, orbitals: '[Kr] 4d4 5s1' }] },
  { z: 42, symbol: 'Mo', name: 'Molybdenum', defaultIsotope: 'Molybdenum-98', atomicWeight: 95.95, electronConfig: '[Kr] 4d⁵ 5s¹', neutronRange: [50, 58], electronRange: [36, 44], isotopes: [{ name: 'Molybdenum-98', protons: 42, neutrons: 56, electrons: 42, stable: true, orbitals: '[Kr] 4d5 5s1' }] },
  { z: 43, symbol: 'Tc', name: 'Technetium', defaultIsotope: 'Technetium-97', atomicWeight: 97, electronConfig: '[Kr] 4d⁵ 5s²', neutronRange: [53, 56], electronRange: [36, 46], isotopes: [{ name: 'Technetium-97', protons: 43, neutrons: 54, electrons: 43, stable: false, orbitals: '[Kr] 4d5 5s2' }] },
  { z: 44, symbol: 'Ru', name: 'Ruthenium', defaultIsotope: 'Ruthenium-102', atomicWeight: 101.07, electronConfig: '[Kr] 4d⁷ 5s¹', neutronRange: [53, 62], electronRange: [36, 46], isotopes: [{ name: 'Ruthenium-102', protons: 44, neutrons: 58, electrons: 44, stable: true, orbitals: '[Kr] 4d7 5s1' }] },
  { z: 45, symbol: 'Rh', name: 'Rhodium', defaultIsotope: 'Rhodium-103', atomicWeight: 102.906, electronConfig: '[Kr] 4d⁸ 5s¹', neutronRange: [54, 60], electronRange: [39, 46], isotopes: [{ name: 'Rhodium-103', protons: 45, neutrons: 58, electrons: 45, stable: true, orbitals: '[Kr] 4d8 5s1' }] },
  { z: 46, symbol: 'Pd', name: 'Palladium', defaultIsotope: 'Palladium-106', atomicWeight: 106.42, electronConfig: '[Kr] 4d¹⁰', neutronRange: [54, 66], electronRange: [42, 47], isotopes: [{ name: 'Palladium-106', protons: 46, neutrons: 60, electrons: 46, stable: true, orbitals: '[Kr] 4d10' }] },
  { z: 47, symbol: 'Ag', name: 'Silver', defaultIsotope: 'Silver-107', atomicWeight: 107.868, electronConfig: '[Kr] 4d¹⁰ 5s¹', neutronRange: [58, 64], electronRange: [44, 49], isotopes: [{ name: 'Silver-107', protons: 47, neutrons: 60, electrons: 47, stable: true, orbitals: '[Kr] 4d10 5s1' }] },
  { z: 48, symbol: 'Cd', name: 'Cadmium', defaultIsotope: 'Cadmium-114', atomicWeight: 112.414, electronConfig: '[Kr] 4d¹⁰ 5s²', neutronRange: [58, 68], electronRange: [46, 50], isotopes: [{ name: 'Cadmium-114', protons: 48, neutrons: 66, electrons: 48, stable: true, orbitals: '[Kr] 4d10 5s2' }] },
  { z: 49, symbol: 'In', name: 'Indium', defaultIsotope: 'Indium-115', atomicWeight: 114.818, electronConfig: '[Kr] 4d¹⁰ 5s² 5p¹', neutronRange: [62, 66], electronRange: [46, 54], isotopes: [{ name: 'Indium-115', protons: 49, neutrons: 66, electrons: 49, stable: true, orbitals: '[Kr] 4d10 5s2 5p1' }] },
  { z: 50, symbol: 'Sn', name: 'Tin', defaultIsotope: 'Tin-120', atomicWeight: 118.710, electronConfig: '[Kr] 4d¹⁰ 5s² 5p²', neutronRange: [62, 76], electronRange: [46, 54], isotopes: [{ name: 'Tin-120', protons: 50, neutrons: 70, electrons: 50, stable: true, orbitals: '[Kr] 4d10 5s2 5p2' }] },
  { z: 51, symbol: 'Sb', name: 'Antimony', defaultIsotope: 'Antimony-121', atomicWeight: 121.760, electronConfig: '[Kr] 4d¹⁰ 5s² 5p³', neutronRange: [68, 76], electronRange: [46, 54], isotopes: [{ name: 'Antimony-121', protons: 51, neutrons: 70, electrons: 51, stable: true, orbitals: '[Kr] 4d10 5s2 5p3' }] },
  { z: 52, symbol: 'Te', name: 'Tellurium', defaultIsotope: 'Tellurium-130', atomicWeight: 127.60, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁴', neutronRange: [66, 80], electronRange: [46, 54], isotopes: [{ name: 'Tellurium-130', protons: 52, neutrons: 78, electrons: 52, stable: true, orbitals: '[Kr] 4d10 5s2 5p4' }] },
  { z: 53, symbol: 'I', name: 'Iodine', defaultIsotope: 'Iodine-127', atomicWeight: 126.904, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵', neutronRange: [71, 80], electronRange: [46, 54], isotopes: [{ name: 'Iodine-127', protons: 53, neutrons: 74, electrons: 53, stable: true, orbitals: '[Kr] 4d10 5s2 5p5' }] },
  { z: 54, symbol: 'Xe', name: 'Xenon', defaultIsotope: 'Xenon-132', atomicWeight: 131.293, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁶', neutronRange: [72, 82], electronRange: [46, 55], isotopes: [{ name: 'Xenon-132', protons: 54, neutrons: 78, electrons: 54, stable: true, orbitals: '[Kr] 4d10 5s2 5p6' }] },
  { z: 55, symbol: 'Cs', name: 'Cesium', defaultIsotope: 'Cesium-133', atomicWeight: 132.905, electronConfig: '[Xe] 6s¹', neutronRange: [74, 81], electronRange: [54, 56], isotopes: [{ name: 'Cesium-133', protons: 55, neutrons: 78, electrons: 55, stable: true, orbitals: '[Xe] 6s1' }] },
  { z: 56, symbol: 'Ba', name: 'Barium', defaultIsotope: 'Barium-138', atomicWeight: 137.327, electronConfig: '[Xe] 6s²', neutronRange: [72, 84], electronRange: [54, 58], isotopes: [{ name: 'Barium-138', protons: 56, neutrons: 82, electrons: 56, stable: true, orbitals: '[Xe] 6s2' }] },
  { z: 57, symbol: 'La', name: 'Lanthanum', defaultIsotope: 'Lanthanum-139', atomicWeight: 138.905, electronConfig: '[Xe] 5d¹ 6s²', neutronRange: [80, 83], electronRange: [54, 59], isotopes: [{ name: 'Lanthanum-139', protons: 57, neutrons: 82, electrons: 57, stable: true, orbitals: '[Xe] 5d1 6s2' }] },
  { z: 58, symbol: 'Ce', name: 'Cerium', defaultIsotope: 'Cerium-140', atomicWeight: 140.116, electronConfig: '[Xe] 4f¹ 5d¹ 6s²', neutronRange: [76, 86], electronRange: [54, 60], isotopes: [{ name: 'Cerium-140', protons: 58, neutrons: 82, electrons: 58, stable: true, orbitals: '[Xe] 4f1 5d1 6s2' }] },
  { z: 59, symbol: 'Pr', name: 'Praseodymium', defaultIsotope: 'Praseodymium-141', atomicWeight: 140.908, electronConfig: '[Xe] 4f³ 6s²', neutronRange: [84, 84], electronRange: [55, 61], isotopes: [{ name: 'Praseodymium-141', protons: 59, neutrons: 82, electrons: 59, stable: true, orbitals: '[Xe] 4f3 6s2' }] },
  { z: 60, symbol: 'Nd', name: 'Neodymium', defaultIsotope: 'Neodymium-142', atomicWeight: 144.242, electronConfig: '[Xe] 4f⁴ 6s²', neutronRange: [80, 90], electronRange: [57, 63], isotopes: [{ name: 'Neodymium-142', protons: 60, neutrons: 82, electrons: 60, stable: true, orbitals: '[Xe] 4f4 6s2' }] },
  { z: 61, symbol: 'Pm', name: 'Promethium', defaultIsotope: 'Promethium-145', atomicWeight: 145, electronConfig: '[Xe] 4f⁵ 6s²', neutronRange: [82, 90], electronRange: [58, 63], isotopes: [{ name: 'Promethium-145', protons: 61, neutrons: 84, electrons: 61, stable: false, orbitals: '[Xe] 4f5 6s2' }] },
  { z: 62, symbol: 'Sm', name: 'Samarium', defaultIsotope: 'Samarium-152', atomicWeight: 150.36, electronConfig: '[Xe] 4f⁶ 6s²', neutronRange: [82, 92], electronRange: [59, 64], isotopes: [{ name: 'Samarium-152', protons: 62, neutrons: 90, electrons: 62, stable: true, orbitals: '[Xe] 4f6 6s2' }] },
  { z: 63, symbol: 'Eu', name: 'Europium', defaultIsotope: 'Europium-153', atomicWeight: 151.964, electronConfig: '[Xe] 4f⁷ 6s²', neutronRange: [82, 94], electronRange: [60, 65], isotopes: [{ name: 'Europium-153', protons: 63, neutrons: 90, electrons: 63, stable: true, orbitals: '[Xe] 4f7 6s2' }] },
  { z: 64, symbol: 'Gd', name: 'Gadolinium', defaultIsotope: 'Gadolinium-158', atomicWeight: 157.249, electronConfig: '[Xe] 4f⁷ 5d¹ 6s²', neutronRange: [82, 96], electronRange: [61, 66], isotopes: [{ name: 'Gadolinium-158', protons: 64, neutrons: 94, electrons: 64, stable: true, orbitals: '[Xe] 4f7 5d1 6s2' }] },
  { z: 65, symbol: 'Tb', name: 'Terbium', defaultIsotope: 'Terbium-159', atomicWeight: 158.925, electronConfig: '[Xe] 4f⁹ 6s²', neutronRange: [88, 96], electronRange: [61, 67], isotopes: [{ name: 'Terbium-159', protons: 65, neutrons: 94, electrons: 65, stable: true, orbitals: '[Xe] 4f9 6s2' }] },
  { z: 66, symbol: 'Dy', name: 'Dysprosium', defaultIsotope: 'Dysprosium-164', atomicWeight: 162.500, electronConfig: '[Xe] 4f¹⁰ 6s²', neutronRange: [90, 110], electronRange: [63, 68], isotopes: [{ name: 'Dysprosium-164', protons: 66, neutrons: 98, electrons: 66, stable: true, orbitals: '[Xe] 4f10 6s2' }] },
  { z: 67, symbol: 'Ho', name: 'Holmium', defaultIsotope: 'Holmium-165', atomicWeight: 164.930, electronConfig: '[Xe] 4f¹¹ 6s²', neutronRange: [91, 109], electronRange: [64, 69], isotopes: [{ name: 'Holmium-165', protons: 67, neutrons: 98, electrons: 67, stable: true, orbitals: '[Xe] 4f11 6s2' }] },
  { z: 68, symbol: 'Er', name: 'Erbium', defaultIsotope: 'Erbium-166', atomicWeight: 167.259, electronConfig: '[Xe] 4f¹² 6s²', neutronRange: [92, 109], electronRange: [65, 70], isotopes: [{ name: 'Erbium-166', protons: 68, neutrons: 98, electrons: 68, stable: true, orbitals: '[Xe] 4f12 6s2' }] },
  { z: 69, symbol: 'Tm', name: 'Thulium', defaultIsotope: 'Thulium-169', atomicWeight: 168.934, electronConfig: '[Xe] 4f¹³ 6s²', neutronRange: [92, 108], electronRange: [66, 71], isotopes: [{ name: 'Thulium-169', protons: 69, neutrons: 100, electrons: 69, stable: true, orbitals: '[Xe] 4f13 6s2' }] },
  { z: 70, symbol: 'Yb', name: 'Ytterbium', defaultIsotope: 'Ytterbium-174', atomicWeight: 173.054, electronConfig: '[Xe] 4f¹⁴ 6s²', neutronRange: [92, 109], electronRange: [67, 70], isotopes: [{ name: 'Ytterbium-174', protons: 70, neutrons: 104, electrons: 70, stable: true, orbitals: '[Xe] 4f14 6s2' }] },
  { z: 71, symbol: 'Lu', name: 'Lutetium', defaultIsotope: 'Lutetium-175', atomicWeight: 174.967, electronConfig: '[Xe] 4f¹⁴ 5d¹ 6s²', neutronRange: [91, 109], electronRange: [68, 73], isotopes: [{ name: 'Lutetium-175', protons: 71, neutrons: 104, electrons: 71, stable: true, orbitals: '[Xe] 4f14 5d1 6s2' }] },
  { z: 72, symbol: 'Hf', name: 'Hafnium', defaultIsotope: 'Hafnium-180', atomicWeight: 178.492, electronConfig: '[Xe] 4f¹⁴ 5d² 6s²', neutronRange: [98, 114], electronRange: [68, 74], isotopes: [{ name: 'Hafnium-180', protons: 72, neutrons: 108, electrons: 72, stable: true, orbitals: '[Xe] 4f14 5d2 6s2' }] },
  { z: 73, symbol: 'Ta', name: 'Tantalum', defaultIsotope: 'Tantalum-181', atomicWeight: 180.948, electronConfig: '[Xe] 4f¹⁴ 5d³ 6s²', neutronRange: [97, 114], electronRange: [70, 76], isotopes: [{ name: 'Tantalum-181', protons: 73, neutrons: 108, electrons: 73, stable: true, orbitals: '[Xe] 4f14 5d3 6s2' }] },
  { z: 74, symbol: 'W', name: 'Tungsten', defaultIsotope: 'Tungsten-184', atomicWeight: 183.841, electronConfig: '[Xe] 4f¹⁴ 5d⁴ 6s²', neutronRange: [100, 114], electronRange: [74, 78], isotopes: [{ name: 'Tungsten-184', protons: 74, neutrons: 110, electrons: 74, stable: true, orbitals: '[Xe] 4f14 5d4 6s2' }] },
  { z: 75, symbol: 'Re', name: 'Rhenium', defaultIsotope: 'Rhenium-187', atomicWeight: 186.207, electronConfig: '[Xe] 4f¹⁴ 5d⁵ 6s²', neutronRange: [100, 116], electronRange: [68, 78], isotopes: [{ name: 'Rhenium-187', protons: 75, neutrons: 112, electrons: 75, stable: true, orbitals: '[Xe] 4f14 5d5 6s2' }] },
  { z: 76, symbol: 'Os', name: 'Osmium', defaultIsotope: 'Osmium-192', atomicWeight: 190.960, electronConfig: '[Xe] 4f¹⁴ 5d⁶ 6s²', neutronRange: [108, 120], electronRange: [68, 78], isotopes: [{ name: 'Osmium-192', protons: 76, neutrons: 116, electrons: 76, stable: true, orbitals: '[Xe] 4f14 5d6 6s2' }] },
  { z: 77, symbol: 'Ir', name: 'Iridium', defaultIsotope: 'Iridium-193', atomicWeight: 192.217, electronConfig: '[Xe] 4f¹⁴ 5d⁷ 6s²', neutronRange: [108, 120], electronRange: [71, 80], isotopes: [{ name: 'Iridium-193', protons: 77, neutrons: 116, electrons: 77, stable: true, orbitals: '[Xe] 4f14 5d7 6s2' }] },
  { z: 78, symbol: 'Pt', name: 'Platinum', defaultIsotope: 'Platinum-195', atomicWeight: 195.084, electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹', neutronRange: [112, 120], electronRange: [72, 80], isotopes: [{ name: 'Platinum-195', protons: 78, neutrons: 117, electrons: 78, stable: true, orbitals: '[Xe] 4f14 5d9 6s1' }] },
  { z: 79, symbol: 'Au', name: 'Gold', defaultIsotope: 'Gold-197', atomicWeight: 196.967, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', neutronRange: [112, 122], electronRange: [74, 82], isotopes: [{ name: 'Gold-197', protons: 79, neutrons: 118, electrons: 79, stable: true, orbitals: '[Xe] 4f14 5d10 6s1' }] },
  { z: 80, symbol: 'Hg', name: 'Mercury', defaultIsotope: 'Mercury-202', atomicWeight: 200.592, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', neutronRange: [116, 124], electronRange: [78, 82], isotopes: [{ name: 'Mercury-202', protons: 80, neutrons: 122, electrons: 80, stable: true, orbitals: '[Xe] 4f14 5d10 6s2' }] },
  { z: 81, symbol: 'Tl', name: 'Thallium', defaultIsotope: 'Thallium-205', atomicWeight: 204.383, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹', neutronRange: [118, 129], electronRange: [78, 86], isotopes: [{ name: 'Thallium-205', protons: 81, neutrons: 124, electrons: 81, stable: true, orbitals: '[Xe] 4f14 5d10 6s2 6p1' }] },
  { z: 82, symbol: 'Pb', name: 'Lead', defaultIsotope: 'Lead-208', atomicWeight: 207.2, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', neutronRange: [120, 132], electronRange: [78, 86], isotopes: [{ name: 'Lead-208', protons: 82, neutrons: 126, electrons: 82, stable: true, orbitals: '[Xe] 4f14 5d10 6s2 6p2' }] },
  { z: 83, symbol: 'Bi', name: 'Bismuth', defaultIsotope: 'Bismuth-209', atomicWeight: 208.980, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³', neutronRange: [121, 132], electronRange: [78, 86], isotopes: [{ name: 'Bismuth-209', protons: 83, neutrons: 126, electrons: 83, stable: true, orbitals: '[Xe] 4f14 5d10 6s2 6p3' }] },
  { z: 84, symbol: 'Po', name: 'Polonium', defaultIsotope: 'Polonium-209', atomicWeight: 209, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴', neutronRange: [122, 134], electronRange: [78, 86], isotopes: [{ name: 'Polonium-209', protons: 84, neutrons: 125, electrons: 84, stable: false, orbitals: '[Xe] 4f14 5d10 6s2 6p4' }] },
  { z: 85, symbol: 'At', name: 'Astatine', defaultIsotope: 'Astatine-211', atomicWeight: 210, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵', neutronRange: [122, 134], electronRange: [78, 86], isotopes: [{ name: 'Astatine-211', protons: 85, neutrons: 126, electrons: 85, stable: false, orbitals: '[Xe] 4f14 5d10 6s2 6p5' }] },
  { z: 86, symbol: 'Rn', name: 'Radon', defaultIsotope: 'Radon-222', atomicWeight: 222, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶', neutronRange: [124, 138], electronRange: [86, 86], isotopes: [{ name: 'Radon-222', protons: 86, neutrons: 136, electrons: 86, stable: false, orbitals: '[Xe] 4f14 5d10 6s2 6p6' }] },
  { z: 87, symbol: 'Fr', name: 'Francium', defaultIsotope: 'Francium-223', atomicWeight: 223, electronConfig: '[Rn] 7s¹', neutronRange: [126, 145], electronRange: [86, 88], isotopes: [{ name: 'Francium-223', protons: 87, neutrons: 136, electrons: 87, stable: false, orbitals: '[Rn] 7s1' }] },
  { z: 88, symbol: 'Ra', name: 'Radium', defaultIsotope: 'Radium-226', atomicWeight: 226, electronConfig: '[Rn] 7s²', neutronRange: [123, 142], electronRange: [86, 90], isotopes: [{ name: 'Radium-226', protons: 88, neutrons: 138, electrons: 88, stable: false, orbitals: '[Rn] 7s2' }] },
  { z: 89, symbol: 'Ac', name: 'Actinium', defaultIsotope: 'Actinium-227', atomicWeight: 227, electronConfig: '[Rn] 6d¹ 7s²', neutronRange: [126, 143], electronRange: [86, 91], isotopes: [{ name: 'Actinium-227', protons: 89, neutrons: 138, electrons: 89, stable: false, orbitals: '[Rn] 6d1 7s2' }] },
  { z: 90, symbol: 'Th', name: 'Thorium', defaultIsotope: 'Thorium-232', atomicWeight: 232.036, electronConfig: '[Rn] 6d² 7s²', neutronRange: [122, 147], electronRange: [86, 92], isotopes: [{ name: 'Thorium-232', protons: 90, neutrons: 142, electrons: 90, stable: false, orbitals: '[Rn] 6d2 7s2' }] },
  { z: 91, symbol: 'Pa', name: 'Protactinium', defaultIsotope: 'Protactinium-231', atomicWeight: 231.036, electronConfig: '[Rn] 5f² 6d¹ 7s²', neutronRange: [122, 147], electronRange: [86, 93], isotopes: [{ name: 'Protactinium-231', protons: 91, neutrons: 140, electrons: 91, stable: false, orbitals: '[Rn] 5f2 6d1 7s2' }] },
  { z: 92, symbol: 'U', name: 'Uranium', defaultIsotope: 'Uranium-238', atomicWeight: 238.029, electronConfig: '[Rn] 5f³ 6d¹ 7s²', neutronRange: [122, 150], electronRange: [86, 94], isotopes: [{ name: 'Uranium-238', protons: 92, neutrons: 146, electrons: 92, stable: false, orbitals: '[Rn] 5f3 6d1 7s2' }] },
  { z: 93, symbol: 'Np', name: 'Neptunium', defaultIsotope: 'Neptunium-237', atomicWeight: 237, electronConfig: '[Rn] 5f⁴ 6d¹ 7s²', neutronRange: [122, 151], electronRange: [86, 95], isotopes: [{ name: 'Neptunium-237', protons: 93, neutrons: 144, electrons: 93, stable: false, orbitals: '[Rn] 5f4 6d1 7s2' }] },
  { z: 94, symbol: 'Pu', name: 'Plutonium', defaultIsotope: 'Plutonium-244', atomicWeight: 244, electronConfig: '[Rn] 5f⁶ 7s²', neutronRange: [122, 153], electronRange: [88, 96], isotopes: [{ name: 'Plutonium-244', protons: 94, neutrons: 150, electrons: 94, stable: false, orbitals: '[Rn] 5f6 7s2' }] },
  { z: 95, symbol: 'Am', name: 'Americium', defaultIsotope: 'Americium-243', atomicWeight: 243, electronConfig: '[Rn] 5f⁷ 7s²', neutronRange: [122, 154], electronRange: [89, 97], isotopes: [{ name: 'Americium-243', protons: 95, neutrons: 148, electrons: 95, stable: false, orbitals: '[Rn] 5f7 7s2' }] },
  { z: 96, symbol: 'Cm', name: 'Curium', defaultIsotope: 'Curium-247', atomicWeight: 247, electronConfig: '[Rn] 5f⁷ 6d¹ 7s²', neutronRange: [122, 155], electronRange: [93, 98], isotopes: [{ name: 'Curium-247', protons: 96, neutrons: 151, electrons: 96, stable: false, orbitals: '[Rn] 5f7 6d1 7s2' }] },
  { z: 97, symbol: 'Bk', name: 'Berkelium', defaultIsotope: 'Berkelium-247', atomicWeight: 247, electronConfig: '[Rn] 5f⁹ 7s²', neutronRange: [122, 155], electronRange: [93, 99], isotopes: [{ name: 'Berkelium-247', protons: 97, neutrons: 150, electrons: 97, stable: false, orbitals: '[Rn] 5f9 7s2' }] },
  { z: 98, symbol: 'Cf', name: 'Californium', defaultIsotope: 'Californium-251', atomicWeight: 251, electronConfig: '[Rn] 5f¹⁰ 7s²', neutronRange: [121, 156], electronRange: [95, 100], isotopes: [{ name: 'Californium-251', protons: 98, neutrons: 153, electrons: 98, stable: false, orbitals: '[Rn] 5f10 7s2' }] },
  { z: 99, symbol: 'Es', name: 'Einsteinium', defaultIsotope: 'Einsteinium-252', atomicWeight: 252, electronConfig: '[Rn] 5f¹¹ 7s²', neutronRange: [121, 157], electronRange: [96, 101], isotopes: [{ name: 'Einsteinium-252', protons: 99, neutrons: 153, electrons: 99, stable: false, orbitals: '[Rn] 5f11 7s2' }] },
  { z: 100, symbol: 'Fm', name: 'Fermium', defaultIsotope: 'Fermium-257', atomicWeight: 257, electronConfig: '[Rn] 5f¹² 7s²', neutronRange: [121, 159], electronRange: [97, 102], isotopes: [{ name: 'Fermium-257', protons: 100, neutrons: 157, electrons: 100, stable: false, orbitals: '[Rn] 5f12 7s2' }] },
  { z: 101, symbol: 'Md', name: 'Mendelevium', defaultIsotope: 'Mendelevium-258', atomicWeight: 258, electronConfig: '[Rn] 5f¹³ 7s²', neutronRange: [121, 159], electronRange: [98, 103], isotopes: [{ name: 'Mendelevium-258', protons: 101, neutrons: 157, electrons: 101, stable: false, orbitals: '[Rn] 5f13 7s2' }] },
  { z: 102, symbol: 'No', name: 'Nobelium', defaultIsotope: 'Nobelium-259', atomicWeight: 259, electronConfig: '[Rn] 5f¹⁴ 7s²', neutronRange: [121, 160], electronRange: [102, 102], isotopes: [{ name: 'Nobelium-259', protons: 102, neutrons: 157, electrons: 102, stable: false, orbitals: '[Rn] 5f14 7s2' }] },
  { z: 103, symbol: 'Lr', name: 'Lawrencium', defaultIsotope: 'Lawrencium-262', atomicWeight: 262, electronConfig: '[Rn] 5f¹⁴ 6d¹ 7s²', neutronRange: [121, 163], electronRange: [101, 105], isotopes: [{ name: 'Lawrencium-262', protons: 103, neutrons: 159, electrons: 103, stable: false, orbitals: '[Rn] 5f14 6d1 7s2' }] },
  { z: 104, symbol: 'Rf', name: 'Rutherfordium', defaultIsotope: 'Rutherfordium-267', atomicWeight: 267, electronConfig: '[Rn] 5f¹⁴ 6d² 7s²', neutronRange: [149, 165], electronRange: [103, 107], isotopes: [{ name: 'Rutherfordium-267', protons: 104, neutrons: 163, electrons: 104, stable: false, orbitals: '[Rn] 5f14 6d2 7s2' }] },
  { z: 105, symbol: 'Db', name: 'Dubnium', defaultIsotope: 'Dubnium-268', atomicWeight: 268, electronConfig: '[Rn] 5f¹⁴ 6d³ 7s²', neutronRange: [150, 165], electronRange: [103, 108], isotopes: [{ name: 'Dubnium-268', protons: 105, neutrons: 163, electrons: 105, stable: false, orbitals: '[Rn] 5f14 6d3 7s2' }] },
  { z: 106, symbol: 'Sg', name: 'Seaborgium', defaultIsotope: 'Seaborgium-271', atomicWeight: 271, electronConfig: '[Rn] 5f¹⁴ 6d⁴ 7s²', neutronRange: [152, 166], electronRange: [103, 109], isotopes: [{ name: 'Seaborgium-271', protons: 106, neutrons: 165, electrons: 106, stable: false, orbitals: '[Rn] 5f14 6d4 7s2' }] },
  { z: 107, symbol: 'Bh', name: 'Bohrium', defaultIsotope: 'Bohrium-272', atomicWeight: 272, electronConfig: '[Rn] 5f¹⁴ 6d⁵ 7s²', neutronRange: [153, 167], electronRange: [103, 110], isotopes: [{ name: 'Bohrium-272', protons: 107, neutrons: 165, electrons: 107, stable: false, orbitals: '[Rn] 5f14 6d5 7s2' }] },
  { z: 108, symbol: 'Hs', name: 'Hassium', defaultIsotope: 'Hassium-270', atomicWeight: 270, electronConfig: '[Rn] 5f¹⁴ 6d⁶ 7s²', neutronRange: [155, 169], electronRange: [102, 110], isotopes: [{ name: 'Hassium-270', protons: 108, neutrons: 162, electrons: 108, stable: false, orbitals: '[Rn] 5f14 6d6 7s2' }] },
  { z: 109, symbol: 'Mt', name: 'Meitnerium', defaultIsotope: 'Meitnerium-278', atomicWeight: 278, electronConfig: '[Rn] 5f¹⁴ 6d⁷ 7s²', neutronRange: [157, 172], electronRange: [101, 111], isotopes: [{ name: 'Meitnerium-278', protons: 109, neutrons: 169, electrons: 109, stable: false, orbitals: '[Rn] 5f14 6d7 7s2' }] },
  { z: 110, symbol: 'Ds', name: 'Darmstadtium', defaultIsotope: 'Darmstadtium-281', atomicWeight: 281, electronConfig: '[Rn] 5f¹⁴ 6d⁹ 7s¹', neutronRange: [157, 174], electronRange: [102, 111], isotopes: [{ name: 'Darmstadtium-281', protons: 110, neutrons: 171, electrons: 110, stable: false, orbitals: '[Rn] 5f14 6d9 7s1' }] },
  { z: 111, symbol: 'Rg', name: 'Roentgenium', defaultIsotope: 'Roentgenium-280', atomicWeight: 280, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s¹', neutronRange: [161, 176], electronRange: [106, 112], isotopes: [{ name: 'Roentgenium-280', protons: 111, neutrons: 169, electrons: 111, stable: false, orbitals: '[Rn] 5f14 6d10 7s1' }] },
  { z: 112, symbol: 'Cn', name: 'Copernicium', defaultIsotope: 'Copernicium-285', atomicWeight: 285, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s²', neutronRange: [165, 177], electronRange: [110, 112], isotopes: [{ name: 'Copernicium-285', protons: 112, neutrons: 173, electrons: 112, stable: false, orbitals: '[Rn] 5f14 6d10 7s2' }] },
  { z: 113, symbol: 'Nh', name: 'Nihonium', defaultIsotope: 'Nihonium-286', atomicWeight: 286, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹', neutronRange: [165, 177], electronRange: [110, 114], isotopes: [{ name: 'Nihonium-286', protons: 113, neutrons: 173, electrons: 113, stable: false, orbitals: '[Rn] 5f14 6d10 7s2 7p1' }] },
  { z: 114, symbol: 'Fl', name: 'Flerovium', defaultIsotope: 'Flerovium-289', atomicWeight: 289, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²', neutronRange: [168, 179], electronRange: [112, 114], isotopes: [{ name: 'Flerovium-289', protons: 114, neutrons: 175, electrons: 114, stable: false, orbitals: '[Rn] 5f14 6d10 7s2 7p2' }] },
  { z: 115, symbol: 'Mc', name: 'Moscovium', defaultIsotope: 'Moscovium-290', atomicWeight: 290, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³', neutronRange: [172, 180], electronRange: [112, 116], isotopes: [{ name: 'Moscovium-290', protons: 115, neutrons: 175, electrons: 115, stable: false, orbitals: '[Rn] 5f14 6d10 7s2 7p3' }] },
  { z: 116, symbol: 'Lv', name: 'Livermorium', defaultIsotope: 'Livermorium-293', atomicWeight: 293, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴', neutronRange: [173, 181], electronRange: [114, 116], isotopes: [{ name: 'Livermorium-293', protons: 116, neutrons: 177, electrons: 116, stable: false, orbitals: '[Rn] 5f14 6d10 7s2 7p4' }] },
  { z: 117, symbol: 'Ts', name: 'Tennessine', defaultIsotope: 'Tennessine-294', atomicWeight: 294, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵', neutronRange: [173, 181], electronRange: [114, 118], isotopes: [{ name: 'Tennessine-294', protons: 117, neutrons: 177, electrons: 117, stable: false, orbitals: '[Rn] 5f14 6d10 7s2 7p5' }] },
  { z: 118, symbol: 'Og', name: 'Oganesson', defaultIsotope: 'Oganesson-294', atomicWeight: 294, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶', neutronRange: [175, 181], electronRange: [118, 118], isotopes: [{ name: 'Oganesson-294', protons: 118, neutrons: 176, electrons: 118, stable: false, orbitals: '[Rn] 5f14 6d10 7s2 7p6' }] },
]

// Hydrogen is the only element whose isotopes have proper names.
export const SPECIAL_ISOTOPE_NAMES: Record<string, string> = {
  'Hydrogen-1': 'Protium',
  'Hydrogen-2': 'Deuterium',
  'Hydrogen-3': 'Tritium',
}

// Noble-gas core expansions for resolving electronConfig strings into
// per-shell electron counts.
const NOBLE_EXPANSIONS: Record<string, string> = {
  '[He]': '1s2',
  '[Ne]': '1s2 2s2 2p6',
  '[Ar]': '1s2 2s2 2p6 3s2 3p6',
  '[Kr]': '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6',
  '[Xe]': '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6',
  '[Rn]': '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p6',
  '[Og]': '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d10 7s2 7p6',
}

const SUP_TO_DIGIT: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
}

// Parses an electronConfig string ("[Ar] 3d¹ 4s²" or "1s2 2s1") into a
// per-shell electron-count array. Handles both Unicode-superscript and
// ASCII-digit forms, and resolves [He] / [Ne] / … noble-gas cores.
function neutralShellLayout(config: string): number[] {
  let working = config
  for (const [core, expansion] of Object.entries(NOBLE_EXPANSIONS)) {
    if (working.includes(core)) {
      working = working.replace(core, expansion)
      break
    }
  }
  for (const [sup, dig] of Object.entries(SUP_TO_DIGIT)) {
    working = working.split(sup).join(dig)
  }
  const shells: number[] = []
  const re = /(\d)[spdf](\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(working)) !== null) {
    const n = parseInt(m[1])
    const count = parseInt(m[2])
    while (shells.length < n) shells.push(0)
    shells[n - 1] += count
  }
  return shells
}

// Cache neutral shell layout per Z so we only parse the configs once.
const NEUTRAL_LAYOUT_CACHE = new Map<number, number[]>()
for (const el of ELEMENTS) {
  NEUTRAL_LAYOUT_CACHE.set(el.z, neutralShellLayout(el.electronConfig))
}

// Returns shell distribution for an element with the given electron
// count. Cations strip from the outermost shell first; anions add to
// the outermost shell.
export function shellsFor(element: ElementData, electrons: number): number[] {
  if (electrons <= 0) return []
  const neutral = NEUTRAL_LAYOUT_CACHE.get(element.z) ?? neutralShellLayout(element.electronConfig)
  const layout = [...neutral]
  const delta = electrons - element.z
  if (delta < 0) {
    let toRemove = -delta
    for (let i = layout.length - 1; i >= 0 && toRemove > 0; i--) {
      const r = Math.min(layout[i], toRemove)
      layout[i] -= r
      toRemove -= r
    }
  } else if (delta > 0) {
    if (layout.length === 0) layout.push(delta)
    else layout[layout.length - 1] += delta
  }
  while (layout.length > 0 && layout[layout.length - 1] === 0) layout.pop()
  return layout
}

// Legacy fallback (Z 1–20 simple Bohr-Rutherford fill) when an element
// is not available — kept for any callers still using the old API.
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

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}
