import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { Track, Topic, Mastery } from '../db/types'
import {
  PageHeader, Section, Tile, TileTitle, TileMeta, TileRow,
  Chip, ProgressBar, grid,
} from '../ui'

export function Learn() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [topicsByTrack, setTopicsByTrack] = useState<Record<string, Topic[]>>({})
  const [mastery, setMastery] = useState<Record<string, number>>({})

  useEffect(() => {
    ;(async () => {
      const [tr, top, ma] = await Promise.all([
        repo.listTracks(),
        repo.listTopics(),
        repo.listMastery(),
      ])
      setTracks(tr)
      const grouped: Record<string, Topic[]> = {}
      for (const t of top) (grouped[t.trackId] ||= []).push(t)
      setTopicsByTrack(grouped)
      setMastery(Object.fromEntries(ma.map((m: Mastery) => [m.topicId, m.score])))
    })()
  }, [])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Learn"
        title="Your AI curriculum"
        subtitle="Tracks break into topics. Each topic ends with a quiz. Mastery unlocks quietly, in the background."
      />

      {tracks.map(track => (
        <Section
          key={track.id}
          title={track.title}
          meta={track.summary}
        >
          <div className={grid}>
            {(topicsByTrack[track.id] ?? []).map(topic => {
              const score = mastery[topic.id] ?? 0
              const label =
                score === 0 ? 'Not started'
                : score < 0.5 ? 'Started'
                : score < 0.8 ? 'Progressing'
                : 'Mastered'
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
      ))}
    </div>
  )
}
