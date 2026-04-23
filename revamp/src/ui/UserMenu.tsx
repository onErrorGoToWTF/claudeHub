import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown, Check, Settings as SettingsIcon, RotateCcw, User, Gauge,
} from 'lucide-react'
import { useUserStore } from '../state/userStore'
import { PATHWAYS, type UserPathway } from '../lib/audience'
import styles from './ui.module.css'

/** Top-right user menu. Today shows handle (or "Guest") and opens a
 *  dropdown with pathway selection + Settings + Retake onboarding.
 *  Sign-out slots in here once auth lands. */
export function UserMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const handle     = useUserStore(s => s.handle)
  const pathway    = useUserStore(s => s.pathway)
  const setPathway = useUserStore(s => s.setPathway)

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

  function retakeOnboarding() {
    useUserStore.setState({ onboardingSeen: false })
    setOpen(false)
  }

  function pickPathway(p: UserPathway) {
    setPathway(p)
    // Leave the menu open so the user sees the radio flip; they can
    // dismiss via outside click or Esc if they want.
  }

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
          <div className={styles.userMenuGroup}>
            <div className={styles.userMenuGroupLabel}>Pathway</div>
            {PATHWAYS.map(p => {
              const on = pathway === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  className={`${styles.userMenuItem} ${on ? styles.userMenuItemOn : ''}`}
                  onClick={() => pickPathway(p.id)}
                >
                  <span className={styles.userMenuRadio}>
                    {on && <Check size={12} strokeWidth={2.5} />}
                  </span>
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className={styles.userMenuDivider} />

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
          <Link
            to="/onboarding"
            className={styles.userMenuItem}
            role="menuitem"
            onClick={retakeOnboarding}
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            Retake onboarding
          </Link>
        </div>
      )}
    </div>
  )
}
