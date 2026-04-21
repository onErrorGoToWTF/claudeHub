import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { repo } from '../db/repo'
import type { Topic, Track } from '../db/types'
import { Button, Chip, List, PageHeader, Row } from '../ui'
import { splitByPathway } from '../lib/audience'
import { useUserStore } from '../state/userStore'
import { orderByPrereqs } from '../lib/pathwayOrder'

type Stage = 'pick' | 'ordered'

export function CustomPathway() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [stage, setStage] = useState<Stage>('pick')
  const pathway = useUserStore(s => s.pathway)

  useEffect(() => {
    Promise.all([repo.listTracks(), repo.listTopics()])
      .then(([tr, tp]) => { setTracks(tr); setTopics(tp) })
  }, [])

  const topicsByTrack = useMemo(() => {
    // Pathway reorders tracks for this picker: primary first, rest below.
    // Every track stays visible — users can claim topics from anywhere.
    const { primary, rest } = splitByPathway(tracks, t => t.audience, pathway)
    const shown = [...primary, ...rest]
    const map = new Map<string, Topic[]>()
    for (const tr of shown) map.set(tr.id, [])
    for (const tp of topics) if (map.has(tp.trackId)) map.get(tp.trackId)!.push(tp)
    for (const list of map.values()) list.sort((a, b) => a.order - b.order)
    return { shown, map }
  }, [tracks, topics, pathway])

  const ordered = useMemo(
    () => orderByPrereqs(topics, [...picked]),
    [topics, picked],
  )

  function toggle(id: string) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (stage === 'ordered') {
    return (
      <div className="page">
        <button
          onClick={() => setStage('pick')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--text-sm)', color: 'var(--ink-3)',
            marginBottom: 'var(--space-4)', background: 'none', border: 0,
          }}
        >
          <ArrowLeft size={14} /> Back to topic picker
        </button>
        <PageHeader
          eyebrow="Custom pathway"
          title="Your learning path"
          subtitle={`${ordered.length} ${ordered.length === 1 ? 'topic' : 'topics'}, ordered so prerequisites come first.`}
        />

        <List>
          {ordered.map((t, i) => (
            <Link key={t.id} to={`/learn/topic/${t.id}`} style={{ color: 'inherit' }}>
              <Row
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                      fontSize: 11, fontWeight: 700,
                      color: 'var(--accent-ink)', background: 'var(--accent-surface)',
                    }}>{i + 1}</span>
                    {t.title}
                  </span>
                }
                sub={t.summary}
                right={<ArrowRight size={14} strokeWidth={1.75} />}
              />
            </Link>
          ))}
        </List>
      </div>
    )
  }

  return (
    <div className="page">
      <Link
        to="/learn"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 'var(--text-sm)', color: 'var(--ink-3)',
          marginBottom: 'var(--space-4)', textDecoration: 'none',
        }}
      >
        <ArrowLeft size={14} /> Back to Learn
      </Link>

      <PageHeader
        eyebrow="Custom pathway"
        title="Pick what you want to learn"
        subtitle="Select any topics that interest you. We'll order them so prerequisites come first — no need to sequence them yourself."
      />

      {topicsByTrack.shown.map(track => {
        const list = topicsByTrack.map.get(track.id) ?? []
        if (list.length === 0) return null
        return (
          <section key={track.id} style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{
              fontSize: 'var(--text-md)', color: 'var(--ink-2)',
              fontWeight: 600, marginBottom: 'var(--space-3)',
            }}>{track.title}</h2>
            <List>
              {list.map(topic => {
                const on = picked.has(topic.id)
                return (
                  <Row
                    key={topic.id}
                    title={topic.title}
                    sub={topic.summary}
                    selected={on}
                    right={on ? <Chip variant="accent">Picked</Chip> : undefined}
                    onClick={() => toggle(topic.id)}
                  />
                )
              })}
            </List>
          </section>
        )
      })}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 'var(--space-6)',
      }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>
          {picked.size} {picked.size === 1 ? 'topic' : 'topics'} selected
        </div>
        <Button
          variant="primary"
          disabled={picked.size === 0}
          onClick={() => setStage('ordered')}
        >
          <Sparkles size={14} /> Build path <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  )
}
