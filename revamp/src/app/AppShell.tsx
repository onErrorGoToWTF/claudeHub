import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FolderGit2, Library as LibraryIcon, Search } from 'lucide-react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { PathwayPicker } from '../ui/PathwayPicker'
import { GlobalSearch } from '../ui/GlobalSearch'
import { UserMenu } from '../ui/UserMenu'
import sharedStyles from '../ui/ui.module.css'
import styles from './AppShell.module.css'

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; end?: boolean }
const NAV: NavItem[] = [
  { to: '/',         label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/learn',    label: 'Learn',     Icon: BookOpen },
  { to: '/projects', label: 'Projects',  Icon: FolderGit2 },
  { to: '/library',  label: 'Library',   Icon: LibraryIcon },
]

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)

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
        <div className={styles.brand}>
          <span className={styles.wordmark}>aiUniversity</span>
        </div>
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
          <PathwayPicker />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main className={styles.main}>{children}</main>

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
