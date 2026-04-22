import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2,
  Laptop, Monitor, Terminal, Smartphone, Tablet,
} from 'lucide-react'
import { repo } from '../db/repo'
import type { Topic, Track } from '../db/types'
import { Button, ProgressBar } from '../ui'
import { splitByPathway, PATHWAYS, type UserPathway } from '../lib/audience'
import {
  useUserStore,
  type Device,
  type WorkStyle,
} from '../state/userStore'
import s from './Onboarding.module.css'

type StepId =
  | 'welcome'
  | 'pathway'
  | 'workStyles'
  | 'devices'
  | 'yearsCoding'
  | 'knownTopics'
  | 'done'

const PATHWAY_BLURBS: Record<UserPathway, string> = {
  all:     "I'm not sure yet — show me everything.",
  student: 'Learning AI literacy from the ground up.',
  office:  'Using AI as a working partner — no coding.',
  media:   'Generating images, video, voice, audio with AI.',
  vibe:    'Shipping software with AI — I don\'t hand-write the code.',
  dev:     'Coding with AI — frameworks, SDKs, agents.',
}

const WORK_STYLE_OPTIONS: { id: WorkStyle; title: string; sub: string; pathways: UserPathway[] }[] = [
  { id: 'no_code',    title: 'No-code',    sub: 'Prompts, Projects, Artifacts — no terminal.',
    pathways: ['office', 'media'] },
  { id: 'vibe_code',  title: 'Vibe-code',  sub: 'I paste code snippets but don\'t really write them.',
    pathways: ['vibe'] },
  { id: 'engineer',   title: 'Engineer',   sub: 'General software engineer.',
    pathways: ['dev'] },
  { id: 'frontend',   title: 'Frontend',   sub: 'UIs, design systems, client-side state.',
    pathways: ['dev'] },
  { id: 'backend',    title: 'Backend',    sub: 'APIs, databases, infra.',
    pathways: ['dev'] },
  { id: 'fullstack',  title: 'Full-stack', sub: 'Both ends.',
    pathways: ['dev'] },
  { id: 'research',   title: 'Research',   sub: 'Papers, ML, analysis.',
    pathways: ['dev', 'student'] },
]

const DEVICE_OPTIONS: { id: Device; title: string; Icon: typeof Laptop }[] = [
  { id: 'mac',     title: 'Mac',     Icon: Laptop },
  { id: 'windows', title: 'Windows', Icon: Monitor },
  { id: 'linux',   title: 'Linux',   Icon: Terminal },
  { id: 'iphone',  title: 'iPhone',  Icon: Smartphone },
  { id: 'android', title: 'Android', Icon: Smartphone },
  { id: 'ipad',    title: 'iPad',    Icon: Tablet },
]

