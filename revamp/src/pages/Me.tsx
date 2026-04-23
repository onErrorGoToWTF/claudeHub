import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { repo } from '../db/repo'
import type { Category, Topic, UserPathwayItem, Mastery, Track } from '../db/types'
import { Chip, Empty, List, PageHeader, ProgressBar, Row, Section } from '../ui'
import { Disclosure } from '../ui/Disclosure'
import { masteryStatus, MASTERY_LABEL, MASTERY_THRESHOLD, PASS_THRESHOLD, letterGrade } from '../lib/mastery'
import styles from './Me.module.css'

export function Me() {
  const nav = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [tracks, setTracks]         = useState<Track[]>([])
  const [topics, setTopics]         = useState<Topic[]>([])
  const [mastery, setMastery]       = useState<Record<string, number>>({})
  const [items, setItems]           = useState<UserPathwayItem[]>([])

  async function refresh() {
    const [cats, trs, tops, ma, upi] = await Promise.all([
      repo.listCategories(),
      repo.listTracks(),
      repo.listTopics(),
      repo.listMastery(),
      repo.listPathwayItems(),
    ])
    setCategories(cats)
    setTracks(trs)
    setTopics(tops)
    setMastery(Object.fromEntries(ma.map((m: Mastery) => [m.topicId, m.score])))
    setItems(upi)
  }
  useEffect(() => { refresh() }, [])

  const topicsById = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics])
  const tracksById = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks])

  // Per-category rollup: topics whose track falls in that category, and the
  // user's average mastery across them. Category becomes the visible "how am
  // I doing?" unit rather than per-track.
  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const topicsInCat = topics.filter(t => {
        const track = tracksById.get(t.trackId)
        return track?.categoryId === cat.id
      })
      const touched = topicsInCat.filter(t => (mastery[t.id] ?? 0) > 0)
      const mastered = topicsInCat.filter(t => (mastery[t.id] ?? 0) >= MASTERY_THRESHOLD)
      const completed = topicsInCat.filter(t => (mastery[t.id] ?? 0) >= PASS_THRESHOLD)
      // Grade only considers touched topics. Untouched topics don't lower
      // the grade — you can't fail what you haven't tried. If nothing's
      // been touched the card renders without a letter grade.
      const gradeScore = touched.length === 0 ? null
        : touched.reduce((acc, t) => acc + (mastery[t.id] ?? 0), 0) / touched.length
      // Progress bar still reflects coverage vs. total — "how much of this
      // category have you actually learned," which IS affected by untouched
      // topics. Otherwise a single mastered topic would peg the bar at 100%.
      const coverage = topicsInCat.length === 0 ? 0
        : topicsInCat.reduce((acc, t) => acc + (mastery[t.id] ?? 0), 0) / topicsInCat.length
      return { cat, total: topicsInCat.length, touched: touched.length, completed: completed.length, mastered: mastered.length, gradeScore, coverage }
    })
  }, [categories, topics, tracksById, mastery])

  // Emergent pathway — which category the user is most invested in.
  // Measured by "% of category completed," ignoring untouched ones so a
  // single finished Media topic doesn't declare you a "Media creator."
  const emergent = useMemo(() => {
    const real = categoryStats.filter(s => s.total > 0 && s.touched > 0)
    if (real.length === 0) return null
    const top = [...real].sort((a, b) => (b.completed / b.total) - (a.completed / a.total))[0]
    return top
  }, [categoryStats])

  const activeItems   = useMemo(() => items.filter(r => r.status === 'active'),   [items])
  const archivedItems = useMemo(() => items.filter(r => r.status === 'archived'), [items])

  // Overall mastery — simple average across every topic the user has any
  // mastery on. Zero-score topics still count in the denominator once the
  // user has at least one touched topic, so "I know 1/30 topics" reads 3%.
  const overall = useMemo(() => {
    if (topics.length === 0) return 0
    return topics.reduce((acc, t) => acc + (mastery[t.id] ?? 0), 0) / topics.length
  }, [topics, mastery])

  const masteredCount = useMemo(() => topics.filter(t => (mastery[t.id] ?? 0) >= MASTERY_THRESHOLD).length, [topics, mastery])

  async function move(topicId: string, delta: number) {
    const order = activeItems.map(r => r.topicId)
    const i = order.indexOf(topicId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    await repo.reorderPathwayItems(order)
    await refresh()
  }
  async function archive(topicId: string) {
    await repo.archivePathwayItem(topicId); await refresh()
  }
  async function unarchive(topicId: string) {
    await repo.unarchivePathwayItem(topicId); await refresh()
  }
  async function hardDelete(topicId: string) {
    await repo.deletePathwayItem(topicId); await refresh()
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Me"
        title="Your progress"
        subtitle={emergent
          ? `${pctText(emergent.completed, emergent.total)} through ${emergent.cat.title}${emergent.total > 0 ? ' — your strongest focus so far' : ''}.`
          : 'Start a lesson or quiz and the report card fills in.'
        }
      />

      {/* ---------- Report card ---------- */}
      <Section title="Report card" meta={`${masteredCount} mastered · ${Math.round(overall * 100)}% overall`}>
        <div className={styles.overallWrap}>
          <ProgressBar value={overall} />
        </div>

        <div className={styles.catGrid}>
          {categoryStats.map(s => (
            <CategoryCard key={s.cat.id} stats={s} />
          ))}
        </div>
      </Section>

      {/* ---------- Plan ---------- */}
      <Section title="My plan" meta={`${activeItems.length} active${archivedItems.length ? ` · ${archivedItems.length} archived` : ''}`}>
        {activeItems.length === 0 ? (
          <Empty>
            No plan yet. Add a topic from <Link to="/learn">Learn</Link>, or start any lesson — you'll be asked if you want to add its topic.
          </Empty>
        ) : (
          <List>
            <AnimatePresence initial={false}>
              {activeItems.map((row, idx) => {
                const topic = topicsById.get(row.topicId)
                if (!topic) return null
                const score = mastery[row.topicId] ?? 0
                const status = masteryStatus(score)
                const canHardDelete = score === 0
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
                          <span className={styles.posIdx}>{idx + 1}</span>
                          <Link to={`/learn/topic/${topic.id}`} style={{ color: 'inherit' }}>{topic.title}</Link>
                        </span>
                      }
                      sub={topic.summary}
                      right={
                        <span className={styles.rowCtrls}>
                          <Chip variant={
                            status === 'mastered' ? 'mastery' :
                            status === 'completed' ? 'accent' :
                            status === 'in_progress' ? 'muted' : undefined
                          }>
                            {MASTERY_LABEL[status]}
                          </Chip>
                          <button className={styles.iconBtn} aria-label="Move up"   disabled={idx === 0}                     onClick={(e) => { e.stopPropagation(); move(topic.id, -1) }}><ArrowUp size={16} strokeWidth={2} /></button>
                          <button className={styles.iconBtn} aria-label="Move down" disabled={idx === activeItems.length - 1} onClick={(e) => { e.stopPropagation(); move(topic.id, +1) }}><ArrowDown size={16} strokeWidth={2} /></button>
                          <button
                            className={styles.iconBtn}
                            aria-label={canHardDelete ? 'Remove from plan' : 'Archive'}
                            title={canHardDelete ? 'Remove — no progress to preserve' : 'Archive — keeps your record'}
                            onClick={(e) => {
                              e.stopPropagation()
                              canHardDelete ? hardDelete(topic.id) : archive(topic.id)
                            }}
                          ><X size={16} strokeWidth={2} /></button>
                        </span>
                      }
                      onClick={() => nav(`/learn/topic/${topic.id}`)}
                    />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </List>
        )}

        {archivedItems.length > 0 && (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Disclosure label={`Archived (${archivedItems.length})`} meta="Previously in your plan — your record is preserved">
              <List>
                {archivedItems.map(row => {
                  const topic = topicsById.get(row.topicId)
                  if (!topic) return null
                  return (
                    <Row
                      key={row.id}
                      title={topic.title}
                      sub={topic.summary}
                      right={
                        <button className={styles.restoreBtn} onClick={(e) => { e.stopPropagation(); unarchive(topic.id) }}>
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
      </Section>
    </div>
  )
}

function CategoryCard({ stats }: { stats: {
  cat: Category; total: number; touched: number; completed: number; mastered: number
  gradeScore: number | null; coverage: number
} }) {
  return (
    <div className={styles.catCard}>
      <div className={styles.catHead}>
        <span className={styles.catTitle}>{stats.cat.title}</span>
        <span className={styles.catGrade}>
          {stats.gradeScore === null ? '—' : letterGrade(stats.gradeScore)}
        </span>
      </div>
      <ProgressBar value={stats.coverage} />
      <div className={styles.catMeta}>
        {stats.completed} of {stats.total} completed
        {stats.mastered > 0 && <> · {stats.mastered} mastered</>}
        {stats.gradeScore === null && <> · no quizzes yet</>}
      </div>
    </div>
  )
}

function pctText(part: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((part / total) * 100)}%`
}
