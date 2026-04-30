/*
 * Periodic-table tile for /labs/elements. Bohr-Rutherford diagram in
 * the center, atomic number top-left, symbol top-right (with mass
 * left-superscript + charge right-superscript when non-default), name
 * + special isotope subtitle (hydrogen only) + electron config below.
 *
 * Sizes are locked; the diagram never resizes across elements.
 * Luminescent border is the only color on the tile chrome.
 */
import { LewisDiagram } from './LewisDiagram'
import {
  SPECIAL_ISOTOPE_NAMES,
  shellDistribution,
  findElementByZ,
} from '../../db/seedElements'
import s from './ElementTile.module.css'

type Props = {
  protons: number
  neutrons: number
  electrons: number
}

export function ElementTile({ protons, neutrons, electrons }: Props) {
  const element = findElementByZ(protons)
  if (!element) {
    return (
      <div className={s.tile}>
        <div className={s.atomicNumber}>{protons}</div>
        <div className={s.empty}>out of range</div>
      </div>
    )
  }

  const massNumber = protons + neutrons
  const charge = protons - electrons
  const shells = shellDistribution(electrons)

  const defaultIso = element.isotopes.find(i => i.name === element.defaultIsotope)
  const isDefaultMass = defaultIso ? defaultIso.neutrons === neutrons : false
  const isNeutral = charge === 0

  const isotopeName = `${element.name}-${massNumber}`
  const subtitle = SPECIAL_ISOTOPE_NAMES[isotopeName]
  const displayName = isDefaultMass && isNeutral ? element.name : isotopeName

  const showMassSup = !isDefaultMass
  const showChargeSup = !isNeutral

  return (
    <div className={s.tile}>
      <div className={s.atomicNumber}>{protons}</div>

      <div className={s.symbol}>
        {showMassSup && <sup className={s.massSup}>{massNumber}</sup>}
        <span className={s.symbolGlyph}>{element.symbol}</span>
        {showChargeSup && <sup className={s.chargeSup}>{formatCharge(charge)}</sup>}
      </div>

      <div className={s.diagramWrap}>
        <LewisDiagram shells={shells} />
      </div>

      <div className={s.label}>
        <div className={s.name}>{displayName}</div>
        {subtitle && <div className={s.subtitle}>{subtitle}</div>}
        <div className={s.config}>{element.electronConfig}</div>
      </div>
    </div>
  )
}

function formatCharge(charge: number): string {
  const abs = Math.abs(charge)
  const sign = charge > 0 ? '+' : '−'
  return abs === 1 ? sign : `${abs}${sign}`
}
