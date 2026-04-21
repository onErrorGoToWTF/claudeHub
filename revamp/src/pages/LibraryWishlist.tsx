import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Undo2 } from 'lucide-react'
import { repo } from '../db/repo'
import type { SearchMiss } from '../db/types'
import { Chip, Empty, List, PageHeader, Row } from '../ui'

function when(ts: number) {
  const d = Date.now() - ts
  const m = Math.floor(d / 60_000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

export function LibraryWishlist() {
  const [misses, setMisses] = useState<SearchMiss[]>([])
  const [showResolved, setShowResolved] = useState(false)

  useEffect(() => { repo.listSearchMisses().then(setMisses) }, [])

  async function toggleResolved(m: SearchMiss) {
    await repo.resolveSearchMiss(m.id, !m.resolved)
    setMisses(list => list.map(x => x.id === m.id ? { ...x, resolved: !m.resolved } : x))
  }

  const shown = misses
    .filter(m => showResolved || !m.resolved)
    .sort((a, b) => Number(a.resolved) - Number(b.resolved)
                 || b.count - a.count
                 || b.lastAt - a.lastAt)

  const openCount = misses.filter(m => !m.resolved).length

  return (
    <div className="page">
      <Link to="/library" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)', fontSize: 13, marginBottom: 12 }}>
        <ArrowLeft size={14} strokeWidth={1.75} /> Back to Library
      </Link>

      <PageHeader
        eyebrow="Library · Wishlist"
        title="Searches that came up empty"
        subtitle="Everything you (or anyone) looked for that isn't in the library yet. Sorted by how often it was searched."
        right={
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
            <input
              type="checkbox"
              checked={showResolved}
              onChange={e => setShowResolved(e.target.checked)}
            />
            Show resolved
          </label>
        }
      />

      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
        {openCount} open · {misses.length - openCount} resolved
      </div>

      {shown.length === 0 ? (
        <Empty>Nothing here yet. Empty searches in the Library will show up on this page so you can triage what to author.</Empty>
      ) : (
        <List>
          {shown.map(m => (
            <Row
              key={m.id}
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ textDecoration: m.resolved ? 'line-through' : 'none', color: m.resolved ? 'var(--ink-3)' : 'inherit' }}>
                    {m.query}
                  </span>
                  {m.resolved && <Chip variant="mastery">resolved</Chip>}
                </span>
              }
              sub={`searched ${m.count}× · last ${when(m.lastAt)}`}
              right={
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); toggleResolved(m) }}
                  aria-label={m.resolved ? 'Mark unresolved' : 'Mark resolved'}
                  title={m.resolved ? 'Mark unresolved' : 'Mark resolved'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink-2)', border: '1px solid var(--hair)',
                    background: 'transparent',
                  }}
                >
                  {m.resolved
                    ? <Undo2 size={14} strokeWidth={1.75} />
                    : <Check size={14} strokeWidth={1.75} />}
                </button>
              }
            />
          ))}
        </List>
      )}
    </div>
  )
}
