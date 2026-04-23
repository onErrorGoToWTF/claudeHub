import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, BookOpen, FolderGit2, Library as LibraryIcon, GraduationCap,
} from 'lucide-react'
import { repo } from '../db/repo'
import type { Lesson, LibraryItem, Project, Topic, Track } from '../db/types'
import { isPrimaryForPathway } from '../lib/audience'
import { useUserStore } from '../state/userStore'
import styles from './ui.module.css'

type Hit = {
  id: string
  kind: 'track' | 'topic' | 'lesson' | 'project' | 'library'
  title: string
  sub?: string
  to: string
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const pathway = useUserStore(s => s.pathway)
  const [query, setQuery] = useState('')
  const [focusIdx, setFocusIdx] = useState(0)
  const [idx, setIdx] = useState<{
    tracks: Track[]; topics: Topic[]; lessons: Lesson[];
    projects: Project[]; library: LibraryItem[];
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load the search index once the modal opens.
  useEffect(() => {
    if (!open) return
    let alive = true
    ;(async () => {
      const [tracks, topics, lessons, projects, library] = await Promise.all([
        repo.listTracks(),
        repo.listTopics(),
        Promise.all((await repo.listTopics()).map(t => repo.listLessons(t.id))).then(xs => xs.flat()),
        repo.listProjects(),
        repo.listLibrary(),
      ])
      if (!alive) return
      setIdx({ tracks, topics, lessons, projects, library })
    })()
    return () => { alive = false }
  }, [open])

  // Focus the input when the modal opens; reset state when it closes.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      // Syncing prop -> internal on close is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')
      setFocusIdx(0)
    }
  }, [open])

  // Global Escape to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const hits = useMemo<Hit[]>(() => {
    if (!idx) return []
    const q = query.trim().toLowerCase()
    if (!q) return []

    const match = (s: string | undefined) => !!s && s.toLowerCase().includes(q)
    const matchTags = (tags?: string[]) =>
      !!tags && tags.some(tg => tg.toLowerCase().includes(q))
    const out: Hit[] = []

    // Pathway sorts results — never hides them. Collect then sort at the end.
    const scored: Array<Hit & { primary: boolean }> = []
    const push = (hit: Hit, audienceSource?: { audience?: import('../db/types').Audience[] }) => {
      scored.push({ ...hit, primary: isPrimaryForPathway(pathway, audienceSource?.audience) })
    }
    for (const t of idx.tracks) {
      if (match(t.title) || match(t.summary) || matchTags(t.tags)) {
        push({ id: `track:${t.id}`, kind: 'track', title: t.title, sub: t.summary, to: '/learn' }, t)
      }
    }
    for (const t of idx.topics) {
      if (match(t.title) || match(t.summary) || matchTags(t.tags)) {
        push({ id: `topic:${t.id}`, kind: 'topic', title: t.title, sub: t.summary, to: `/learn/topic/${t.id}` }, t)
      }
    }
    for (const l of idx.lessons) {
      if (match(l.title) || match(l.summary) || match(l.body)) {
        push({ id: `lesson:${l.id}`, kind: 'lesson', title: l.title, sub: l.summary, to: `/learn/lesson/${l.id}` })
      }
    }
    for (const p of idx.projects) {
      if (match(p.title) || match(p.summary) || matchTags(p.tags)) {
        push({ id: `proj:${p.id}`, kind: 'project', title: p.title, sub: p.summary, to: `/projects/${p.id}` })
      }
    }
    for (const i of idx.library) {
      if (!i.body) continue
      if (match(i.title) || match(i.summary) || i.tags.some(tg => tg.toLowerCase().includes(q))) {
        push({
          id: `lib:${i.id}`,
          kind: 'library',
          title: i.title,
          sub: i.summary ?? i.tags.join(' · '),
          to: `/library/${i.id}`,
        }, i)
      }
    }
    // Stable sort: primary-for-pathway first.
    scored.sort((a, b) => Number(b.primary) - Number(a.primary))
    out.push(...scored)
    return out.slice(0, 40)
  }, [idx, query, pathway])

  // Clamp focus when hit set changes. Resetting to top on query change is intentional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusIdx(0)
  }, [query])

  function activate(h: Hit) {
    nav(h.to)
    onClose()
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (hits.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter')   { e.preventDefault(); activate(hits[focusIdx]) }
  }

  if (!open) return null

  return (
    <div
      className={styles.searchScrim}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className={styles.searchModal}>
        <div className={styles.searchInputWrap}>
          <Search size={16} strokeWidth={1.75} />
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="search"
            placeholder="Search topics, lessons, projects, library…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
          />
          <button
            type="button"
            onClick={onClose}
            className={styles.searchClose}
            aria-label="Close search"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        <div className={styles.searchResults} role="status" aria-live="polite">
          {query.trim() === '' ? (
            <div className={styles.searchHint}>
              Start typing to search across Learn, Projects, and Library.
              <div className={styles.searchKey}>Esc to close · ↑↓ to navigate · Enter to open</div>
            </div>
          ) : hits.length === 0 ? (
            <div className={styles.searchHint}>No matches.</div>
          ) : (
            <ul className={styles.searchList}>
              {hits.map((h, i) => {
                const focused = i === focusIdx
                return (
                  <li
                    key={h.id}
                    className={`${styles.searchItem} ${focused ? styles.searchItemFocus : ''}`}
                    onMouseEnter={() => setFocusIdx(i)}
                    onMouseDown={(e) => { e.preventDefault(); activate(h) }}
                  >
                    <KindBadge kind={h.kind} />
                    <div className={styles.searchItemBody}>
                      <div className={styles.searchItemTitle}>{h.title}</div>
                      {h.sub && <div className={styles.searchItemSub}>{h.sub}</div>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function KindBadge({ kind }: { kind: Hit['kind'] }) {
  const common = { size: 13, strokeWidth: 1.75 as const }
  const map = {
    track:   { Icon: GraduationCap, label: 'Track' },
    topic:   { Icon: BookOpen,      label: 'Topic' },
    lesson:  { Icon: BookOpen,      label: 'Lesson' },
    project: { Icon: FolderGit2,    label: 'Project' },
    library: { Icon: LibraryIcon,   label: 'Library' },
  } as const
  const { Icon, label } = map[kind]
  return (
    <span className={styles.searchBadge}>
      <Icon {...common} />
      <span>{label}</span>
    </span>
  )
}
