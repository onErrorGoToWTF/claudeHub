import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Settings as SettingsIcon, User, Gauge } from 'lucide-react'
import { useUserStore } from '../state/userStore'
import styles from './ui.module.css'

/** Top-right user menu. Shows handle (or "Guest") and opens a dropdown
 *  with links to My progress + Settings. Pathway is no longer user-
 *  selectable — it emerges from engagement and surfaces only on /me. */
export function UserMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const handle = useUserStore(s => s.handle)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = handle ? `@${handle}` : 'Guest'

  return (
    <div className={styles.userMenuWrap} ref={rootRef}>
      <button
        type="button"
        className={styles.userMenuBtn}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <User size={14} strokeWidth={1.75} />
        <span className={styles.userMenuLabel}>{label}</span>
        <ChevronDown size={12} strokeWidth={2} />
      </button>

      {open && (
        <div className={styles.userMenuPanel} role="menu">
          <Link
            to="/me"
            className={styles.userMenuItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Gauge size={14} strokeWidth={1.75} />
            My progress
          </Link>
          <Link
            to="/settings"
            className={styles.userMenuItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <SettingsIcon size={14} strokeWidth={1.75} />
            Settings
          </Link>
        </div>
      )}
    </div>
  )
}
