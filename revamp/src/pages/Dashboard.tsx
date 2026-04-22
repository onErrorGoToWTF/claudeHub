import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, FolderGit2 } from 'lucide-react'
import { overallProgress, repo } from '../db/repo'
import type { Progress, Topic, Project } from '../db/types'
import { ProgressBar } from '../ui'
import { STATUS_LABEL } from '../lib/projectStatus'
import s from './Dashboard.module.css'

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
      const sorted = progs.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 2)
      setRecent(sorted.map(pr => ({ progress: pr, topic: topicsById.get(pr.topicId) })))
      setProjects(projs.slice(0, 2))

      const mastery = await repo.listMastery()
      const byId = new Map(mastery.map(m => [m.topicId, m.score]))
      const unstarted = topics.find(t => !byId.has(t.id)) ?? topics[0]
      setNextTopic(unstarted ?? null)
    })()
  }, [])

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planned').length

  return (
    <div className="page">
      <div className={s.split}>
        {/* ---------- Learn panel ---------- */}
        <section className={s.panel}>
          <header className={s.panelHead}>
            <span className={s.panelTitle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} strokeWidth={1.75} /> Learn
              </span>
            </span>
            <span className={s.panelMeta}>{completed} / {topicsCount} mastered</span>
          </header>

          <ProgressBar value={score} />

          <Link to="/learn" className={s.cta} style={{ color: 'inherit' }}>
            <span className={s.ctaLeft}>
              <span>Continue learning</span>
              {nextTopic && <span className={s.ctaSub}>Next up: {nextTopic.title}</span>}
            </span>
            <ArrowRight size={16} />
          </Link>

          {recent.length === 0 ? (
            <div className={s.muted}>Start a lesson or quiz — it'll show up here.</div>
          ) : (
            <div className={s.recents}>
              {recent.map(({ progress, topic }) => (
                <RecentRow key={progress.id + progress.kind} progress={progress} topic={topic} />
              ))}
            </div>
          )}
        </section>

        {/* ---------- Projects panel ---------- */}
        <section className={s.panel}>
          <header className={s.panelHead}>
            <span className={s.panelTitle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FolderGit2 size={16} strokeWidth={1.75} /> Projects
              </span>
            </span>
            <span className={s.panelMeta}>{activeProjects} active · {projects.length} total</span>
          </header>

          <Link to="/projects/new" className={s.cta} style={{ color: 'inherit' }}>
            <span className={s.ctaLeft}>
              <span>Start a project</span>
              <span className={s.ctaSub}>Brainstorm, pick a stack, generate a path.</span>
            </span>
            <ArrowRight size={16} />
          </Link>

          {projects.length === 0 ? (
            <div className={s.muted}>Start a project — it'll show up here.</div>
          ) : (
            <div className={s.recents}>
              {projects.map(p => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function RecentRow({ progress, topic }: { progress: Progress; topic?: Topic }) {
  const to = progress.kind === 'lesson'
    ? `/learn/lesson/${progress.id}`
    : `/learn/quiz/${progress.id}`
  const meta = progress.kind === 'quiz'
    ? `Quiz · ${Math.round((progress.score ?? 0) * 100)}%`
    : 'Lesson'
  return (
    <Link to={to} className={s.recentRow}>
      <span className={s.recentTitle}>{topic?.title ?? progress.topicId}</span>
      <span className={s.recentMeta}>{meta}</span>
    </Link>
  )
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} className={s.recentRow}>
      <span className={s.recentTitle}>{project.title}</span>
      <span className={s.recentMeta}>{STATUS_LABEL[project.status]}</span>
    </Link>
  )
}
