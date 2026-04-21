import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FolderGit2, Library as LibraryIcon } from 'lucide-react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { PathwayPicker } from '../ui/PathwayPicker'
import styles from './AppShell.module.css'

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; end?: boolean }
const NAV: NavItem[] = [
  { to: '/',         label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/learn',    label: 'Learn',     Icon: BookOpen },
  { to: '/projects', label: 'Projects',  Icon: FolderGit2 },
  { to: '/library',  label: 'Library',   Icon: LibraryIcon },
]

export function AppShell({ children }: { children: ReactNode }) {
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
          <PathwayPicker />
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>{children}</main>

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
