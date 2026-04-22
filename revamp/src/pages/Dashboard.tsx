import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, FolderGit2 } from 'lucide-react'
import { overallProgress, repo } from '../db/repo'
import type { Progress, Topic, Project } from '../db/types'
import { ProgressBar } from '../ui'
import { STATUS_LABEL } from '../lib/projectStatus'
import { masteryStatus, MASTERY_LABEL } from '../lib/mastery'
import s from './Dashboard.module.css'

export function Dashboard() {
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [topicsCount, setTopicsCount] = useState(0)
  const [recent, setRecent] = useState<{ progress: Progress; topic?: Topic; topicScore: number }[]>([])
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
      setProjects(projs.slice(0, 2))

      const mastery = await repo.listMastery()
      const byId = new Map(mastery.map(m => [m.topicId, m.score]))
      const unstarted = topics.find(t => !byId.has(t.id)) ?? topics[0]
      setNextTopic(unstarted ?? null)

      // Dedupe by topic — most-recent touch per topic wins. Lesson and quiz
      // are separate progress rows but collapse to one topic here so the
      // dashboard doesn't show identical-looking duplicates.
      const sortedByRecent = progs.sort((a, b) => b.updatedAt - a.updatedAt)
      const seen = new Set<string>()
      const dedup: typeof progs = []
      for (const pr of sortedByRecent) {
        if (seen.has(pr.topicId)) continue
        seen.add(pr.topicId)
        dedup.push(pr)
        if (dedup.length >= 2) break
      }
      setRecent(dedup.map(pr => ({
        progress: pr,
        topic: topicsById.get(pr.topicId),
        topicScore: byId.get(pr.topicId) ?? 0,
      })))
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
              {recent.map(({ progress, topic, topicScore }) => (
                <RecentRow
                  key={progress.id + progress.kind}
                  progress={progress}
                  topic={topic}
                  topicScore={topicScore}
                />
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

function RecentRow({ progress, topic, topicScore }: {
  progress: Progress
  topic?: Topic
  topicScore: number
}) {
  const to = `/learn/topic/${progress.topicId}`
  const status = masteryStatus(topicScore)
  const meta = topicScore > 0
    ? `${MASTERY_LABEL[status]} · ${Math.round(topicScore * 100)}%`
    : MASTERY_LABEL[status]
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
