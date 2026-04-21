import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import styles from './ui.module.css'

type Theme = 'light' | 'dark'

function readInitial(): Theme {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'dark' || attr === 'light') return attr
  }
  return 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('ai-theme', theme) } catch {
      // private-mode / disabled storage — ignore
    }
  }, [theme])

  useEffect(() => {
    // Follow system changes only while the user hasn't explicitly chosen.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      const stored = (() => { try { return localStorage.getItem('ai-theme') } catch { return null } })()
      if (stored) return
      setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const next = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon size={16} strokeWidth={1.75} />
    </button>
  )
}
