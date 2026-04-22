import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { overallProgress, repo } from '../db/repo'
import type { Track, Topic, Mastery } from '../db/types'
import {
  PageHeader, Section, Tile, TileTitle, TileMeta, TileRow,
  Chip, ProgressBar,
} from '../ui'
import { grid } from '../ui/grid'
import { AudienceBadge } from '../ui/AudienceBadge'
import { Disclosure } from '../ui/Disclosure'
import { splitByPathway, shouldCollapseRestByDefault, type UserPathway } from '../lib/audience'
import { masteryStatus, MASTERY_LABEL } from '../lib/mastery'
import { useUserStore } from '../state/userStore'
import s from './Learn.module.css'

export function Learn() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [topicsByTrack, setTopicsByTrack] = useState<Record<string, Topic[]>>({})
  const [mastery, setMastery] = useState<Record<string, number>>({})
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [topicsTotal, setTopicsTotal] = useState(0)
  const [nextTopic, setNextTopic] = useState<Topic | null>(null)
  const pathway = useUserStore(st => st.pathway)

  useEffect(() => {
    ;(async () => {
      const [tr, top, ma, prog] = await Promise.all([
        repo.listTracks(),
        repo.listTopics(),
        repo.listMastery(),
        overallProgress(),
      ])
      setTracks(tr)
      const grouped: Record<string, Topic[]> = {}
      for (const t of top) (grouped[t.trackId] ||= []).push(t)
      setTopicsByTrack(grouped)
      setMastery(Object.fromEntries(ma.map((m: Mastery) => [m.topicId, m.score])))

      setScore(prog.score); setCompleted(prog.completed); setTopicsTotal(prog.topics)
      const byId = new Map(ma.map(m => [m.topicId, m.score]))
      const unstarted = top.find(t => !byId.has(t.id)) ?? top[0]
      setNextTopic(unstarted ?? null)
    })()
  }, [])

  // Pathway sorts; never hides. For student/office we get two buckets;
  // for dev/all everything is primary and the "Everything else" label
  // is suppressed.
  const { primary, rest, split } = useMemo(
    () => splitByPathway(tracks, t => t.audience, pathway),
    [tracks, pathway],
  )

  return (
    <div className="page">
      <PageHeader
        eyebrow="Learn"
        title="Your AI curriculum"
        subtitle="Tracks break into topics. Each topic ends with a quiz. Mastery unlocks quietly, in the background."
      />

      <div className={s.summary}>
        <div className={s.rollup}>
          <div className={s.rollupHead}>
            <span className={s.rollupLabel}>Overall mastery</span>
            <span className={s.rollupMeta}>{completed} / {topicsTotal} completed</span>
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

      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <Link
          to="/learn/custom"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--ink-3)', fontSize: 13,
          }}
        >
          Build a custom pathway <ArrowRight size={13} strokeWidth={1.75} />
        </Link>
      </div>

      {split && primary.length > 0 && (
        <SectionHeading label="For you" />
      )}
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
          label="Everything else"
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

function SectionHeading({ label, tone = 'default' }: { label: string; tone?: 'default' | 'muted' }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-3)',
      margin: 'var(--space-8) 0 var(--space-2)',
      paddingBottom: 6,
      borderBottom: '1px solid var(--hair)',
    }}>
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: tone === 'muted' ? 'var(--ink-3)' : 'var(--ink-2)',
      }}>{label}</span>
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
                  <Chip variant={score >= 0.8 ? 'mastery' : score > 0 ? 'accent' : undefined}>
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
