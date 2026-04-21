import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { InventoryItem, Project, ProjectChecklistItem } from '../db/types'
import { Button, Chip, List, PageHeader, ProgressBar, Row } from '../ui'
import { matchesPathway } from '../lib/audience'
import styles from './ProjectNew.module.css'

type WorkflowType = 'document' | 'meeting' | 'announcement' | 'analysis' | 'cadence'
type Step = 0 | 1 | 2 | 3

const WORKFLOWS: { id: WorkflowType; title: string; blurb: string }[] = [
  { id: 'document',     title: 'Document or deck',
    blurb: 'A strategy doc, board update, one-pager, or slide deck.' },
  { id: 'meeting',      title: 'Meeting prep',
    blurb: 'Agendas, talking points, pre-reads, and follow-ups.' },
  { id: 'announcement', title: 'Comms or announcement',
    blurb: 'A memo, email, all-hands message, or external post.' },
  { id: 'analysis',     title: 'Analysis or research',
    blurb: 'Summarize sources, compare options, pull themes from a pile of input.' },
  { id: 'cadence',      title: 'Working rhythm or ritual',
    blurb: 'A repeating workflow — weekly planning, daily digest, monthly review.' },
]

function checklistFor(w: WorkflowType): ProjectChecklistItem[] {
  const preset: Record<WorkflowType, string[]> = {
    document: [
      'Clarify audience + desired outcome',
      'Gather source material (existing docs, data, decisions)',
      'Draft outline with Claude as thinking partner',
      'Fill in the draft',
      'Polish: tone, length, calls to action',
      'Share with stakeholders',
    ],
    meeting: [
      'Define the meeting goal in one sentence',
      'List who is attending + what they need',
      'Draft the agenda',
      'Prep talking points + anticipated questions',
      'Run the meeting; capture decisions',
      'Send the follow-up note',
    ],
    announcement: [
      'Clarify the key message in one sentence',
      'Identify the audience + channel',
      'Draft with Claude',
      'Review for tone + accuracy',
      'Schedule / send',
    ],
    analysis: [
      'Frame the question',
      'Collect source inputs',
      'Run an initial pass with Claude — summarize each source',
      'Identify themes + tensions',
      'Write the synthesis',
      'Share findings',
    ],
    cadence: [
      'Define the cadence (daily / weekly / monthly)',
      'List inputs you bring into each cycle',
      'Define the output / artifact',
      'Dry-run once with Claude',
      'Refine the prompt + template',
      'Schedule the recurring trigger',
    ],
  }
  return preset[w].map((label, i) => ({ id: `c.${i + 1}`, label, done: false }))
}

export function ProjectNewOffice() {
  const nav = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [title, setTitle]       = useState('')
  const [summary, setSummary]   = useState('')
  const [workflow, setWorkflow] = useState<WorkflowType>('document')
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  useEffect(() => { repo.listInventory().then(setInventory) }, [])

  // Office pathway picker shows tools tagged for office (Claude.ai, chat,
  // workflow, image/video/voice, etc.) — no IDEs or dev frameworks.
  const officeInventory = useMemo(
    () => inventory.filter(i => matchesPathway('office', i.audience)),
    [inventory],
  )

  const canAdvance =
    step === 0 ? title.trim().length > 2 :
    step === 1 ? summary.trim().length > 8 :
    true

  async function save() {
    const now = Date.now()
    const p: Project = {
      id: `p.${now.toString(36)}`,
      title: title.trim(),
      summary: summary.trim(),
      status: 'backlog',
      route: 'easiest', // sentinel — route is a build-pathway concept
      stack: pickedIds,
      gapTopicIds: [],
      checklist: checklistFor(workflow),
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

      <PageHeader eyebrow={`Office · step ${step + 1} of 4`} title="Start a project" />
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
              <label className={styles.label}>What are you working on?</label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Q2 board update"
                className={styles.input}
              />
              <div className={styles.hint}>A working title. You can rename later.</div>
            </>
          )}

          {step === 1 && (
            <>
              <label className={styles.label}>In one or two sentences, what is it?</label>
              <textarea
                autoFocus
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="A strategy update for the April board meeting, covering revenue, hiring, and the Q3 plan."
                className={styles.textarea}
                rows={4}
              />
              <div className={styles.hint}>Who's it for, what it covers, when it's due.</div>
            </>
          )}

          {step === 2 && (
            <>
              <label className={styles.label}>What kind of work is this?</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-4)' }}>
                Pick the shape that fits best — we'll seed a checklist to match.
              </div>
              <List>
                {WORKFLOWS.map(w => {
                  const on = workflow === w.id
                  return (
                    <Row
                      key={w.id}
                      title={w.title}
                      sub={w.blurb}
                      selected={on}
                      right={on ? <Chip variant="accent">Picked</Chip> : undefined}
                      onClick={() => setWorkflow(w.id)}
                    />
                  )
                })}
              </List>
            </>
          )}

          {step === 3 && (
            <>
              <label className={styles.label}>Which tools will you use?</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-4)' }}>
                Optional — pick the AI tools and services you plan to lean on.
              </div>
              {officeInventory.length === 0 ? (
                <div className={styles.hint}>No office-pathway tools seeded yet.</div>
              ) : (
                <List>
                  {officeInventory.map(i => {
                    const on = pickedIds.includes(i.id)
                    return (
                      <Row
                        key={i.id}
                        title={i.title}
                        sub={i.summary ?? `${i.toolCategory} · ${i.cost}`}
                        selected={on}
                        right={on ? <Chip variant="accent">Picked</Chip> : undefined}
                        onClick={() => setPickedIds(ids =>
                          ids.includes(i.id) ? ids.filter(x => x !== i.id) : [...ids, i.id]
                        )}
                      />
                    )
                  })}
                </List>
              )}
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
          <Button variant="primary" onClick={save}>
            Create project <ArrowRight size={15} />
          </Button>
        )}
      </div>
    </div>
  )
}
