/*
 * Off-tile floating control bar. Three counters (protons, neutrons,
 * electrons), each with − / + steppers. Live-updates the tile.
 */
import s from './ParticleControlBar.module.css'

type Props = {
  protons: number
  neutrons: number
  electrons: number
  pRange: [number, number]
  nRange: [number, number]
  eRange: [number, number]
  onProtons: (next: number) => void
  onNeutrons: (next: number) => void
  onElectrons: (next: number) => void
}

export function ParticleControlBar({
  protons, neutrons, electrons,
  pRange, nRange, eRange,
  onProtons, onNeutrons, onElectrons,
}: Props) {
  return (
    <div className={s.bar}>
      <Counter label="protons"   value={protons}   range={pRange} onChange={onProtons} />
      <Counter label="neutrons"  value={neutrons}  range={nRange} onChange={onNeutrons} />
      <Counter label="electrons" value={electrons} range={eRange} onChange={onElectrons} />
    </div>
  )
}

function Counter({
  label, value, range, onChange,
}: {
  label: string
  value: number
  range: [number, number]
  onChange: (n: number) => void
}) {
  const [min, max] = range
  return (
    <div className={s.counter}>
      <div className={s.label}>{label}</div>
      <div className={s.row}>
        <button
          type="button"
          className={s.step}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`decrement ${label}`}
        >
          −
        </button>
        <div className={s.value}>{value}</div>
        <button
          type="button"
          className={s.step}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`increment ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
