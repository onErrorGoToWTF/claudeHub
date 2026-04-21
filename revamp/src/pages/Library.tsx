import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, FileText, Film, Pin, PinOff, Search, Wrench, ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { LibraryItem, LibraryKind } from '../db/types'
import { Chip, List, PageHeader, Row, Empty } from '../ui'
import { matchesPathway } from '../lib/audience'
import { useUserStore } from '../state/userStore'
import styles from './Library.module.css'

type Facet = 'all' | LibraryKind

const FACETS: { id: Facet; label: string; Icon?: typeof Wrench }[] = [
  { id: 'all',   label: 'All' },
  { id: 'tool',  label: 'Tools', Icon: Wrench },
  { id: 'doc',   label: 'Docs',  Icon: FileText },
  { id: 'read',  label: 'Reads', Icon: BookOpen },
  { id: 'video', label: 'Videos', Icon: Film },
]

type Sort = 'newest' | 'alpha' | 'pinned'

export function Library() {
  const nav = useNavigate()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [facet, setFacet] = useState<Facet>('all')
  const [sort, setSort] = useState<Sort>('pinned')
  const [query, setQuery] = useState('')
  const [missLogged, setMissLogged] = useState<string | null>(null)
  const [openMisses, setOpenMisses] = useState(0)
  const loggedRef = useRef<Set<string>>(new Set())
  const pathway = useUserStore(st => st.pathway)

  useEffect(() => { repo.listLibrary().then(setItems) }, [])
  useEffect(() => {
    repo.listSearchMisses().then(ms => setOpenMisses(ms.filter(m => !m.resolved).length))
  }, [missLogged])

  const shown = useMemo(() => {
    // Only surface items with in-app body content.
    // Incomplete tool entries still exist in the DB (they drive the Projects
    // intake stack picker) — they just don't clutter the Library list.
    let out = items.filter(i => !!i.body)
    out = out.filter(i => matchesPathway(pathway, i.audience))
    if (facet !== 'all') out = out.filter(i => i.kind === facet)
    if (query.trim()) {
      const q = query.toLowerCase()
      out = out.filter(i =>
        i.title.toLowerCase().includes(q)
        || (i.summary?.toLowerCase().includes(q) ?? false)
        || i.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    const sorted = [...out]
    if (sort === 'alpha')  sorted.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'newest') sorted.sort((a, b) => b.addedAt - a.addedAt)
    if (sort === 'pinned') sorted.sort((a, b) =>
      Number(b.pinned) - Number(a.pinned) || b.addedAt - a.addedAt
    )
    return sorted
  }, [items, facet, sort, query, pathway])

  // Debounce-log a miss: 900ms after the user stops typing, if query is
  // non-trivial AND has zero matches, persist it to `searchMisses` and
  // surface an inline "we'll add it" note. Per-session dedupe so a user
  // mashing the backspace key doesn't rack up count inflation.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setMissLogged(null); return }
    if (shown.length > 0) { setMissLogged(null); return }
    const key = q.toLowerCase()
    if (loggedRef.current.has(key)) { setMissLogged(q); return }
    const t = setTimeout(async () => {
      try {
        await repo.logSearchMiss(q)
        loggedRef.current.add(key)
        setMissLogged(q)
      } catch { /* empty query etc. — ignore */ }
    }, 900)
    return () => clearTimeout(t)
  }, [query, shown.length])

  async function togglePin(item: LibraryItem) {
    await repo.togglePinned(item.id, !item.pinned)
    setItems(list => list.map(x => x.id === item.id ? { ...x, pinned: !x.pinned } : x))
  }

  const counts = useMemo(() => {
    const withBody = items.filter(i => !!i.body)
    const c: Record<string, number> = { all: withBody.length }
    for (const i of withBody) c[i.kind] = (c[i.kind] ?? 0) + 1
    return c
  }, [items])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Library"
        title="Your reference shelf"
        subtitle="Tools, docs, articles, videos."
      />

      {/* Search */}
      <div className={styles.search}>
        <Search size={14} strokeWidth={1.75} />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, summary, or tag…"
        />
      </div>

      {/* Filters + sort */}
      <div className={styles.bar}>
        <div className={styles.facets}>
          {FACETS.map(f => {
            const active = facet === f.id
            return (
              <button
                key={f.id}
                type="button"
                className={`${styles.facet} ${active ? styles.facetOn : ''}`}
                onClick={() => setFacet(f.id)}
              >
                {f.Icon && <f.Icon size={13} strokeWidth={1.75} />}
                <span>{f.label}</span>
                <span className={styles.facetCount}>{counts[f.id] ?? 0}</span>
              </button>
            )
          })}
        </div>
        <label className={styles.sort}>
          <span>Sort</span>
          <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
            <option value="pinned">Pinned first</option>
            <option value="newest">Newest</option>
            <option value="alpha">A–Z</option>
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        missLogged ? (
          <Empty>
            <strong>“{missLogged}”</strong> isn&apos;t in the library yet — noted.
            It&apos;ll be added shortly.
          </Empty>
        ) : (
          <Empty>Nothing matches. Clear filters or search.</Empty>
        )
      ) : (
        <List>
          {shown.map(i => (
            <Row
              key={i.id}
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <KindDot kind={i.kind} />
                  {i.title}
                </span>
              }
              sub={
                <>
                  {i.summary ?? toolSub(i)}
                  {i.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {i.tags.map(t => <Chip key={t}>{t}</Chip>)}
                      {i.kind === 'tool' && i.owned && <Chip variant="mastery">owned</Chip>}
                    </div>
                  )}
                </>
              }
              right={
                <button
                  type="button"
                  className={styles.pinBtn}
                  onClick={e => { e.stopPropagation(); togglePin(i) }}
                  aria-label={i.pinned ? 'Unpin' : 'Pin'}
                  title={i.pinned ? 'Unpin' : 'Pin'}
                >
                  {i.pinned ? <Pin size={14} strokeWidth={2} /> : <PinOff size={14} strokeWidth={1.5} />}
                </button>
              }
              onClick={() => {
                if (i.body) nav(`/library/${i.id}`)
              }}
            />
          ))}
        </List>
      )}

      {openMisses > 0 && (
        <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
          <Link
            to="/library/wishlist"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--ink-3)', fontSize: 13,
            }}
          >
            {openMisses} wishlist {openMisses === 1 ? 'entry' : 'entries'} to triage
            <ArrowRight size={13} strokeWidth={1.75} />
          </Link>
        </div>
      )}
    </div>
  )
}

