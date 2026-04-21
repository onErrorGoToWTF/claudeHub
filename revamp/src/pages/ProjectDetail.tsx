import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { repo } from '../db/repo'
import type { InventoryItem, Project, Topic } from '../db/types'
import { Button, Chip, List, PageHeader, ProgressBar, Row, Section, Tile, TileMeta, TileRow, TileTitle, grid } from '../ui'
import { Check } from 'lucide-react'
import { ROUTE_LABELS, ROUTE_BLURBS } from '../lib/projectRoutes'
import styles from './ProjectDetail.module.css'

export function ProjectDetail() {
  const { projectId = '' } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState<Project | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [proj, inv, tops] = await Promise.all([
        repo.getProject(projectId),
        repo.listInventory(),
        repo.listTopics(),
      ])
      setP(proj ?? null)
      setInventory(inv)
      setTopics(tops)
    })()
  }, [projectId])

  if (!p) return <div className="page" />

  const done = p.checklist.filter(c => c.done).length
  const pct = p.checklist.length === 0 ? 0 : done / p.checklist.length

  async function toggle(itemId: string) {
    if (!p) return
    const next = {
      ...p,
      checklist: p.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c),
    }
    await repo.putProject(next)
    setP(next)
  }

  async function remove() {
    if (!p) return
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return }
    await repo.deleteProject(p.id)
    nav('/projects')
  }

  const invById = new Map(inventory.map(i => [i.id, i]))
  const topicById = new Map(topics.map(t => [t.id, t]))

  return (
    <div className="page">
      <Link to="/projects" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
      }}>
        <ArrowLeft size={14} /> All projects
      </Link>

      <PageHeader
        eyebrow={`Project · ${p.status}`}
        title={p.title}
        subtitle={p.summary}
        right={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {p.liveUrl && (
              <a href={p.liveUrl} target="_blank" rel="noreferrer">
                <Button><ExternalLink size={14} /> Live</Button>
              </a>
            )}
            <Button variant={confirmDel ? 'danger' : 'ghost'} onClick={remove}>
              <Trash2 size={14} /> {confirmDel ? 'Tap to confirm' : 'Delete'}
            </Button>
          </div>
        }
      />

      <div className={styles.metaRow}>
        <Chip variant="accent">{ROUTE_LABELS[p.route]}</Chip>
        <span className={styles.metaBlurb}>{ROUTE_BLURBS[p.route]}</span>
      </div>

      <Section title="Progress" meta={`${done} / ${p.checklist.length}`}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ProgressBar value={pct} />
        </div>
        <List>
          {p.checklist.map(item => (
            <Row
              key={item.id}
              title={item.label}
              done={item.done}
              right={item.done ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--mastery-solid)', color: 'var(--ink-inverse)',
                }}>
                  <Check size={13} strokeWidth={2.5} />
                </span>
              ) : (
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#fff', border: '1.5px solid var(--hair-strong)',
                }} />
              )}
              onClick={() => toggle(item.id)}
            />
          ))}
        </List>
      </Section>

      <Section title="Stack" meta={`${p.stack.length} items`}>
        <div className={styles.stackRow}>
          {p.stack.map(id => {
            const i = invById.get(id)
            if (!i) return null
            return (
              <Chip key={id} variant={i.owned ? 'mastery' : i.cost === 'free' ? undefined : 'accent'}>
                {i.title}{!i.owned && i.cost !== 'free' ? ' · $$' : ''}
              </Chip>
            )
          })}
        </div>
      </Section>

      <Section title="Learning path" meta={`${p.gapTopicIds.length} topics`}>
        {p.gapTopicIds.length === 0 ? (
          <TileMeta>No gaps — you're clear to build.</TileMeta>
        ) : (
          <div className={grid}>
            {p.gapTopicIds.map(tId => {
              const t = topicById.get(tId)
              if (!t) return null
              return (
                <Link key={tId} to={`/learn/topic/${tId}`} style={{ color: 'inherit' }}>
                  <Tile>
                    <TileRow>
                      <TileTitle>{t.title}</TileTitle>
                      <Chip variant="accent">Go learn →</Chip>
                    </TileRow>
                    <TileMeta>{t.summary}</TileMeta>
                  </Tile>
                </Link>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