export function Onboarding() {
  const nav = useNavigate()
  const profile            = useUserStore()
  const setPathway         = useUserStore(st => st.setPathway)
  const setWorkStyles      = useUserStore(st => st.setWorkStyles)
  const setDevices         = useUserStore(st => st.setDevices)
  const setYearsCoding     = useUserStore(st => st.setYearsCoding)
  const toggleKnownTopic   = useUserStore(st => st.toggleKnownTopic)
  const markOnboardingSeen = useUserStore(st => st.markOnboardingSeen)

  // Compute the step list based on current pathway. `yearsCoding` only
  // appears for the dev pathway; everyone else skips it.
  const steps = useMemo<StepId[]>(() => {
    const base: StepId[] = ['welcome', 'pathway', 'workStyles', 'devices']
    if (profile.pathway === 'dev') base.push('yearsCoding')
    base.push('knownTopics', 'done')
    return base
  }, [profile.pathway])

  const [stepIdx, setStepIdx] = useState(0)
  // Clamp stepIdx if the step list shrinks (e.g., user backed off 'dev'
  // after advancing past yearsCoding). Intentional external-to-internal sync.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stepIdx >= steps.length) setStepIdx(steps.length - 1)
  }, [steps.length, stepIdx])
  const step = steps[stepIdx]

  const [tracks, setTracks] = useState<Track[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  useEffect(() => {
    Promise.all([repo.listTracks(), repo.listTopics()]).then(([tr, tp]) => {
      setTracks(tr); setTopics(tp)
    })
  }, [])

  function advance() {
    if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1)
    else finish()
  }
  function back() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1)
  }
  function finish() {
    markOnboardingSeen()
    // Stamp the default pathway template if the user has no plan yet.
    // Non-blocking — pathway seeding must not stall the nav.
    repo.seedPathwayFromTemplate(profile.pathway).catch(err =>
      console.warn('[onboarding] pathway seed failed', err)
    )
    nav('/')
  }
  function skipAll() {
    markOnboardingSeen()
    nav('/')
  }

  const progressPct = (stepIdx + 1) / steps.length

  return (
    <div className={s.shell}>
      <div className={s.progress}>
        <div className={s.progressLabel}>
          Step {stepIdx + 1} of {steps.length}
        </div>
        <ProgressBar value={progressPct} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          className={s.card}
        >
          {step === 'welcome' && (
            <>
              <div className={s.stepTitle}>Let's tailor this to you.</div>
              <div className={s.stepSub}>
                A few quick questions so the app can promote the right tracks,
                tools, and project templates. Everything here is optional —
                you can skip any step or skip the whole thing. Your answers
                stay on this device; nothing's shared with anyone.
              </div>
              <div className={s.footer}>
                <div className={s.footerLeft}>
                  <button className={s.skipLink} onClick={skipAll}>Skip all</button>
                </div>
                <div className={s.footerRight}>
                  <Button variant="primary" onClick={advance}>
                    Let's go <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'pathway' && (
            <>
              <div className={s.stepTitle}>What describes you best?</div>
              <div className={s.stepSub}>
                Drives the default filter on Learn and Library. You can flip
                it anytime from the topbar picker.
              </div>
              <div className={s.optionGrid}>
                {PATHWAYS.map(p => {
                  const on = profile.pathway === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`${s.option} ${on ? s.optionOn : ''}`}
                      onClick={() => setPathway(p.id)}
                    >
                      <div className={s.optionBody}>
                        <div className={s.optionTitle}>{p.label}</div>
                        <div className={s.optionSub}>{PATHWAY_BLURBS[p.id]}</div>
                      </div>
                      {on && <span className={s.check}><Check size={12} /></span>}
                    </button>
                  )
                })}
              </div>
              <StepFooter
                onBack={back}
                onSkip={advance}
                onContinue={advance}
                skipLabel="Skip"
              />
            </>
          )}

          {step === 'workStyles' && (
            <>
              <div className={s.stepTitle}>How do you work?</div>
              <div className={s.stepSub}>
                Pick any that apply. Helps us tune tool + project
                recommendations. Leave blank to keep everything visible.
              </div>
              <div className={`${s.optionGrid} ${s.cols2}`}>
                {WORK_STYLE_OPTIONS
                  .filter(ws =>
                    profile.pathway === 'all' || ws.pathways.includes(profile.pathway))
                  .map(ws => {
                    const picked = (profile.workStyles ?? []).includes(ws.id)
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        className={`${s.option} ${picked ? s.optionOn : ''}`}
                        onClick={() => {
                          const curr = new Set(profile.workStyles ?? [])
                          if (curr.has(ws.id)) curr.delete(ws.id)
                          else curr.add(ws.id)
                          setWorkStyles([...curr])
                        }}
                      >
                        <div className={s.optionBody}>
                          <div className={s.optionTitle}>{ws.title}</div>
                          <div className={s.optionSub}>{ws.sub}</div>
                        </div>
                        {picked && <span className={s.check}><Check size={12} /></span>}
                      </button>
                    )
                  })}
              </div>
              <StepFooter onBack={back} onSkip={advance} onContinue={advance} />
            </>
          )}

          {step === 'devices' && (
            <>
              <div className={s.stepTitle}>What do you use?</div>
              <div className={s.stepSub}>
                Pick every device you'd want the app's suggestions to fit.
                Helps the future bootstrapper match your OS.
              </div>
              <div className={`${s.optionGrid} ${s.cols2}`}>
                {DEVICE_OPTIONS.map(d => {
                  const picked = (profile.devices ?? []).includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={`${s.option} ${picked ? s.optionOn : ''}`}
                      onClick={() => {
                        const curr = new Set(profile.devices ?? [])
                        if (curr.has(d.id)) curr.delete(d.id)
                        else curr.add(d.id)
                        setDevices([...curr])
                      }}
                    >
                      <d.Icon size={16} strokeWidth={1.75} />
                      <div className={s.optionBody}>
                        <div className={s.optionTitle}>{d.title}</div>
                      </div>
                      {picked && <span className={s.check}><Check size={12} /></span>}
                    </button>
                  )
                })}
              </div>
              <StepFooter onBack={back} onSkip={advance} onContinue={advance} />
            </>
          )}

          {step === 'yearsCoding' && (
            <>
              <div className={s.stepTitle}>How long have you been coding?</div>
              <div className={s.stepSub}>
                Calibrates how much we explain and how quickly we move
                through intros. Leave blank to keep the default pacing.
              </div>
              <input
                type="number"
                min={0}
                max={60}
                step={1}
                placeholder="e.g. 3"
                value={profile.yearsCoding ?? ''}
                onChange={e => {
                  const n = e.target.value === '' ? undefined : Number(e.target.value)
                  setYearsCoding(Number.isFinite(n as number) ? (n as number) : undefined)
                }}
                className={s.input}
              />
              <StepFooter onBack={back} onSkip={advance} onContinue={advance} />
            </>
          )}

          {step === 'knownTopics' && (
            <>
              <div className={s.stepTitle}>Anything you already know?</div>
              <div className={s.stepSub}>
                Check any topic you're confident with — Learn will dim them
                so you can focus on what's new. You can change this anytime.
              </div>
              <KnownTopicsList
                tracks={tracks}
                topics={topics}
                pathway={profile.pathway}
                known={new Set(profile.knownTopicIds ?? [])}
                onToggle={toggleKnownTopic}
              />
              <StepFooter onBack={back} onSkip={advance} onContinue={advance} />
            </>
          )}

          {step === 'done' && (
            <div className={s.doneWrap}>
              <div className={s.doneIcon}><CheckCircle2 size={26} strokeWidth={1.75} /></div>
              <div className={s.stepTitle}>You're set.</div>
              <div className={s.stepSub}>
                Your profile lives on this device. Pathway, work styles,
                devices, and known topics will flow through Learn, Library,
                and Projects. Update anytime.
              </div>
              <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                <Button variant="ghost" onClick={back}>
                  <ArrowLeft size={15} /> Back
                </Button>
                <Button variant="primary" onClick={finish}>
                  Open dashboard <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function StepFooter({
  onBack, onSkip, onContinue, skipLabel = 'Skip this',
}: {
  onBack: () => void
  onSkip: () => void
  onContinue: () => void
  skipLabel?: string
}) {
  return (
    <div className={s.footer}>
      <div className={s.footerLeft}>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </Button>
      </div>
      <div className={s.footerRight}>
        <button className={s.skipLink} onClick={onSkip}>{skipLabel}</button>
        <Button variant="primary" onClick={onContinue}>
          Continue <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  )
}

function KnownTopicsList({
  tracks, topics, pathway, known, onToggle,
}: {
  tracks: Track[]
  topics: Topic[]
  pathway: UserPathway
  known: Set<string>
  onToggle: (id: string) => void
}) {
  // Show every track so users can claim topics outside their pathway.
  // Ordered primary-first for easier scanning; no "Everything else" heading
  // needed — the list is short and the badge on each track carries the signal.
  const { primary, rest } = splitByPathway(tracks, t => t.audience, pathway)
  const visibleTracks = [...primary, ...rest]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {visibleTracks.map(track => {
        const list = topics.filter(t => t.trackId === track.id)
          .sort((a, b) => a.order - b.order)
        if (list.length === 0) return null
        return (
          <div key={track.id}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--ink-3)',
              marginBottom: 6,
            }}>{track.title}</div>
            <div className={s.optionGrid}>
              {list.map(topic => {
                const picked = known.has(topic.id)
                return (
                  <button
                    key={topic.id}
                    type="button"
                    className={`${s.option} ${picked ? s.optionOn : ''}`}
                    onClick={() => onToggle(topic.id)}
                  >
                    <div className={s.optionBody}>
                      <div className={s.optionTitle}>{topic.title}</div>
                      <div className={s.optionSub}>{topic.summary}</div>
                    </div>
                    {picked && <span className={s.check}><Check size={12} /></span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
