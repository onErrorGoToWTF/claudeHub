import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FolderGit2, Library as LibraryIcon, Search } from 'lucide-react'
import { GlobalSearch } from '../ui/GlobalSearch'
import { UserMenu } from '../ui/UserMenu'
import { AtomComposition, LOGO } from '../pages/LabsAtom'
import sharedStyles from '../ui/ui.module.css'
import styles from './AppShell.module.css'

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; end?: boolean }
const NAV: NavItem[] = [
  { to: '/',         label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/learn',    label: 'Learn',     Icon: BookOpen },
  { to: '/projects', label: 'Projects',  Icon: FolderGit2 },
  { to: '/library',  label: 'Library',   Icon: LibraryIcon },
]

// Mount-delay timer. Sourced from LOGO.mountDelayMs so it tracks the
// rest of the atom's tuning. See revamp/docs/atom-baseline-2026-04-25.md
// for the iOS Safari layer-race rationale.

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [atomMounted, setAtomMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAtomMounted(true), LOGO.mountDelayMs)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        {/* Left cluster: brand only — account moved to the right */}
        <div className={styles.topLeft}>
          <div className={styles.brand}>
            {atomMounted && <AtomComposition compact settle />}
          </div>
        </div>

        {/* Middle: nav on desktop only; hidden on mobile (bottom nav wins) */}
        <nav className={styles.topnav} aria-label="Primary">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
              `${styles.topLink} ${isActive ? styles.topLinkActive : ''}`
            }>
              <Icon size={15} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right cluster: tools */}
        <div className={styles.topActions}>
          <button
            type="button"
            className={sharedStyles.searchTrigger}
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            title="Search (Ctrl/Cmd+K)"
          >
            <Search size={16} strokeWidth={1.75} />
          </button>
          <UserMenu />
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.appFooter}>
        <Link to="/colophon" className={styles.colophonLink}>Colophon</Link>
        <span className={styles.colophonSep}>·</span>
        <Link to="/feedback" className={styles.colophonLink}>Feedback</Link>
      </footer>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav className={styles.bottomnav} aria-label="Primary mobile">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) =>
            `${styles.bottomLink} ${isActive ? styles.bottomLinkActive : ''}`
          }>
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
