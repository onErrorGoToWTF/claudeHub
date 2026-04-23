import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Check, X } from 'lucide-react'
import { overallProgress, repo } from '../db/repo'
import type { Category, Track, Topic, Mastery, UserPathwayItem } from '../db/types'
import { LiftModal } from '../ui/LiftModal'
import { PageHeader, ProgressBar } from '../ui'
import { AudienceBadge } from '../ui/AudienceBadge'
import { splitByPathway, type UserPathway } from '../lib/audience'
import { PATHWAY_TEMPLATES } from '../lib/pathwayTemplates'
import { useUserStore } from '../state/userStore'
import s from './Learn.module.css'

export function Learn() {
  const [categories, setCategories]       = useState<Category[]>([])
  const [tracks, setTracks]               = useState<Track[]>([])
  const [topicsByTrack, setTopicsByTrack] = useState<Record<string, Topic[]>>({})
  const [mastery, setMastery]             = useState<Record<string, number>>({})
  const [score, setScore]                 = useState(0)
  const [topicsTotal, setTopicsTotal]     = useState(0)
  const [completedCount, setCompleted]    = useState(0)
  const [nextTopic, setNextTopic]         = useState<Topic | null>(null)
  const [pathwayItems, setPathwayItems]   = useState<UserPathwayItem[]>([])
  const pathway = useUserStore(st => st.pathway)

  async function refresh() {
    const [cats, tr, top, ma, prog, upi] = await Promise.all([
      repo.listCategories(),
      repo.listTracks(),
      repo.listTopics(),
      repo.listMastery(),
      overallProgress(),
      repo.listPathwayItems(),
    ])
    setCategories(cats)
    setTracks(tr)
    const grouped: Record<string, Topic[]> = {}
    for (const t of top) (grouped[t.trackId] ||= []).push(t)
    setTopicsByTrack(grouped)
    setMastery(Object.fromEntries(ma.map((m: Mastery) => [m.topicId, m.score])))
    setScore(prog.score); setCompleted(prog.completed); setTopicsTotal(prog.topics)
    const byId = new Map(ma.map(m => [m.topicId, m.score]))
    const unstarted = top.find(t => !byId.has(t.id)) ?? top[0]
    setNextTopic(unstarted ?? null)
    setPathwayItems(upi)
  }
  useEffect(() => { refresh() }, [])

  // Group tracks under their category. Tracks missing categoryId land in
  // an "Other" bucket at the bottom — defensive, shouldn't happen once
  // seed data is caught up.
  const tracksByCategory = useMemo(() => {
    const out: Record<string, Track[]> = {}
    for (const t of tracks) {
      const key = t.categoryId ?? '__other__'
      ;(out[key] ||= []).push(t)
    }
    return out
  }, [tracks])

  const activePlanIds = useMemo(
    () => new Set(pathwayItems.filter(r => r.status === 'active').map(r => r.topicId)),
    [pathwayItems],
  )
  const activeCount = activePlanIds.size

  const topicsById = useMemo<Record<string, Topic>>(
    () => Object.fromEntries(Object.values(topicsByTrack).flat().map(t => [t.id, t])),
    [topicsByTrack],
  )

  return (
    <div className="page">
      <PageHeader
        eyebrow="Learn"
        title="Your AI curriculum"
        subtitle="Everything's grouped by category. Start anywhere — your plan grows as you engage."
      />

      {/* ---------- Overall rollup + resume ---------- */}
      <div className={s.summary}>
        <div className={s.rollup}>
          <div className={s.rollupHead}>
            <span className={s.rollupLabel}>Overall mastery</span>
            <span className={s.rollupMeta}>{completedCount} / {topicsTotal} completed</span>
          </div>
          <div className={s.rollupValue}>{Math.round(score * 100)}%</div>
          <ProgressBar value={score} />
        </div>
        {nextTopic && (
          <Link to={`/learn/topic/${nextTopic.id}`} className={s.resume}>
            <span className={s.resumeLeft}>
              <span>Continue</span>
              <span className={s.resumeSub}>Next: {nextTopic.title}</span>
            </span>
            <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {/* ---------- Slim link to /me for plan detail ---------- */}
      <div className={s.planLink}>
        <Link to="/me" className={s.planLinkRow}>
          <span>My plan {activeCount > 0 && <span className={s.planCount}>({activeCount})</span>}</span>
          <ArrowRight size={13} strokeWidth={1.75} />
        </Link>
      </div>

      {/* ---------- Categories (dive-in cards) ---------- */}
      <CategoriesGrid
        categories={categories}
        tracksByCategory={tracksByCategory}
        topicsByTrack={topicsByTrack}
        mastery={mastery}
        pathway={pathway}
      />

      {/* ---------- Starter packs — opt-in template subscribes ---------- */}
      <StarterPacksRow
        activePlanIds={activePlanIds}
        topicsById={topicsById}
        onAfterAdd={refresh}
      />

      {/* ---------- Custom pathway link (deep end) ---------- */}
      <div className={s.customLink}>
        <Link to="/learn/custom">
          Build a custom pathway <ArrowRight size={13} strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  )
}

function CategoriesGrid({
  categories, tracksByCategory, topicsByTrack, mastery, pathway,
}: {
  categories: Category[]
  tracksByCategory: Record<string, Track[]>
  topicsByTrack: Record<string, Topic[]>
  mastery: Record<string, number>
  pathway: UserPathway
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const openCat = (id: string, e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.focus()
    setAnchorRect(e.currentTarget.getBoundingClientRect())
    setExpandedId(id)
  }
  const closeCat = () => setExpandedId(null)

  const expanded = expandedId ? categories.find(c => c.id === expandedId) : null

  return (
    <div className={s.catGridWrap}>
      <div className={s.catHeadRow}>
        <span className={s.catHeadLabel}>Categories</span>
        <span className={s.catHeadMeta}>Tap a category to dive in.</span>
      </div>

      <div className={s.catCardGrid}>
        {categories.map(cat => {
          const tracks = tracksByCategory[cat.id] ?? []
          if (tracks.length === 0) return null
          const trackCount = tracks.length
          const topicCount = tracks.reduce(
            (acc, tr) => acc + (topicsByTrack[tr.id]?.length ?? 0), 0,
          )
          return (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              className={s.catCard}
              onClick={(e) => openCat(cat.id, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openCat(cat.id, e as unknown as React.MouseEvent<HTMLElement>)
                }
              }}
            >
              <div className={s.catCardTitle}>{cat.title}</div>
              <div className={s.catCardBlurb}>{cat.summary}</div>
              <div className={s.catCardFoot}>
                {trackCount} {trackCount === 1 ? 'track' : 'tracks'} · {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
              </div>
            </div>
          )
        })}
      </div>

      <LiftModal
        open={!!expanded}
        anchorRect={anchorRect}
        onClose={closeCat}
        ariaLabel={expanded ? `${expanded.title} category details` : undefined}
        maxWidth={880}
      >
        {expanded && (
          <CategoryModalBody
            category={expanded}
            tracks={tracksByCategory[expanded.id] ?? []}
            topicsByTrack={topicsByTrack}
            mastery={mastery}
            pathway={pathway}
            onClose={closeCat}
          />
        )}
      </LiftModal>
    </div>
  )
}

// Shared layout for dive-in modal bodies (category + starter pack). Head
// with title/blurb + close X, arbitrary body slot, foot with "N of M in
// plan" caption + Add-all action. Promote to src/ui/ when a third modal
// starts using it.
function ModalCardShell({
  title, blurb, closeAriaLabel, onClose,
  inPlan, total, addAllDisabled, onAddAll,
  children,
}: {
  title: string
  blurb: string
  closeAriaLabel: string
  onClose: () => void
  inPlan: number
  total: number
  addAllDisabled: boolean
  onAddAll: () => void
  children: React.ReactNode
}) {
  return (
    <div className={s.starterExpanded}>
      <div className={s.starterExpandedHead}>
        <div>
          <div className={s.starterCardTitle}>{title}</div>
          <div className={s.starterCardBlurb}>{blurb}</div>
        </div>
        <button
          type="button"
          className={s.starterCloseBtn}
          onClick={onClose}
          aria-label={closeAriaLabel}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {children}

      <div className={s.starterExpandedFoot}>
        <span className={s.starterCardFoot}>
          {inPlan} of {total} in plan
        </span>
        <button
          type="button"
          className={s.starterAddAllBtn}
          onClick={onAddAll}
          disabled={addAllDisabled}
        >
          {addAllDisabled ? 'All added' : `Add all ${total}`}
        </button>
      </div>
    </div>
  )
}

function CategoryModalBody({
  category, tracks, topicsByTrack, mastery, pathway, onClose,
}: {
  category: Category
  tracks: Track[]
  topicsByTrack: Record<string, Topic[]>
  mastery: Record<string, number>
  pathway: UserPathway
  onClose: () => void
}) {
  // Pathway-sort then flatten. Track grouping stays visible as a small
  // label above each group, but the row pattern matches the starter-pack
  // modal for visual consistency across every dive-in.
  const { primary, rest } = useMemo(
    () => splitByPathway(tracks, t => t.audience, pathway),
    [tracks, pathway],
  )
  const orderedTracks = [...primary, ...rest]
  const allTopicIds = orderedTracks.flatMap(tr => (topicsByTrack[tr.id] ?? []).map(t => t.id))
  const [pathwayItems, setPathwayItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    repo.listPathwayItems().then(rows => {
      setPathwayItems(new Set(rows.filter(r => r.status === 'active').map(r => r.topicId)))
    })
  }, [])

  async function toggleOne(topicId: string) {
    if (pathwayItems.has(topicId)) {
      await repo.removeFromPlan(topicId)
      setPathwayItems(prev => {
        const next = new Set(prev)
        next.delete(topicId)
        return next
      })
    } else {
      await repo.addPathwayItem(topicId, 'manual')
      setPathwayItems(prev => new Set(prev).add(topicId))
    }
  }
  async function addAll() {
    const toAdd = allTopicIds.filter(id => !pathwayItems.has(id))
    if (toAdd.length === 0) return
    for (const id of toAdd) {
      await repo.addPathwayItem(id, 'manual')
    }
    setPathwayItems(prev => {
      const next = new Set(prev)
      toAdd.forEach(id => next.add(id))
      return next
    })
  }

  const inPlan = allTopicIds.filter(id => pathwayItems.has(id)).length
  const allIn = allTopicIds.length > 0 && inPlan === allTopicIds.length

  return (
    <ModalCardShell
      title={category.title}
      blurb={category.summary}
      closeAriaLabel="Close category"
      onClose={onClose}
      inPlan={inPlan}
      total={allTopicIds.length}
      addAllDisabled={allIn}
      onAddAll={addAll}
    >
      <div className={s.modalTrackStack}>
        {orderedTracks.map(track => {
          const topics = topicsByTrack[track.id] ?? []
          if (topics.length === 0) return null
          return (
            <div key={track.id}>
              <div className={s.modalTrackLabel}>
                <span>{track.title}</span>
                <AudienceBadge audience={track.audience} pathway={pathway} />
              </div>
              <ul className={s.starterTopicList}>
                {topics.map(t => {
                  const already = pathwayItems.has(t.id)
                  const score = mastery[t.id] ?? 0
                  return (
                    <li key={t.id} className={s.starterTopicRow}>
                      <Link to={`/learn/topic/${t.id}`} className={s.starterTopicBody}>
                        <span className={s.starterTopicTitle}>{t.title}</span>
                        <span className={s.starterTopicSummary}>{t.summary}</span>
                        {score > 0 && (
                          <span className={s.modalTopicProgress}>{Math.round(score * 100)}% mastered</span>
                        )}
                      </Link>
                      <button
                        type="button"
                        className={`${s.starterTopicBtn} ${already ? s.starterTopicBtnOn : ''}`}
                        onClick={() => toggleOne(t.id)}
                        aria-label={already ? `Remove ${t.title} from plan` : `Add ${t.title} to plan`}
                        title={already ? 'In plan — tap to remove' : 'Add to plan'}
                      >
                        {already
                          ? <Check size={14} strokeWidth={2} />
                          : <Plus size={14} strokeWidth={2} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </ModalCardShell>
  )
}

// ------------------ Starter packs ------------------

const STARTER_PACKS: { id: keyof typeof PATHWAY_TEMPLATES; label: string; blurb: string }[] = [
  { id: 'student', label: 'Student',   blurb: 'Literacy first, then prompt basics, then how to pick a model.' },
  { id: 'office',  label: 'Office',    blurb: 'Coworker-mode playbook for docs, meetings, and comms.' },
  { id: 'media',   label: 'Media',     blurb: 'Rights + prompting for image, video, voice.' },
  { id: 'vibe',    label: 'Vibe',      blurb: 'Build software by describing it. Tools, the loop, guardrails.' },
  { id: 'dev',     label: 'Developer', blurb: 'Tokens → tool use → agents → caching. Production path.' },
]

function StarterPacksRow({
  activePlanIds, topicsById, onAfterAdd,
}: {
  activePlanIds: Set<string>
  topicsById: Record<string, Topic>
  onAfterAdd: () => void
}) {
  const [expandedId, setExpandedId] = useState<keyof typeof PATHWAY_TEMPLATES | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  function open(id: keyof typeof PATHWAY_TEMPLATES, e: React.MouseEvent<HTMLElement>) {
    // Explicit focus so the modal's focus-restore-on-close returns here, not
    // to document.body (which defaults to the first tabbable — the first
    // pack card, regardless of which one we tapped).
    e.currentTarget.focus()
    setAnchorRect(e.currentTarget.getBoundingClientRect())
    setExpandedId(id)
  }
  function close() {
    setExpandedId(null)
  }

  async function toggleOne(topicId: string) {
    if (activePlanIds.has(topicId)) {
      await repo.removeFromPlan(topicId)
    } else {
      await repo.addPathwayItem(topicId, 'seed')
    }
    onAfterAdd()
  }

  async function addAll(packId: keyof typeof PATHWAY_TEMPLATES) {
    const topicIds = PATHWAY_TEMPLATES[packId]
    const toAdd = topicIds.filter(id => !activePlanIds.has(id))
    if (toAdd.length === 0) return
    for (const id of toAdd) {
      await repo.addPathwayItem(id, 'seed')
    }
    onAfterAdd()
  }

  const expandedPack = expandedId ? STARTER_PACKS.find(p => p.id === expandedId)! : null

  return (
    <div className={s.starterWrap}>
      <div className={s.starterHead}>
        <span className={s.starterLabel}>Starter packs</span>
        <span className={s.starterMeta}>Tap a pack to dive in.</span>
      </div>

      <div className={s.starterGrid}>
        {STARTER_PACKS.map(p => {
          const topicIds = PATHWAY_TEMPLATES[p.id]
          const already = topicIds.filter(id => activePlanIds.has(id)).length
          const allIn   = already === topicIds.length
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={`${s.starterCard} ${allIn ? s.starterCardOn : ''}`}
              onClick={(e) => open(p.id, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  open(p.id, e as unknown as React.MouseEvent<HTMLElement>)
                }
              }}
            >
              <div className={s.starterCardHead}>
                <span className={s.starterCardTitle}>{p.label}</span>
                <button
                  type="button"
                  className={`${s.starterAddBtn} ${allIn ? s.starterAddBtnOn : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (allIn) return
                    addAll(p.id)
                  }}
                  disabled={allIn}
                  aria-label={allIn ? `${p.label} pack: all added` : `Add all ${topicIds.length} ${p.label} topics`}
                  title={allIn ? 'All added' : 'Add all to plan'}
                >
                  {allIn
                    ? <Check size={14} strokeWidth={2} />
                    : <Plus size={14} strokeWidth={2} />}
                </button>
              </div>
              <div className={s.starterCardBlurb}>{p.blurb}</div>
              <div className={s.starterCardFoot}>
                {already > 0 && !allIn && <>{already} of {topicIds.length} in plan · </>}
                {allIn ? 'All added' : `${topicIds.length} topics`}
              </div>
            </div>
          )
        })}
      </div>

      <LiftModal
        open={!!expandedPack}
        anchorRect={anchorRect}
        onClose={close}
        ariaLabel={expandedPack ? `${expandedPack.label} starter pack details` : undefined}
      >
        {expandedPack && (
          <ExpandedPack
            pack={expandedPack}
            topicIds={PATHWAY_TEMPLATES[expandedPack.id]}
            topicsById={topicsById}
            activePlanIds={activePlanIds}
            onClose={close}
            onToggleOne={toggleOne}
            onAddAll={() => addAll(expandedPack.id)}
          />
        )}
      </LiftModal>
    </div>
  )
}

function ExpandedPack({
  pack, topicIds, topicsById, activePlanIds, onClose, onToggleOne, onAddAll,
}: {
  pack: { id: keyof typeof PATHWAY_TEMPLATES; label: string; blurb: string }
  topicIds: string[]
  topicsById: Record<string, Topic>
  activePlanIds: Set<string>
  onClose: () => void
  onToggleOne: (topicId: string) => void
  onAddAll: () => void
}) {
  const topics = topicIds.map(id => topicsById[id]).filter(Boolean)
  const inPlan = topics.filter(t => activePlanIds.has(t.id)).length
  const allIn  = inPlan === topics.length && topics.length > 0
  const [justAddedId, setJustAddedId] = useState<string | null>(null)

  function handleToggle(topicId: string) {
    const wasActive = activePlanIds.has(topicId)
    onToggleOne(topicId)
    if (!wasActive) {
      setJustAddedId(topicId)
      window.setTimeout(() => setJustAddedId(prev => prev === topicId ? null : prev), 320)
    }
  }

  return (
    <ModalCardShell
      title={pack.label}
      blurb={pack.blurb}
      closeAriaLabel="Close starter pack"
      onClose={onClose}
      inPlan={inPlan}
      total={topics.length}
      addAllDisabled={allIn}
      onAddAll={onAddAll}
    >
      <ul className={s.starterTopicList}>
        {topics.map(t => {
          const already = activePlanIds.has(t.id)
          const popping = justAddedId === t.id
          return (
            <li key={t.id} className={s.starterTopicRow}>
              <Link to={`/learn/topic/${t.id}`} className={s.starterTopicBody}>
                <span className={s.starterTopicTitle}>{t.title}</span>
                <span className={s.starterTopicSummary}>{t.summary}</span>
              </Link>
              <button
                type="button"
                className={`${s.starterTopicBtn} ${already ? s.starterTopicBtnOn : ''} ${popping ? s.starterTopicBtnPop : ''}`}
                onClick={() => handleToggle(t.id)}
                aria-label={already ? `Remove ${t.title} from plan` : `Add ${t.title} to plan`}
                title={already ? 'In plan — tap to remove' : 'Add to plan'}
              >
                {already
                  ? <Check size={14} strokeWidth={2} />
                  : <Plus size={14} strokeWidth={2} />}
              </button>
            </li>
          )
        })}
      </ul>
    </ModalCardShell>
  )
}
