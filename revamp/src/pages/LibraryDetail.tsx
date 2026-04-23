import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pin, PinOff, Bookmark, BookmarkMinus } from 'lucide-react'
import { repo } from '../db/repo'
import type { LibraryItem } from '../db/types'
import { Button, PageHeader } from '../ui'
import { Markdown } from '../ui/Markdown'
import styles from './LessonView.module.css'

const KIND_LABEL: Record<string, string> = {
  tool: 'Tool', doc: 'Doc', read: 'Read', video: 'Video',
}

export function LibraryDetail() {
  const { id = '' } = useParams()
  const [item, setItem] = useState<LibraryItem | null | undefined>(undefined)

  useEffect(() => { repo.getLibraryItem(id).then(i => setItem(i ?? null)) }, [id])

  if (item === undefined) return <div className="page" />
  if (item === null) {
    return (
      <div className="page">
        <Link to="/library" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
        }}>
          <ArrowLeft size={14} /> Back to Library
        </Link>
        <PageHeader eyebrow="Library" title="Item not found" subtitle="This item may have been removed or the link is out of date." />
      </div>
    )
  }

  async function togglePin() {
    if (!item) return
    await repo.togglePinned(item.id, !item.pinned)
    setItem({ ...item, pinned: !item.pinned })
  }
  async function toggleSave() {
    if (!item) return
    const next = !item.savedForLater
    await repo.toggleSavedForLater(item.id, next)
    setItem({ ...item, savedForLater: next })
  }

  return (
    <div className="page">
      <Link to="/library" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
      }}>
        <ArrowLeft size={14} /> Back to Library
      </Link>

      <PageHeader
        eyebrow={KIND_LABEL[item.kind] ?? item.kind}
        title={item.title}
        subtitle={item.summary}
        right={
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <Button variant="ghost" onClick={toggleSave}>
              {item.savedForLater ? <BookmarkMinus size={14} /> : <Bookmark size={14} />}
              {item.savedForLater ? 'Saved' : 'Save for later'}
            </Button>
            <Button variant="ghost" onClick={togglePin}>
              {item.pinned ? <Pin size={14} /> : <PinOff size={14} />}
              {item.pinned ? 'Pinned' : 'Pin'}
            </Button>
          </span>
        }
      />

      {item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
          {item.tags.map(t => (
            <Link
              key={t}
              to={`/library?tag=${encodeURIComponent(t)}`}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 8px', fontSize: 'var(--text-xs)', lineHeight: 1.4,
                color: 'var(--ink-2)', background: 'var(--bg-card)',
                border: '1px solid var(--hair)', borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
              }}
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      {item.body ? (
        <article className={styles.article}>
          <Markdown text={item.body} />
        </article>
      ) : (
        <div style={{
          padding: 'var(--space-8)', textAlign: 'center',
          color: 'var(--ink-3)', border: '1px dashed var(--hair-strong)',
          borderRadius: 'var(--radius-md)',
        }}>
          No in-app notes yet.
        </div>
      )}
    </div>
  )
}
