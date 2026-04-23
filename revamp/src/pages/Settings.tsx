import { useEffect, useState } from 'react'
import { Check, Laptop, Monitor, Smartphone, Tablet, Terminal, Sun, Moon } from 'lucide-react'
import { repo } from '../db/repo'
import type { Topic, Track } from '../db/types'
import { Button, PageHeader } from '../ui'
import {
  useUserStore, type Device, type WorkStyle,
} from '../state/userStore'
import s from './Onboarding.module.css'

const WORK_STYLE_OPTIONS: { id: WorkStyle; title: string; sub: string }[] = [
  { id: 'no_code',    title: 'No-code',    sub: 'Prompts, Projects, Artifacts — no terminal.' },
  { id: 'vibe_code',  title: 'Vibe-code',  sub: 'I paste code snippets but don\'t really write them.' },
  { id: 'engineer',   title: 'Engineer',   sub: 'General software engineer.' },
  { id: 'frontend',   title: 'Frontend',   sub: 'UIs, design systems, client-side state.' },
  { id: 'backend',    title: 'Backend',    sub: 'APIs, databases, infra.' },
  { id: 'fullstack',  title: 'Full-stack', sub: 'Both ends.' },
  { id: 'research',   title: 'Research',   sub: 'Papers, ML, analysis.' },
]

const DEVICE_OPTIONS: { id: Device; title: string; Icon: typeof Laptop }[] = [
  { id: 'mac',     title: 'Mac',     Icon: Laptop },
  { id: 'windows', title: 'Windows', Icon: Monitor },
  { id: 'linux',   title: 'Linux',   Icon: Terminal },
  { id: 'iphone',  title: 'iPhone',  Icon: Smartphone },
  { id: 'android', title: 'Android', Icon: Smartphone },
  { id: 'ipad',    title: 'iPad',    Icon: Tablet },
]

