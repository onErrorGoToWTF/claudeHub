import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { InventoryItem, Project, ProjectStatus, Topic } from '../db/types'
import { Button, Chip, List, PageHeader, ProgressBar, Row } from '../ui'
import { matchesPathway } from '../lib/audience'
import styles from './ProjectNew.module.css'

type Step = 0 | 1 | 2 | 3

/** Canonical vibe-coder tool slugs to surface as chips, matched by id
 *  against the inventory. Unknown ids show as grey "manual" chips the
 *  user can still toggle. */
const VIBE_TOOL_CHIPS: { id: string; label: string }[] = [
  { id: 'i.cursor',       label: 'Cursor' },
  { id: 'i.claude-code',  label: 'Claude Code' },
  { id: 'i.v0',           label: 'v0' },
  { id: 'i.lovable',      label: 'Lovable' },
  { id: 'i.replit',       label: 'Replit' },
  { id: 'i.supabase',     label: 'Supabase' },
]

export function ProjectNewVibe() {
  const nav = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [title, setTitle]         = useState('')
  const [vision, setVision]       = useState('')
  const [stackText, setStackText] = useState('')
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [gapIds, setGapIds]       = useState<string[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [topics, setTopics]       = useState<Topic[]>([])

  useEffect(() => {
    repo.listInventory().then(setInventory)
    repo.listTopics().then(setTopics)
  }, [])

  const inventoryById = useMemo(
    () => new Map(inventory.map(i => [i.id, i])),
    [inventory],
  )

  // Topics surface vibe-pathway ones first; all are still pickable.
  const vibeTopics = useMemo(() => {
    const primary = topics.filter(t => matchesPathway('vibe', t.audience))
    const rest    = topics.filter(t => !primary.includes(t))
    return [...primary, ...rest]
  }, [topics])

  const canAdvance =
    step === 0 ? title.trim().length >= 1 :
    step === 1 ? vision.trim().length > 4 :
    true

  function toggle(id: string) {
    setPickedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  async function save(initialStatus: ProjectStatus) {
    const now = Date.now()
    const p: Project = {
      id: `p.${now.toString(36)}`,
      title: title.trim(),
      summary: vision.trim(),
      status: initialStatus,
      route: 'easiest',
      stack: pickedIds,
      stackNotes: stackText.trim() || undefined,
      gapTopicIds: gapIds,
      checklist: [
        { id: 'c.sketch', label: 'Sketch the idea in 3 bullets',      done: false },
        { id: 'c.stack',  label: 'Confirm stack picks + sign up',     done: false },
        { id: 'c.first',  label: 'First running prototype',           done: false },
        { id: 'c.iter',   label: 'One iteration loop with AI',        done: false },
        { id: 'c.ship',   label: 'Share a clickable v0',              done: false },
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

      <PageHeader eyebrow={`Vibe · step ${step + 1} of 4`} title="Start a project" />
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <ProgressBar value={(step + 1) / 4} />
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
              <label className={styles.label}>What are you building?</label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Reading-log app for my kids"
                className={styles.input}
              />
              <div className={styles.hint}>A working title — you can rename it later.</div>
            </>
          )}

          {step === 1 && (
            <>
              <label className={styles.label}>One-sentence vision</label>
              <textarea
                autoFocus
                value={vision}
                onChange={e => setVision(e.target.value)}
                placeholder="They log books they've read; it shows streaks and a simple chart."
                className={styles.textarea}
                rows={3}
              />
              <div className={styles.hint}>Tell the story in a sentence or two — don't sweat architecture yet.</div>
            </>
          )}

          {step === 2 && (
            <>
              <label className={styles.label}>Stack sketch</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-3)' }}>
                What tools might you use? Tap a suggestion or type your own.
              </div>
              <div className={styles.chipRow}>
                {VIBE_TOOL_CHIPS.map(c => {
                  const on = pickedIds.includes(c.id)
                  const known = inventoryById.has(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`${styles.pickChip} ${on ? styles.pickChipOn : ''}`}
                      onClick={() => toggle(c.id)}
                    >
                      {c.label}{!known && <span className={styles.chipMuted}> · manual</span>}
                    </button>
                  )
                })}
              </div>
              <textarea
                value={stackText}
                onChange={e => setStackText(e.target.value)}
                placeholder="Anything else? Write it however you'd describe it to a friend."
                className={styles.textarea}
                rows={3}
                style={{ marginTop: 'var(--space-3)' }}
              />
            </>
          )}

          {step === 3 && (
            <>
              <label className={styles.label}>What might you need to learn?</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-4)' }}>
                Optional — anything you pick gets added to your pathway.
              </div>
              <List>
                {vibeTopics.slice(0, 12).map(t => {
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
        {step < 3 ? (
          <Button variant="primary" disabled={!canAdvance} onClick={() => setStep((step + 1) as Step)}>
            Continue <ArrowRight size={15} />
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Button onClick={() => save('planned')}>Save as plan</Button>
            <Button variant="primary" onClick={() => save('in_progress')}>
              Start now <ArrowRight size={15} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
