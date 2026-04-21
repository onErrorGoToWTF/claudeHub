import { PATHWAYS, type UserPathway } from '../lib/audience'
import { useUserStore } from '../state/userStore'
import styles from './ui.module.css'

export function PathwayPicker() {
  const pathway = useUserStore(s => s.pathway)
  const setPathway = useUserStore(s => s.setPathway)

  return (
    <label className={styles.pathwayPicker} aria-label="Pathway">
      <select
        value={pathway}
        onChange={(e) => setPathway(e.target.value as UserPathway)}
        className={styles.pathwaySelect}
      >
        {PATHWAYS.map(p => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </label>
  )
}
