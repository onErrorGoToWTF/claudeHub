import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Check, X } from 'lucide-react'
import { overallProgress, repo } from '../db/repo'
import type { Category, Track, Topic, Mastery, UserPathwayItem } from '../db/types'
import { LiftModal } from '../ui/LiftModal'
import {
  PageHeader, Section, Tile, TileTitle, TileMeta, TileRow,
  Chip, ProgressBar,
} from '../ui'
import { grid } from '../ui/grid'
import { AudienceBadge } from '../ui/AudienceBadge'
import { Disclosure } from '../ui/Disclosure'
import { splitByPathway, shouldCollapseRestByDefault, type UserPathway } from '../lib/audience'
import { masteryStatus, MASTERY_LABEL, PASS_THRESHOLD, MASTERY_THRESHOLD } from '../lib/mastery'
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

      {/* ---------- Categories ---------- */}
      {categories.map(cat => (
        <CategorySection
          key={cat.id}
          category={cat}
          tracks={tracksByCategory[cat.id] ?? []}
          topicsByTrack={topicsByTrack}
          mastery={mastery}
          pathway={pathway}
        />
      ))}

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

function CategorySection({
  category, tracks, topicsByTrack, mastery, pathway,
}: {
  category: Category
  tracks: Track[]
  topicsByTrack: Record<string, Topic[]>
  mastery: Record<string, number>
  pathway: UserPathway
}) {
  // Within a category, still sort by pathway: matching tracks up top,
  // "Everything else" collapsed on dev.
  const { primary, rest, split } = useMemo(
    () => splitByPathway(tracks, t => t.audience, pathway),
    [tracks, pathway],
  )

  if (tracks.length === 0) return null

  return (
    <div className={s.catSection}>
      <div className={s.catHead}>
        <span className={s.catTitle}>{category.title}</span>
        <span className={s.catMeta}>{category.summary}</span>
      </div>

      {primary.map(track => (
        <TrackSection
          key={track.id}
          track={track}
          topics={topicsByTrack[track.id] ?? []}
          mastery={mastery}
          pathway={pathway}
        />
      ))}

      {split && rest.length > 0 && (
        <Disclosure
          label="Everything else in this category"
          meta={`${rest.length} ${rest.length === 1 ? 'track' : 'tracks'}`}
          defaultOpen={!shouldCollapseRestByDefault(pathway)}
        >
          {rest.map(track => (
            <TrackSection
              key={track.id}
              track={track}
              topics={topicsByTrack[track.id] ?? []}
              mastery={mastery}
              pathway={pathway}
            />
          ))}
        </Disclosure>
      )}
    </div>
  )
}

function TrackSection({
  track, topics, mastery, pathway,
}: {
  track: Track
  topics: Topic[]
  mastery: Record<string, number>
  pathway: UserPathway
}) {
  return (
    <Section
      title={
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
          {track.title}
          <AudienceBadge audience={track.audience} pathway={pathway} />
        </span>
      }
      meta={track.summary}
    >
      <div className={grid}>
        {topics.map(topic => {
          const score = mastery[topic.id] ?? 0
          const status = masteryStatus(score)
          const label = MASTERY_LABEL[status]
          return (
            <Link key={topic.id} to={`/learn/topic/${topic.id}`} style={{ color: 'inherit' }}>
              <Tile>
                <TileRow>
                  <TileTitle>{topic.title}</TileTitle>
                  <ArrowRight size={16} />
                </TileRow>
                <TileMeta>{topic.summary}</TileMeta>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <ProgressBar value={score} />
                </div>
                <TileRow>
                  <Chip variant={score >= MASTERY_THRESHOLD ? 'mastery' : score >= PASS_THRESHOLD ? 'accent' : undefined}>
                    {label}
                  </Chip>
                  <TileMeta>{Math.round(score * 100)}%</TileMeta>
                </TileRow>
              </Tile>
            </Link>
          )
        })}
      </div>
    </Section>
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

  function open(id: keyof typeof PATHWAY_TEMPLATES, e: React.MouseEvent<HTMLButtonElement>) {
    setAnchorRect(e.currentTarget.getBoundingClientRect())
    setExpandedId(id)
  }
  function close() {
    setExpandedId(null)
  }

  async function addOne(topicId: string) {
    if (activePlanIds.has(topicId)) return
    await repo.addPathwayItem(topicId, 'seed')
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
            <button
              key={p.id}
              type="button"
              className={`${s.starterCard} ${allIn ? s.starterCardOn : ''}`}
              onClick={(e) => open(p.id, e)}
            >
              <div className={s.starterCardHead}>
                <span className={s.starterCardTitle}>{p.label}</span>
                {allIn
                  ? <Check size={14} strokeWidth={2} />
                  : <Plus size={14} strokeWidth={2} />}
              </div>
              <div className={s.starterCardBlurb}>{p.blurb}</div>
              <div className={s.starterCardFoot}>
                {already > 0 && !allIn && <>{already} of {topicIds.length} in plan · </>}
                {allIn ? 'All added' : `${topicIds.length} topics`}
              </div>
            </button>
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
            onAddOne={addOne}
            onAddAll={() => addAll(expandedPack.id)}
          />
        )}
      </LiftModal>
    </div>
  )
}

function ExpandedPack({
  pack, topicIds, topicsById, activePlanIds, onClose, onAddOne, onAddAll,
}: {
  pack: { id: keyof typeof PATHWAY_TEMPLATES; label: string; blurb: string }
  topicIds: string[]
  topicsById: Record<string, Topic>
  activePlanIds: Set<string>
  onClose: () => void
  onAddOne: (topicId: string) => void
  onAddAll: () => void
}) {
  const topics = topicIds.map(id => topicsById[id]).filter(Boolean)
  const inPlan = topics.filter(t => activePlanIds.has(t.id)).length
  const allIn  = inPlan === topics.length && topics.length > 0

  return (
    <div className={s.starterExpanded}>
      <div className={s.starterExpandedHead}>
        <div>
          <div className={s.starterCardTitle}>{pack.label}</div>
          <div className={s.starterCardBlurb}>{pack.blurb}</div>
        </div>
        <button
          type="button"
          className={s.starterCloseBtn}
          onClick={onClose}
          aria-label="Close starter pack"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      <ul className={s.starterTopicList}>
        {topics.map(t => {
          const already = activePlanIds.has(t.id)
          return (
            <li key={t.id} className={s.starterTopicRow}>
              <Link to={`/learn/topic/${t.id}`} className={s.starterTopicBody}>
                <span className={s.starterTopicTitle}>{t.title}</span>
                <span className={s.starterTopicSummary}>{t.summary}</span>
              </Link>
              <button
                type="button"
                className={`${s.starterTopicBtn} ${already ? s.starterTopicBtnOn : ''}`}
                onClick={() => onAddOne(t.id)}
                disabled={already}
                aria-label={already ? 'Already in plan' : `Add ${t.title} to plan`}
                title={already ? 'Already in plan' : 'Add to plan'}
              >
                {already
                  ? <Check size={14} strokeWidth={2} />
                  : <Plus size={14} strokeWidth={2} />}
              </button>
            </li>
          )
        })}
      </ul>

      <div className={s.starterExpandedFoot}>
        <span className={s.starterCardFoot}>
          {inPlan} of {topics.length} in plan
        </span>
        <button
          type="button"
          className={s.starterAddAllBtn}
          onClick={onAddAll}
          disabled={allIn}
        >
          {allIn ? 'All added' : `Add all ${topics.length}`}
        </button>
      </div>
    </div>
  )
}
