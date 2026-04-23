import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { repo } from '../db/repo'
import type { InventoryItem, Project, ProjectEvent, Topic } from '../db/types'
import { Button, Chip, List, PageHeader, ProgressBar, Row, Section, Tile, TileMeta, TileRow, TileTitle } from '../ui'
import { grid } from '../ui/grid'
import { Check } from 'lucide-react'
import { ROUTE_LABELS, ROUTE_BLURBS } from '../lib/projectRoutes'
import { STATUSES, HEALTHS, STATUS_LABEL, HEALTH_LABEL, showsHealth } from '../lib/projectStatus'
import type { ProjectStatus, ProjectHealth } from '../db/types'
import { whenShort } from '../lib/activity'
import styles from './ProjectDetail.module.css'

function HistoryLine({ ev }: { ev: ProjectEvent }) {
  if (ev.kind === 'created') {
    return <span>Project created</span>
  }
  if (ev.kind === 'status_changed') {
    const fromLabel = STATUS_LABEL[ev.from as ProjectStatus] ?? ev.from ?? '—'
    const toLabel   = STATUS_LABEL[ev.to as ProjectStatus]   ?? ev.to   ?? '—'
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        Status
        <Chip>{fromLabel}</Chip>
        <span style={{ color: 'var(--ink-3)' }}>→</span>
        <Chip variant="accent">{toLabel}</Chip>
      </span>
    )
  }
  if (ev.kind === 'health_changed') {
    const label = (v: string | null | undefined) =>
      !v ? 'Cleared' : (HEALTH_LABEL[v as NonNullable<ProjectHealth>] ?? v)
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        Health
        <Chip>{label(ev.from)}</Chip>
        <span style={{ color: 'var(--ink-3)' }}>→</span>
        <Chip variant="accent">{label(ev.to)}</Chip>
      </span>
    )
  }
  return <span>{ev.kind}</span>
}

export function ProjectDetail() {
  const { projectId = '' } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState<Project | null | undefined>(undefined)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [confirmDel, setConfirmDel] = useState(false)
  const [history, setHistory] = useState<ProjectEvent[]>([])

  useEffect(() => {
    ;(async () => {
      const [proj, inv, tops, hist] = await Promise.all([
        repo.getProject(projectId),
        repo.listInventory(),
        repo.listTopics(),
        repo.listProjectEvents(projectId),
      ])
      setP(proj ?? null)
      setInventory(inv)
      setTopics(tops)
      setHistory(hist)
    })()
  }, [projectId])

  async function refreshHistory() {
    setHistory(await repo.listProjectEvents(projectId))
  }

  if (p === undefined) return <div className="page" />
  if (p === null) {
    return (
      <div className="page">
        <Link to="/projects" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
        }}>
          <ArrowLeft size={14} /> All projects
        </Link>
        <PageHeader eyebrow="Project" title="Project not found" subtitle="This project may have been removed or the link is out of date." />
      </div>
    )
  }

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

  async function setStatus(next: ProjectStatus) {
    if (!p || p.status === next) return
    const updated = { ...p, status: next }
    await repo.putProject(updated)
    setP(updated)
    refreshHistory()
  }

  async function setHealth(next: ProjectHealth) {
    if (!p) return
    const nextVal = p.health === next ? null : next
    const updated = { ...p, health: nextVal }
    await repo.putProject(updated)
    setP(updated)
    refreshHistory()
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
        eyebrow={`Project · ${STATUS_LABEL[p.status]}`}
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

      <Section title="Status">
        <div className={styles.statusRow}>
          {STATUSES.map(s => (
            <button
              key={s.id}
              type="button"
              className={`${styles.statusPill} ${p.status === s.id ? styles[`statusPillOn_${s.id}`] : ''}`}
              onClick={() => setStatus(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {showsHealth(p.status) && (
          <div className={styles.healthRow}>
            <span className={styles.healthLabel}>Health</span>
            {HEALTHS.map(h => (
              <button
                key={h.id}
                type="button"
                className={`${styles.healthPill} ${p.health === h.id ? styles[`healthPillOn_${h.id}`] : ''}`}
                onClick={() => setHealth(h.id)}
              >
                {h.label}
              </button>
            ))}
            {p.health && (
              <span className={styles.healthActive}>
                {HEALTH_LABEL[p.health]}
              </span>
            )}
          </div>
        )}
      </Section>

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
                  background: 'var(--bg-card)', border: '1.5px solid var(--hair-strong)',
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

      {history.length > 0 && (
        <Section title="History" meta={`${history.length} ${history.length === 1 ? 'event' : 'events'}`}>
          <List>
            {history.map(ev => (
              <Row
                key={ev.id}
                title={<HistoryLine ev={ev} />}
                right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>{whenShort(ev.ts)}</span>}
              />
            ))}
          </List>
        </Section>
      )}
    </div>
  )
}
