import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, FolderGit2, BookOpen } from 'lucide-react'
import { overallProgress, repo } from '../db/repo'
import type { Progress, Topic, Project } from '../db/types'
import {
  PageHeader, Section, ProgressBar, Tile, TileTitle, TileMeta, TileRow, Chip, grid,
} from '../ui'

export function Dashboard() {
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [topicsCount, setTopicsCount] = useState(0)
  const [recent, setRecent] = useState<{ progress: Progress; topic?: Topic }[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [nextTopic, setNextTopic] = useState<Topic | null>(null)

  useEffect(() => {
    ;(async () => {
      const p = await overallProgress()
      setScore(p.score); setCompleted(p.completed); setTopicsCount(p.topics)

      const [progs, topics, projs] = await Promise.all([
        repo.listProgress(),
        repo.listTopics(),
        repo.listProjects(),
      ])
      const topicsById = new Map(topics.map(t => [t.id, t]))
      const sorted = progs.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4)
      setRecent(sorted.map(pr => ({ progress: pr, topic: topicsById.get(pr.topicId) })))
      setProjects(projs.slice(0, 2))

      const mastery = await repo.listMastery()
      const byId = new Map(mastery.map(m => [m.topicId, m.score]))
      const unstarted = topics.find(t => !byId.has(t.id)) ?? topics[0]
      setNextTopic(unstarted ?? null)
    })()
  }, [])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dashboard"
        title="Learn. Build. Ship."
        subtitle="A quiet home. Pick up where you left off, or start something new."
      />

      {/* Big progress bar — the quiet landing */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>Overall mastery</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>
            {completed} / {topicsCount} topics mastered
          </div>
        </div>
        <ProgressBar value={score} />
      </div>

      {/* Quick links */}
      <div className={grid}>
        <Link to="/learn" style={{ color: 'inherit' }}>
          <Tile>
            <TileRow>
              <TileTitle>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} strokeWidth={1.75} /> Continue learning
                </span>
              </TileTitle>
              <ArrowRight size={16} />
            </TileRow>
            <TileMeta>{nextTopic ? `Next up: ${nextTopic.title}` : 'Open Learn →'}</TileMeta>
          </Tile>
        </Link>
        <Link to="/projects/new" style={{ color: 'inherit' }}>
          <Tile>
            <TileRow>
              <TileTitle>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <FolderGit2 size={16} strokeWidth={1.75} /> Start a project
                </span>
              </TileTitle>
              <ArrowRight size={16} />
            </TileRow>
            <TileMeta>Brainstorm, pick a stack, generate a path.</TileMeta>
          </Tile>
        </Link>
      </div>

      {/* Recent activity */}
      <Section title="Recent activity" meta={recent.length === 0 ? 'nothing yet' : `${recent.length} items`}>
        {recent.length === 0 ? (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>
            Start a lesson or quiz — it'll show up here.
          </div>
        ) : (
          <div className={grid}>
            {recent.map(({ progress, topic }) => (
              <Link
                key={progress.id + progress.kind}
                to={progress.kind === 'lesson' ? `/learn/lesson/${progress.id}` : `/learn/quiz/${progress.id}`}
                style={{ color: 'inherit' }}
              >
                <Tile>
                  <TileRow>
                    <TileTitle>{topic?.title ?? progress.topicId}</TileTitle>
                    <Chip variant={progress.kind === 'quiz' ? 'accent' : 'mastery'}>
                      {progress.kind === 'quiz'
                        ? `Quiz · ${Math.round((progress.score ?? 0) * 100)}%`
                        : 'Lesson · done'}
                    </Chip>
                  </TileRow>
                  <TileMeta>{new Date(progress.updatedAt).toLocaleString()}</TileMeta>
                </Tile>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Projects in flight */}
      <Section title="Projects" meta={<Link to="/projects" style={{ color: 'var(--ink-3)' }}>All →</Link>}>
        {projects.length === 0 ? (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>No projects yet.</div>
        ) : (
          <div className={grid}>
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} style={{ color: 'inherit' }}>
                <Tile>
                  <TileRow>
                    <TileTitle>{p.title}</TileTitle>
                    <Chip variant="accent"><Sparkles size={12} /> {p.route}</Chip>
                  </TileRow>
                  <TileMeta>{p.summary}</TileMeta>
                </Tile>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