function KindDot({ kind }: { kind: LibraryKind }) {
  const map: Record<LibraryKind, { bg: string; fg: string; label: string }> = {
    tool:  { bg: 'color-mix(in oklch, var(--accent-base) 18%, var(--bg-card))',   fg: 'var(--accent-ink)', label: 'T' },
    doc:   { bg: 'color-mix(in oklch, var(--ink-1) 10%, var(--bg-card))',         fg: 'var(--ink-1)',      label: 'D' },
    read:  { bg: 'color-mix(in oklch, var(--mastery-base) 16%, var(--bg-card))',  fg: 'color-mix(in oklch, var(--mastery-base) 60%, black)', label: 'R' },
    video: { bg: 'color-mix(in oklch, var(--danger-base) 14%, var(--bg-card))',   fg: 'color-mix(in oklch, var(--danger-base) 60%, black)',  label: 'V' },
  }
  const s = map[kind]
  return (
    <span aria-hidden style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, fontSize: 10, fontWeight: 700,
      color: s.fg, background: s.bg, borderRadius: 'var(--radius-sm)', letterSpacing: 0,
    }}>{s.label}</span>
  )
}

function toolSub(i: LibraryItem): string {
  if (i.kind !== 'tool') return ''
  const bits = [i.toolCategory, i.cost, i.owned ? 'owned' : null].filter(Boolean)
  return bits.join(' · ')
}
