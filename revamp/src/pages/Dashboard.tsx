import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BookOpen, FolderGit2,
  CheckCircle2, BrainCircuit, Plus, RefreshCcw, Pin, BookPlus,
} from 'lucide-react'
import { overallProgress, repo } from '../db/repo'
import type { Progress, Topic, Project, LibraryItem } from '../db/types'
import { ProgressBar, List, Row } from '../ui'
import { STATUS_LABEL } from '../lib/projectStatus'
import { buildActivity, whenShort, type ActivityKind } from '../lib/activity'
import s from './Dashboard.module.css'

export function Dashboard() {
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [topicsCount, setTopicsCount] = useState(0)
  const [recent, setRecent] = useState<{ progress: Progress; topic?: Topic }[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [nextTopic, setNextTopic] = useState<Topic | null>(null)
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [allProgress, setAllProgress] = useState<Progress[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [allLibrary, setAllLibrary]   = useState<LibraryItem[]>([])

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

      const library = await repo.listLibrary()

      setAllTopics(topics)
      setAllProgress(progs)
      setAllProjects(projs)
      setAllLibrary(library)
    })()
  }, [])

  const activity = useMemo(() => {
    const topicsById = new Map(allTopics.map(t => [t.id, t]))
    return buildActivity(allProgress, topicsById, allProjects, allLibrary).slice(0, 8)
  }, [allProgress, allTopics, allProjects, allLibrary])

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planned').length

  return (
    <div className="page">
      <div className={s.eyebrow}>Dashboard</div>

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
            <div className={s.muted}>No projects yet.</div>
          ) : (
            <div className={s.recents}>
              {projects.map(p => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ---------- Activity ---------- */}
      {activity.length > 0 && (
        <section style={{ marginTop: 'var(--space-10)' }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 'var(--space-3)',
          }}>
            <h2 style={{ fontSize: 'var(--text-md)', color: 'var(--ink-2)', fontWeight: 600 }}>
              Activity
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>
              Across Learn, Projects, and Library
            </span>
          </div>
          <List>
            {activity.map(a => (
              <Link key={a.id} to={a.to ?? '#'} style={{ color: 'inherit' }}>
                <Row
                  title={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <ActivityIcon kind={a.kind} />
                      {a.title}
                    </span>
                  }
                  sub={a.sub}
                  right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>{whenShort(a.ts)}</span>}
                />
              </Link>
            ))}
          </List>
        </section>
      )}
    </div>
  )
}

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const common = { size: 14, strokeWidth: 1.75 as const }
  const wrap = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-sunken)', color: 'var(--ink-2)',
  } as const
  let Icon = BookOpen
  if (kind === 'lesson_done')      Icon = CheckCircle2
  if (kind === 'quiz_taken')       Icon = BrainCircuit
  if (kind === 'project_new')      Icon = Plus
  if (kind === 'project_updated')  Icon = RefreshCcw
  if (kind === 'library_pinned')   Icon = Pin
  if (kind === 'library_added')    Icon = BookPlus
  return <span style={wrap}><Icon {...common} /></span>
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

