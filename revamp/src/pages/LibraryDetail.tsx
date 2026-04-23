import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pin, PinOff, Bookmark, BookmarkMinus } from 'lucide-react'
import { repo } from '../db/repo'
import type { LibraryItem, Topic, Project } from '../db/types'
import { Button, PageHeader, Section, Tile, TileTitle, TileMeta, TileRow, Chip } from '../ui'
import { grid } from '../ui/grid'
import { Markdown } from '../ui/Markdown'
import { STATUS_LABEL, statusChipVariant } from '../lib/projectStatus'
import styles from './LessonView.module.css'

const KIND_LABEL: Record<string, string> = {
  tool: 'Tool', doc: 'Doc', read: 'Read', video: 'Video',
}

export function LibraryDetail() {
  const { id = '' } = useParams()
  const [item, setItem] = useState<LibraryItem | null | undefined>(undefined)
  const [related, setRelated] = useState<{
    library: LibraryItem[]
    topics:  Topic[]
    projects: Project[]
  }>({ library: [], topics: [], projects: [] })

  useEffect(() => { repo.getLibraryItem(id).then(i => setItem(i ?? null)) }, [id])

  // Discovery around a library item. "See also" merges author-curated
  // related IDs with tag-overlap neighbors (dedup, same-item filtered out).
  // "Referenced by" uses the repo backlinks helper — any topic, library,
  // or project that names this item in a related/prereq/gap field.
  useEffect(() => {
    if (!item) { setRelated({ library: [], topics: [], projects: [] }); return }
    ;(async () => {
      const [allLibrary, backlinks] = await Promise.all([
        repo.listLibrary(),
        repo.getBacklinks(item.id),
      ])
      const authorRelated = (item.relatedLibraryIds ?? [])
        .map(rid => allLibrary.find(l => l.id === rid))
        .filter((l): l is LibraryItem => !!l)
      const itemTags = new Set(item.tags.map(t => t.toLowerCase()))
      const tagNeighbors = itemTags.size === 0 ? [] : allLibrary
        .filter(l => l.id !== item.id && !!l.body)
        .filter(l => l.tags.some(t => itemTags.has(t.toLowerCase())))
      const seen = new Set<string>()
      const libraryCombined: LibraryItem[] = []
      for (const l of [...authorRelated, ...tagNeighbors]) {
        if (seen.has(l.id)) continue
        seen.add(l.id)
        libraryCombined.push(l)
        if (libraryCombined.length >= 6) break
      }
      setRelated({
        library:  libraryCombined,
        topics:   backlinks.topics,
        projects: backlinks.projects,
      })
    })()
  }, [item])

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

      {related.library.length > 0 && (
        <Section title="See also" meta={`${related.library.length}`}>
          <div className={grid}>
            {related.library.map(l => (
              <Link key={l.id} to={`/library/${l.id}`} style={{ color: 'inherit' }}>
                <Tile>
                  <TileRow><TileTitle>{l.title}</TileTitle></TileRow>
                  {l.summary && <TileMeta>{l.summary}</TileMeta>}
                </Tile>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {(related.topics.length > 0 || related.projects.length > 0) && (
        <Section title="Referenced by" meta={`${related.topics.length + related.projects.length}`}>
          <div className={grid}>
            {related.topics.map(t => (
              <Link key={t.id} to={`/learn/topic/${t.id}`} style={{ color: 'inherit' }}>
                <Tile>
                  <TileRow><TileTitle>{t.title}</TileTitle></TileRow>
                  {t.summary && <TileMeta>{t.summary}</TileMeta>}
                  <TileMeta>Topic</TileMeta>
                </Tile>
              </Link>
            ))}
            {related.projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} style={{ color: 'inherit' }}>
                <Tile>
                  <TileRow><TileTitle>{p.title}</TileTitle></TileRow>
                  {p.summary && <TileMeta>{p.summary}</TileMeta>}
                  <TileRow>
                    <Chip variant={statusChipVariant(p.status)}>{STATUS_LABEL[p.status]}</Chip>
                  </TileRow>
                </Tile>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
