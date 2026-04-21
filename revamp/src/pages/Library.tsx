import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, FileText, Film, FlaskConical, Pin, PinOff, Search, Wrench } from 'lucide-react'
import { repo } from '../db/repo'
import type { LibraryItem, LibraryKind } from '../db/types'
import { Chip, List, PageHeader, Row, Empty } from '../ui'
import styles from './Library.module.css'

type Facet = 'all' | LibraryKind

const FACETS: { id: Facet; label: string; Icon?: typeof Wrench }[] = [
  { id: 'all',       label: 'All' },
  { id: 'tool',      label: 'Tools',     Icon: Wrench },
  { id: 'document',  label: 'Documents', Icon: FileText },
  { id: 'article',   label: 'Articles',  Icon: BookOpen },
  { id: 'video',     label: 'Videos',    Icon: Film },
  { id: 'paper',     label: 'Papers',    Icon: FlaskConical },
]

type Sort = 'newest' | 'alpha' | 'pinned'

export function Library() {
  const nav = useNavigate()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [facet, setFacet] = useState<Facet>('all')
  const [sort, setSort] = useState<Sort>('pinned')
  const [query, setQuery] = useState('')

  useEffect(() => { repo.listLibrary().then(setItems) }, [])

  const shown = useMemo(() => {
    let out = items
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
  }, [items, facet, sort, query])

  async function togglePin(item: LibraryItem) {
    await repo.togglePinned(item.id, !item.pinned)
    setItems(list => list.map(x => x.id === item.id ? { ...x, pinned: !x.pinned } : x))
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length }
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1
    return c
  }, [items])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Library"
        title="Your reference shelf"
        subtitle="Tools, docs, articles, videos. Pin the ones you come back to."
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
        <Empty>Nothing matches. Clear filters or search.</Empty>
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
    </div>
  )
}

function KindDot({ kind }: { kind: LibraryKind }) {
  const map: Record<LibraryKind, { bg: string; fg: string; label: string }> = {
    tool:     { bg: 'color-mix(in oklch, var(--accent-base) 18%, var(--bg-card))', fg: 'var(--accent-ink)', label: 'T' },
    document: { bg: 'color-mix(in oklch, var(--ink-1) 10%, var(--bg-card))',       fg: 'var(--ink-1)',     label: 'D' },
    article:  { bg: 'color-mix(in oklch, var(--mastery-base) 16%, var(--bg-card))', fg: 'color-mix(in oklch, var(--mastery-base) 60%, black)', label: 'A' },
    video:    { bg: 'color-mix(in oklch, var(--danger-base) 14%, var(--bg-card))',  fg: 'color-mix(in oklch, var(--danger-base) 60%, black)',  label: 'V' },
    paper:    { bg: 'color-mix(in oklch, var(--ink-1) 14%, var(--bg-card))',        fg: 'var(--ink-1)',     label: 'P' },
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