export function Settings() {
  const profile            = useUserStore()
  const setHandle          = useUserStore(st => st.setHandle)
  const setWorkStyles      = useUserStore(st => st.setWorkStyles)
  const setDevices         = useUserStore(st => st.setDevices)
  const setYearsCoding     = useUserStore(st => st.setYearsCoding)
  const toggleKnownTopic   = useUserStore(st => st.toggleKnownTopic)
  const resetProfile       = useUserStore(st => st.resetProfile)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const attr = document.documentElement.getAttribute('data-theme')
    return attr === 'dark' ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('ai-theme', theme) } catch {
      // private-mode / disabled storage — ignore
    }
  }, [theme])

  const [tracks, setTracks] = useState<Track[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  useEffect(() => {
    Promise.all([repo.listTracks(), repo.listTopics()]).then(([tr, tp]) => {
      setTracks(tr); setTopics(tp)
    })
  }, [])

  function hardReset() {
    if (!confirm('Reset your profile? This wipes handle, work styles, devices, known topics — local only.')) return
    resetProfile()
  }

  const known = new Set(profile.knownTopicIds ?? [])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Settings"
        title="Your profile"
        subtitle="Every field is optional. Each one unlocks a specific feature — if you skip it, that feature just stays generic."
      />

      <div style={{
        padding: '10px 14px', marginBottom: 'var(--space-6)',
        background: 'var(--bg-sunken)', border: '1px solid var(--hair)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-sm)', color: 'var(--ink-2)',
      }}>
        <b>Privacy:</b> every field below is stored only in this browser
        (<code style={{ fontSize: '0.92em' }}>localStorage</code> + IndexedDB). Nothing leaves your device — no
        analytics, no server, no tracking. When real accounts land, the
        app will explicitly ask before syncing anything. Clearing site
        data deletes your profile.
      </div>

      {/* Handle */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={sectionTitle}>Handle</h2>
        <p style={sectionHint}>
          <b>Why we ask:</b> a short name that shows in the top-right menu.
          Reserves a slug for future public-profile / friend-view URLs.
        </p>
        <input
          type="text"
          placeholder="e.g. ada"
          value={profile.handle ?? ''}
          onChange={(e) => setHandle(e.target.value.trim() || undefined)}
          className={s.input}
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
        />
      </section>

      {/* Appearance */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={sectionTitle}>Appearance</h2>
        <p style={sectionHint}>
          <b>Why we ask:</b> lets you force dark mode if you prefer. App
          defaults to light regardless of your OS setting.
        </p>
        <div className={`${s.optionGrid} ${s.cols2}`}>
          {([
            { id: 'light', title: 'Light', Icon: Sun },
            { id: 'dark',  title: 'Dark',  Icon: Moon },
          ] as const).map(opt => {
            const on = theme === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                className={`${s.option} ${on ? s.optionOn : ''}`}
                onClick={() => setTheme(opt.id)}
              >
                <opt.Icon size={16} strokeWidth={1.75} />
                <div className={s.optionBody}>
                  <div className={s.optionTitle}>{opt.title}</div>
                </div>
                {on && <span className={s.check}><Check size={12} /></span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* Work styles */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={sectionTitle}>Work styles</h2>
        <p style={sectionHint}>
          <b>Why we ask:</b> tunes project and tool recommendations. Skip if
          you want the generic mix. Tag-based — pick any.
        </p>
        <div className={`${s.optionGrid} ${s.cols2}`}>
          {WORK_STYLE_OPTIONS.map(ws => {
            const picked = (profile.workStyles ?? []).includes(ws.id)
            return (
              <button
                key={ws.id}
                type="button"
                className={`${s.option} ${picked ? s.optionOn : ''}`}
                onClick={() => {
                  const curr = new Set(profile.workStyles ?? [])
                  if (curr.has(ws.id)) curr.delete(ws.id)
                  else curr.add(ws.id)
                  setWorkStyles([...curr])
                }}
              >
                <div className={s.optionBody}>
                  <div className={s.optionTitle}>{ws.title}</div>
                  <div className={s.optionSub}>{ws.sub}</div>
                </div>
                {picked && <span className={s.check}><Check size={12} /></span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* Devices */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={sectionTitle}>Devices</h2>
        <p style={sectionHint}>
          <b>Why we ask:</b> used by the future project bootstrapper — what
          OS to scaffold for, which tools install cleanly. No bootstrapper
          features unlock without at least one pick.
        </p>
        <div className={`${s.optionGrid} ${s.cols2}`}>
          {DEVICE_OPTIONS.map(d => {
            const picked = (profile.devices ?? []).includes(d.id)
            return (
              <button
                key={d.id}
                type="button"
                className={`${s.option} ${picked ? s.optionOn : ''}`}
                onClick={() => {
                  const curr = new Set(profile.devices ?? [])
                  if (curr.has(d.id)) curr.delete(d.id)
                  else curr.add(d.id)
                  setDevices([...curr])
                }}
              >
                <d.Icon size={16} strokeWidth={1.75} />
                <div className={s.optionBody}>
                  <div className={s.optionTitle}>{d.title}</div>
                </div>
                {picked && <span className={s.check}><Check size={12} /></span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* Years coding */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={sectionTitle}>Years coding</h2>
        <p style={sectionHint}>
          <b>Why we ask:</b> calibrates the dev bootstrapper's defaults
          (prompt depth, assumed tooling). Leave blank if you don't code —
          the dev bootstrapper just uses general defaults.
        </p>
        <input
          type="number"
          min={0}
          max={60}
          step={1}
          placeholder="e.g. 3"
          value={profile.yearsCoding ?? ''}
          onChange={(e) => {
            const n = e.target.value === '' ? undefined : Number(e.target.value)
            setYearsCoding(Number.isFinite(n as number) ? (n as number) : undefined)
          }}
          className={s.input}
        />
      </section>

      {/* Known topics */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={sectionTitle}>Already know</h2>
        <p style={sectionHint}>
          <b>Why we ask:</b> Learn dims topics you've marked as known so
          you can focus on what's new. Nothing's hidden — just de-emphasized.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {tracks.map(track => {
            const list = topics.filter(t => t.trackId === track.id)
              .sort((a, b) => a.order - b.order)
            if (list.length === 0) return null
            return (
              <div key={track.id}>
                <div style={trackLabel}>{track.title}</div>
                <div className={s.optionGrid}>
                  {list.map(topic => {
                    const picked = known.has(topic.id)
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        className={`${s.option} ${picked ? s.optionOn : ''}`}
                        onClick={() => toggleKnownTopic(topic.id)}
                      >
                        <div className={s.optionBody}>
                          <div className={s.optionTitle}>{topic.title}</div>
                          <div className={s.optionSub}>{topic.summary}</div>
                        </div>
                        {picked && <span className={s.check}><Check size={12} /></span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Danger zone — reset */}
      <section style={{ marginTop: 'var(--space-12)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--hair)' }}>
        <h2 style={sectionTitle}>Reset profile</h2>
        <p style={sectionHint}>
          Clears every field back to defaults. Local only — nothing about
          your Learn progress or Projects is touched.
        </p>
        <Button variant="danger" onClick={hardReset}>Reset profile</Button>
      </section>
    </div>
  )
}

const sectionTitle = {
  fontSize: 'var(--text-lg)',
  fontWeight: 600,
  color: 'var(--ink-1)',
  marginBottom: 6,
  letterSpacing: 'var(--tracking-tight)',
} as const

const sectionHint = {
  fontSize: 'var(--text-sm)',
  color: 'var(--ink-3)',
  marginBottom: 'var(--space-4)',
  maxWidth: '58ch',
} as const

const trackLabel = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-3)',
  marginBottom: 6,
}
