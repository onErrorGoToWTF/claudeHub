import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen, FileText, Film, Pin, PinOff, Search, Wrench, ArrowRight,
  SlidersHorizontal, X,
} from 'lucide-react'
import { repo } from '../db/repo'
import type { LibraryItem, LibraryKind } from '../db/types'
import { Chip, List, PageHeader, Row, Empty } from '../ui'
import { AudienceBadge } from '../ui/AudienceBadge'
import { Disclosure } from '../ui/Disclosure'
import { splitByPathway, shouldCollapseRestByDefault, type UserPathway } from '../lib/audience'
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
const FACET_LABEL: Record<Facet, string> = Object.fromEntries(
  FACETS.map(f => [f.id, f.label]),
) as Record<Facet, string>

type Sort = 'newest' | 'alpha' | 'pinned'
const SORT_LABEL: Record<Sort, string> = {
  pinned: 'Pinned first',
  newest: 'Newest',
  alpha:  'A–Z',
}
const DEFAULT_FACET: Facet = 'all'
const DEFAULT_SORT:  Sort  = 'pinned'

export function Library() {
  const nav = useNavigate()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [facet, setFacet] = useState<Facet>(DEFAULT_FACET)
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [missLogged, setMissLogged] = useState<string | null>(null)
  const [openMisses, setOpenMisses] = useState(0)
  const loggedRef = useRef<Set<string>>(new Set())
  const filterRef = useRef<HTMLDivElement>(null)
  const pathway = useUserStore(st => st.pathway)

  useEffect(() => { repo.listLibrary().then(setItems) }, [])
  useEffect(() => {
    repo.listSearchMisses().then(ms => setOpenMisses(ms.filter(m => !m.resolved).length))
  }, [missLogged])

  // Close the filter popover on outside click or Escape.
  useEffect(() => {
    if (!filterOpen) return
    const onDown = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [filterOpen])

  // Apply facet + search + user sort to the raw list. Pathway does NOT
  // filter — it's applied later as a soft split (primary + rest).
  const sorted = useMemo(() => {
    let out = items.filter(i => !!i.body)
    if (facet !== 'all') out = out.filter(i => i.kind === facet)
    if (query.trim()) {
      const q = query.toLowerCase()
      out = out.filter(i =>
        i.title.toLowerCase().includes(q)
        || (i.summary?.toLowerCase().includes(q) ?? false)
        || i.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    const arr = [...out]
    if (sort === 'alpha')  arr.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'newest') arr.sort((a, b) => b.addedAt - a.addedAt)
    if (sort === 'pinned') arr.sort((a, b) =>
      Number(b.pinned) - Number(a.pinned) || b.addedAt - a.addedAt
    )
    return arr
  }, [items, facet, sort, query])

  // Soft pathway split — primary on top, rest below, no one gets filtered out.
  const { primary, rest, split } = useMemo(
    () => splitByPathway(sorted, i => i.audience, pathway),
    [sorted, pathway],
  )
  // Combined list for the miss-detection + count badge.
  const shown = useMemo(() => [...primary, ...rest], [primary, rest])

  // Debounce-log a miss: 900ms after the user stops typing, if query is
  // non-trivial AND has zero matches, persist it to `searchMisses` and
  // surface an inline "we'll add it" note. Per-session dedupe so a user
  // mashing the backspace key doesn't rack up count inflation.
  //
  // setState calls here are intentional — they sync visible banner state
  // with external inputs (the derived `shown` list + `query`). Lint rule
  // flags this pattern aggressively; behavior is correct.
  useEffect(() => {
    const q = query.trim()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing banner with derived inputs is intentional
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

  const activeFiltersCount =
    (facet !== DEFAULT_FACET ? 1 : 0) + (sort !== DEFAULT_SORT ? 1 : 0)

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

      {/* Filter button + inline active chips. Secondary controls hide in
          a popover so the library entry stays spare as the catalog grows. */}
      <div className={styles.bar} ref={filterRef}>
        <button
          type="button"
          className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnOn : ''}`}
          onClick={() => setFilterOpen(v => !v)}
          aria-expanded={filterOpen}
          aria-haspopup="true"
        >
          <SlidersHorizontal size={14} strokeWidth={1.75} />
          Filter
          {activeFiltersCount > 0 && <span className={styles.filterBadge}>{activeFiltersCount}</span>}
        </button>

        {(facet !== DEFAULT_FACET || sort !== DEFAULT_SORT) && (
          <div className={styles.activeChips}>
            {facet !== DEFAULT_FACET && (
              <button
                type="button"
                className={styles.chipClear}
                onClick={() => setFacet(DEFAULT_FACET)}
                aria-label={`Clear ${FACET_LABEL[facet]} filter`}
              >
                {FACET_LABEL[facet]} <X size={11} strokeWidth={2} />
              </button>
            )}
            {sort !== DEFAULT_SORT && (
              <button
                type="button"
                className={styles.chipClear}
                onClick={() => setSort(DEFAULT_SORT)}
                aria-label="Reset sort"
              >
                {SORT_LABEL[sort]} <X size={11} strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        <div className={styles.resultMeta}>
          {shown.length} {shown.length === 1 ? 'item' : 'items'}
        </div>

        {filterOpen && (
          <div className={styles.filterPanel} role="dialog" aria-label="Library filters">
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Kind</div>
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
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Sort</div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as Sort)}
                className={styles.sortSelect}
              >
                <option value="pinned">Pinned first</option>
                <option value="newest">Newest</option>
                <option value="alpha">A–Z</option>
              </select>
            </div>
          </div>
        )}
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
        <>
          {split && primary.length > 0 && <BandHeading label="For you" />}
          {primary.length > 0 && (
            <List>
              {primary.map(i => (
                <LibRow key={i.id} item={i} pathway={pathway}
                  onNavigate={() => { if (i.body) nav(`/library/${i.id}`) }}
                  onTogglePin={(e) => { e.stopPropagation(); togglePin(i) }}
                />
              ))}
            </List>
          )}
          {split && rest.length > 0 && (
            <Disclosure
              label="Everything else"
              meta={`${rest.length} ${rest.length === 1 ? 'item' : 'items'}`}
              defaultOpen={!shouldCollapseRestByDefault(pathway)}
            >
              <List>
                {rest.map(i => (
                  <LibRow key={i.id} item={i} pathway={pathway}
                    onNavigate={() => { if (i.body) nav(`/library/${i.id}`) }}
                    onTogglePin={(e) => { e.stopPropagation(); togglePin(i) }}
                  />
                ))}
              </List>
            </Disclosure>
          )}
        </>
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

function BandHeading({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline',
      margin: 'var(--space-6) 0 var(--space-2)',
      paddingBottom: 6,
      borderBottom: '1px solid var(--hair)',
    }}>
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: muted ? 'var(--ink-3)' : 'var(--ink-2)',
      }}>{label}</span>
    </div>
  )
}

function LibRow({ item, pathway, onNavigate, onTogglePin }: {
  item: LibraryItem
  pathway: UserPathway
  onNavigate: () => void
  onTogglePin: (e: React.MouseEvent) => void
}) {
  return (
    <Row
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <KindDot kind={item.kind} />
          {item.title}
          <AudienceBadge audience={item.audience} pathway={pathway} />
        </span>
      }
      sub={
        <>
          {item.summary ?? toolSub(item)}
          {item.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {item.tags.map(t => <Chip key={t}>{t}</Chip>)}
              {item.kind === 'tool' && item.owned && <Chip variant="mastery">owned</Chip>}
            </div>
          )}
        </>
      }
      right={
        <button
          type="button"
          className={styles.pinBtn}
          onClick={onTogglePin}
          aria-label={item.pinned ? 'Unpin' : 'Pin'}
          title={item.pinned ? 'Unpin' : 'Pin'}
        >
          {item.pinned ? <Pin size={14} strokeWidth={2} /> : <PinOff size={14} strokeWidth={1.5} />}
        </button>
      }
      onClick={onNavigate}
    />
  )
}

function KindDot({ kind }: { kind: LibraryKind }) {
  const map: Record<LibraryKind, { Icon: typeof Wrench; title: string }> = {
    tool:  { Icon: Wrench,   title: 'Tool'  },
    doc:   { Icon: FileText, title: 'Doc'   },
    read:  { Icon: BookOpen, title: 'Read'  },
    video: { Icon: Film,     title: 'Video' },
  }
  const s = map[kind]
  const Icon = s.Icon
  return (
    <span aria-label={s.title} title={s.title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22,
      color: 'var(--ink-2)', flexShrink: 0,
    }}>
      <Icon size={14} strokeWidth={1.75} />
    </span>
  )
}

function toolSub(i: LibraryItem): string {
  if (i.kind !== 'tool') return ''
  const bits = [i.toolCategory, i.cost, i.owned ? 'owned' : null].filter(Boolean)
  return bits.join(' · ')
}
