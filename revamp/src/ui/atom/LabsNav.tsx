/*
 * LabsNav — floating top-left button on every /labs/* page that opens a
 * menu of all available labs. Phone-friendly so the user can jump between
 * labs without typing URLs. Stays out of the top-right controls card and
 * the bottom HUD by hugging the top-left corner.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import s from './LabsNav.module.css'

const LABS: Array<{ path: string; label: string }> = [
  { path: '/labs/atom', label: 'Atom logo' },
  { path: '/labs/atom-states', label: 'States lab' },
  { path: '/labs/atom-transitions', label: 'Transitions lab' },
  { path: '/labs/atom-sequence', label: 'Sequence lab' },
]

export function LabsNav() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  // Outside-click + Escape close.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Close on route change.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <div className={s.root} ref={rootRef}>
      <button
        type="button"
        className={s.handle}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Labs
        <span className={s.chev}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className={s.menu} role="menu">
          {LABS.map((l) => {
            const active = location.pathname === l.path
            return (
              <Link
                key={l.path}
                to={l.path}
                role="menuitem"
                className={`${s.item} ${active ? s.itemActive : ''}`}
              >
                {l.label}
                <span className={s.itemSub}>{l.path}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
