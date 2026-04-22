import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { InventoryItem, MediaKind, Project, ProjectChecklistItem, ProjectStatus } from '../db/types'
import { Button, List, PageHeader, ProgressBar, Row } from '../ui'
import styles from './ProjectNew.module.css'

type Step = 0 | 1 | 2 | 3

const KIND_OPTIONS: { id: MediaKind; title: string; blurb: string }[] = [
  { id: 'youtube', title: 'YouTube video', blurb: 'Script → b-roll → thumbnail → title + upload. End-to-end creator flow.' },
  { id: 'image',   title: 'Image',         blurb: 'Stills — art, covers, reference, marketing.' },
  { id: 'video',   title: 'Short video',   blurb: 'Clips, shorts, ads, scene generation (no full YouTube workflow).' },
  { id: 'voice',   title: 'Voice',         blurb: 'Narration, characters, dubbing.' },
  { id: 'audio',   title: 'Music / SFX',   blurb: 'Music, loops, stingers, sound design.' },
  { id: 'multi',   title: 'Multi',         blurb: 'More than one of the above.' },
]

/** Canonical media-pathway tool suggestions. These are shown as chips
 *  and matched by id against the inventory if the item exists. */
const MEDIA_TOOL_CHIPS: { id: string; label: string }[] = [
  { id: 'i.midjourney',  label: 'Midjourney' },
  { id: 'i.sora',        label: 'Sora' },
  { id: 'i.elevenlabs',  label: 'ElevenLabs' },
  { id: 'i.runway',      label: 'Runway' },
  { id: 'i.suno',        label: 'Suno' },
  { id: 'i.flux',        label: 'Flux' },
  { id: 'i.dalle',       label: 'DALL·E' },
  { id: 'i.krea',        label: 'Krea' },
  // YouTube-leaning tools — likely not yet in inventory, but surface as
  // manual chips so the workflow isn't missing the obvious picks.
  { id: 'i.capcut',      label: 'CapCut' },
  { id: 'i.davinci',     label: 'DaVinci Resolve' },
  { id: 'i.descript',    label: 'Descript' },
]

function checklistFor(kind: MediaKind): ProjectChecklistItem[] {
  const preset: Record<MediaKind, string[]> = {
    image: [
      'Pin down the concept + reference look',
      'Draft the prompt + negative prompt',
      'First batch; pick the best seed',
      'Iterate on composition + lighting',
      'Upscale + final export',
    ],
    video: [
      'Storyboard the beats',
      'Generate first clip',
      'Refine motion + camera',
      'Stitch, add audio, color-grade',
      'Export final cut',
    ],
    youtube: [
      'Hook + thesis in one sentence',
      'Outline → script (draft with AI, rewrite in your voice)',
      'Record a-roll; gather b-roll + screen captures',
      'Edit to pace (cut silences, tighten intro)',
      'Thumbnail + title + description + chapters',
      'Upload + schedule; queue follow-up comments',
    ],
    voice: [
      'Pick voice + tone',
      'Script pass 1',
      'Read + regenerate fixes',
      'Master + export',
    ],
    audio: [
      'Reference tracks + mood',
      'Prompt the first pass',
      'Cut, arrange, layer',
      'Master + export',
    ],
    multi: [
      'Break into per-medium pieces',
      'Generate each piece',
      'Assemble the combined artifact',
      'Master + export',
    ],
  }
  return preset[kind].map((label, i) => ({ id: `c.${i + 1}`, label, done: false }))
}

export function ProjectNewMedia() {
  const nav = useNavigate()
  const [step, setStep]         = useState<Step>(0)
  const [title, setTitle]       = useState('')
  const [concept, setConcept]   = useState('')
  const [kind, setKind]         = useState<MediaKind>('image')
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [stackText, setStackText] = useState('')
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  useEffect(() => { repo.listInventory().then(setInventory) }, [])

  const inventoryById = useMemo(
    () => new Map(inventory.map(i => [i.id, i])),
    [inventory],
  )

  const canAdvance =
    step === 0 ? title.trim().length >= 1 :
    step === 1 ? concept.trim().length > 4 :
    true

  function toggle(id: string) {
    setPickedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  async function save(initialStatus: ProjectStatus) {
    const now = Date.now()
    const p: Project = {
      id: `p.${now.toString(36)}`,
      title: title.trim(),
      summary: concept.trim(),
      status: initialStatus,
      route: 'easiest',
      stack: pickedIds,
      stackNotes: stackText.trim() || undefined,
      gapTopicIds: [],
      checklist: checklistFor(kind),
      mediaKind: kind,
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

      <PageHeader eyebrow={`Media · step ${step + 1} of 4`} title="Start a project" />
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
              <label className={styles.label}>What are you making?</label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Album cover — desert synth"
                className={styles.input}
              />
              <div className={styles.hint}>A working title.</div>
            </>
          )}

          {step === 1 && (
            <>
              <label className={styles.label}>One-sentence concept</label>
              <textarea
                autoFocus
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder="Lonely synthwave cover with a lone figure at dusk, mid-90s film grain."
                className={styles.textarea}
                rows={3}
              />
              <div className={styles.hint}>Mood, subject, reference — whatever helps later.</div>
            </>
          )}

          {step === 2 && (
            <>
              <label className={styles.label}>What kind of output?</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-4)' }}>
                Sets the default checklist. You can switch later.
              </div>
              <List>
                {KIND_OPTIONS.map(k => (
                  <Row
                    key={k.id}
                    title={k.title}
                    sub={k.blurb}
                    selected={kind === k.id}
                    onClick={() => setKind(k.id)}
                  />
                ))}
              </List>
            </>
          )}

          {step === 3 && (
            <>
              <label className={styles.label}>Tools</label>
              <div className={styles.hint} style={{ marginBottom: 'var(--space-3)' }}>
                Tap the ones you expect to use. Write anything else below.
              </div>
              <div className={styles.chipRow}>
                {MEDIA_TOOL_CHIPS.map(c => {
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
                placeholder="Other tools, plugins, references…"
                className={styles.textarea}
                rows={3}
                style={{ marginTop: 'var(--space-3)' }}
              />
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
