import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { repo } from '../db/repo'
import type { Topic, UserPathwayItem, Mastery } from '../db/types'
import { Button, Chip, Empty, List, PageHeader, Row } from '../ui'
import { Disclosure } from '../ui/Disclosure'
import { masteryStatus, MASTERY_LABEL } from '../lib/mastery'
import { useUserStore } from '../state/userStore'
import styles from './MyPathway.module.css'

export function MyPathway() {
  const nav = useNavigate()
  const pathway = useUserStore(st => st.pathway)
  const [items, setItems]     = useState<UserPathwayItem[]>([])
  const [topics, setTopics]   = useState<Record<string, Topic>>({})
  const [mastery, setMastery] = useState<Record<string, number>>({})
  const [showPicker, setShowPicker] = useState(false)

  async function refresh() {
    const [rows, tops, ma] = await Promise.all([
      repo.listPathwayItems(),
      repo.listTopics(),
      repo.listMastery(),
    ])
    setItems(rows)
    setTopics(Object.fromEntries(tops.map(t => [t.id, t])))
    setMastery(Object.fromEntries(ma.map((m: Mastery) => [m.topicId, m.score])))
  }
  useEffect(() => { refresh() }, [])

  const active   = useMemo(() => items.filter(r => r.status === 'active'),   [items])
  const archived = useMemo(() => items.filter(r => r.status === 'archived'), [items])

  async function move(topicId: string, delta: number) {
    const order = active.map(r => r.topicId)
    const i = order.indexOf(topicId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    await repo.reorderPathwayItems(order)
    await refresh()
  }

  async function handleAdd(topicId: string) {
    const row = await repo.addPathwayItem(topicId, 'manual')
    if (!row) return
    await refresh()
  }

  async function handleArchive(topicId: string) {
    await repo.archivePathwayItem(topicId)
    await refresh()
  }
  async function handleUnarchive(topicId: string) {
    await repo.unarchivePathwayItem(topicId)
    await refresh()
  }

  async function handleResetToDefault() {
    const ok = window.confirm(
      `Reset "my pathway"? This replaces your current plan with the ${labelFor(pathway)} default.`,
    )
    if (!ok) return
    await repo.resetPathway(pathway)
    await refresh()
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <BackLink />
        <PageHeader
          eyebrow="My pathway"
          title="Build your plan"
          subtitle="Your pathway is a running, editable list of topics you're planning to take. Seed one from the default, or build it from scratch."
        />
        <div className={styles.emptyActions}>
          {pathway !== 'all' && (
            <Button variant="primary" onClick={async () => {
              await repo.seedPathwayFromTemplate(pathway); await refresh()
            }}>Use the {labelFor(pathway)} default</Button>
          )}
          <Link to="/learn/custom">
            <Button>Build it from scratch</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <BackLink />
      <PageHeader
        eyebrow="My pathway"
        title={`${active.length} active ${active.length === 1 ? 'topic' : 'topics'}`}
        subtitle="Drag, add, or archive. Archive preserves your record — it never deletes progress."
        right={
          <Button onClick={() => setShowPicker(true)}><Plus size={14} /> Add topic</Button>
        }
      />

      <List>
        <AnimatePresence initial={false}>
          {active.map((row, idx) => {
            const topic = topics[row.topicId]
            if (!topic) return null
            const score = mastery[row.topicId] ?? 0
            const status = masteryStatus(score)
            return (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <Row
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className={styles.posIdx} aria-hidden>{idx + 1}</span>
                      <Link to={`/learn/topic/${topic.id}`} style={{ color: 'inherit' }}>{topic.title}</Link>
                    </span>
                  }
                  sub={topic.summary}
                  right={
                    <span className={styles.rowCtrls}>
                      <Chip variant={score > 0 ? 'accent' : 'muted'}>{MASTERY_LABEL[status]}</Chip>
                      <button
                        className={styles.iconBtn}
                        aria-label={`Move ${topic.title} up`}
                        disabled={idx === 0}
                        onClick={(e) => { e.stopPropagation(); move(topic.id, -1) }}
                      ><ArrowUp size={14} /></button>
                      <button
                        className={styles.iconBtn}
                        aria-label={`Move ${topic.title} down`}
                        disabled={idx === active.length - 1}
                        onClick={(e) => { e.stopPropagation(); move(topic.id, +1) }}
                      ><ArrowDown size={14} /></button>
                      <button
                        className={styles.iconBtn}
                        aria-label={`Archive ${topic.title}`}
                        onClick={(e) => { e.stopPropagation(); handleArchive(topic.id) }}
                      ><X size={14} /></button>
                    </span>
                  }
                  onClick={() => nav(`/learn/topic/${topic.id}`)}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </List>

      {pathway !== 'all' && (
        <div className={styles.resetRow}>
          <button className={styles.resetBtn} onClick={handleResetToDefault}>
            Reset to {labelFor(pathway)} default
          </button>
        </div>
      )}

      {archived.length > 0 && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <Disclosure label={`Archived (${archived.length})`} meta="Previously in your plan">
            <List>
              {archived.map(row => {
                const topic = topics[row.topicId]
                if (!topic) return null
                return (
                  <Row
                    key={row.id}
                    title={topic.title}
                    sub={topic.summary}
                    right={
                      <button className={styles.resetBtn} onClick={(e) => { e.stopPropagation(); handleUnarchive(topic.id) }}>
                        Restore
                      </button>
                    }
                    onClick={() => nav(`/learn/topic/${topic.id}`)}
                  />
                )
              })}
            </List>
          </Disclosure>
        </div>
      )}

      {showPicker && (
        <AddTopicPicker
          onClose={() => setShowPicker(false)}
          onPick={async (id) => { await handleAdd(id); setShowPicker(false) }}
          excludeIds={new Set(items.map(r => r.topicId))}
        />
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/learn" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
    }}>
      <ArrowLeft size={14} /> Back to Learn
    </Link>
  )
}

function labelFor(pw: string): string {
  return pw === 'student' ? 'Student'
    : pw === 'office'   ? 'Office'
    : pw === 'media'    ? 'Media creator'
    : pw === 'vibe'     ? 'Vibe coder'
    : pw === 'dev'      ? 'Developer'
    : 'everyone'
}

// ---------- add-topic modal ----------
function AddTopicPicker({
  onClose, onPick, excludeIds,
}: {
  onClose: () => void
  onPick: (topicId: string) => void
  excludeIds: Set<string>
}) {
  const [q, setQ]          = useState('')
  const [topics, setTopics] = useState<Topic[]>([])

  useEffect(() => { repo.listTopics().then(setTopics) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pool = useMemo(() => {
    const all = topics.filter(t => !excludeIds.has(t.id))
    if (!q.trim()) return all
    const needle = q.trim().toLowerCase()
    return all.filter(t =>
      t.title.toLowerCase().includes(needle) || t.summary.toLowerCase().includes(needle)
    )
  }, [topics, q, excludeIds])

  const prereqOk = (t: Topic, active: Set<string>): boolean => {
    if (!t.prereqTopicIds?.length) return true
    return t.prereqTopicIds.every(id => active.has(id))
  }

  const activeSet = useMemo(() => {
    // any row not excluded means this topic isn't in the pathway — but we
    // only need "active" set for prereq checks, which excludeIds already
    // covers (archived rows are in excludeIds too). Keeping the hook shape
    // simple: treat excluded as "in the pathway".
    return excludeIds
  }, [excludeIds])

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <input
            autoFocus
            className={styles.searchInput}
            placeholder="Search topics…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          {pool.length === 0 ? (
            <Empty>No topics match.</Empty>
          ) : (
            <List>
              {pool.map(t => {
                const ok = prereqOk(t, activeSet)
                return (
                  <Row
                    key={t.id}
                    title={t.title}
                    sub={
                      <>
                        {t.summary}
                        {!ok && <div className={styles.prereqHint}>Needs prereqs first.</div>}
                      </>
                    }
                    right={ok ? <Chip variant="accent">Add</Chip> : <Chip variant="muted">Locked</Chip>}
                    onClick={() => { if (ok) onPick(t.id) }}
                  />
                )
              })}
            </List>
          )}
        </div>
      </div>
    </div>
  )
}
