import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { repo } from '../db/repo'
import type { InventoryItem, Project, ProjectRoute, Topic } from '../db/types'
import { Button, Chip, List, PageHeader, ProgressBar, Row } from '../ui'
import { ROUTE_BLURBS, ROUTE_LABELS, routeStack } from '../lib/projectRoutes'
import styles from './ProjectNew.module.css'

type Step = 0 | 1 | 2 | 3 | 4

export function ProjectNew() {
  const nav = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [title, setTitle]       = useState('')
  const [summary, setSummary]   = useState('')
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [gapIds, setGapIds]     = useState<string[]>([])
  const [route, setRoute]       = useState<ProjectRoute>('easiest')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [topics, setTopics]     = useState<Topic[]>([])

  useEffect(() => {
    repo.listInventory().then(setInventory)
    repo.listTopics().then(setTopics)
  }, [])

  const picked = useMemo(
    () => inventory.filter(i => pickedIds.includes(i.id)),
    [inventory, pickedIds],
  )

  const canAdvance =
    step === 0 ? title.trim().length > 2 :
    step === 1 ? summary.trim().length > 8 :
    step === 2 ? picked.length > 0 :
    true

  async function save() {
    const now = Date.now()
    const p: Project = {
      id: `p.${now.toString(36)}`,
      title: title.trim(),
      summary: summary.trim(),
      status: 'draft',
      route,
      stack: pickedIds,
      gapTopicIds: gapIds,
      checklist: [
        { id: 'c.scope',  label: 'Finalize scope + success criteria', done: false },
        { id: 'c.stack',  label: 'Confirm stack + install deps',       done: false },
        { id: 'c.first',  label: 'First commit / scaffold',            done: false },
        { id: 'c.ship',   label: 'Ship a v0 anyone can click',         done: false },
      ],
      createdAt: now,
      updatedAt: now,
    }
    await repo.putProject(p)
    nav(`/projects/${p.id}`)
  }

  return (
    <div className="page">
      <button
        onClick={() => (step === 0 ? nav('/projects') : setStep((step - 1) as Step))}
        className={styles.back}
      >
        <ArrowLeft size={14} /> {step === 0 ? 'Back to projects' : 'Back'}
      </button>

      <PageHeader eyebrow={`Step ${step + 1} of 5`} title="Start a project" />
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <ProgressBar value={(step + 1) / 5} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          className={styles.card}
        >
          {step === 0 && (
            <>
              <label className={styles.label}>What's the project called?</label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Personal AI flashcard app"
                className={styles.input}
              />
              <div className={styles.hint}>A working title is fine. You can rename later.</div>
            </>
          )}

          {step === 1 && (
            <>
              <label className={styles.label}>In one or two sentences, what is it?</label>
              <textarea
                autoFocus
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="A flashcard app that drills the topics I'm currently learning."
                className={styles.textarea}
                rows={4}
              />
              <div className={styles.hint}>What it does, who it's for, why it matters.</div>
            </>
          )}

          {step === 2 && (
            <>
              <label className={styles.label}>What do you think you'll need?</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-4)' }}>
                Pick the tools and services you expect to use. We'll compare routes next.
              </div>
              <List>
                {inventory.map(i => {
                  const on = pickedIds.includes(i.id)
                  return (
                    <Row
                      key={i.id}
                      title={i.name}
                      sub={`${i.category} · ${i.cost}${i.owned ? ' · owned' : ''}`}
                      selected={on}
                      right={on ? <Chip variant="accent">Picked</Chip> : undefined}
                      onClick={() => setPickedIds(ids =>
                        ids.includes(i.id) ? ids.filter(x => x !== i.id) : [...ids, i.id]
                      )}
                    />
                  )
                })}
              </List>
            </>
          )}

          {step === 3 && (
            <>
              <label className={styles.label}>Which route feels right?</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-4)' }}>
                Same destination — three different paths.
              </div>
              <List>
                {(['easiest', 'cheapest', 'best'] as ProjectRoute[]).map(r => {
                  const stack = routeStack(r, picked, inventory)
                  const on = route === r
                  return (
                    <Row
                      key={r}
                      title={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {ROUTE_LABELS[r]}
                          {on && <Sparkles size={13} />}
                        </span>
                      }
                      sub={
                        <>
                          {ROUTE_BLURBS[r]}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                            {stack.slice(0, 5).map(s => <Chip key={s.id}>{s.name}</Chip>)}
                            {stack.length > 5 && <Chip>+{stack.length - 5} more</Chip>}
                          </div>
                        </>
                      }
                      selected={on}
                      onClick={() => setRoute(r)}
                    />
                  )
                })}
              </List>
            </>
          )}

          {step === 4 && (
            <>
              <label className={styles.label}>What do you think you'll need to learn?</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-4)' }}>
                Pick topics for your learning path. You can change these anytime.
              </div>
              <List>
                {topics.map(t => {
                  const on = gapIds.includes(t.id)
                  return (
                    <Row
                      key={t.id}
                      title={t.title}
                      sub={t.summary}
                      selected={on}
                      right={on ? <Chip variant="accent">On path</Chip> : undefined}
                      onClick={() => setGapIds(ids =>
                        ids.includes(t.id) ? ids.filter(x => x !== t.id) : [...ids, t.id]
                      )}
                    />
                  )
                })}
              </List>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className={styles.footer}>
        {step < 4 ? (
          <Button variant="primary" disabled={!canAdvance} onClick={() => setStep((step + 1) as Step)}>
            Continue <ArrowRight size={15} />
          </Button>
        ) : (
          <Button variant="primary" onClick={save}>
            Create project <ArrowRight size={15} />
          </Button>
        )}
      </div>
    </div>
  )
}
