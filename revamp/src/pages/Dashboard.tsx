import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, FolderGit2, Library as LibraryIcon } from 'lucide-react'
import { overallProgress, repo } from '../db/repo'
import type { Progress, Topic, Project, LibraryItem } from '../db/types'
import { PageHeader, ProgressBar, List, Row, Chip } from '../ui'
import { STATUS_LABEL } from '../lib/projectStatus'
import s from './Dashboard.module.css'

export function Dashboard() {
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [topicsCount, setTopicsCount] = useState(0)
  const [recent, setRecent] = useState<{ progress: Progress; topic?: Topic }[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [nextTopic, setNextTopic] = useState<Topic | null>(null)
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [libraryTotal, setLibraryTotal] = useState(0)

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
      const sorted = progs.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)
      setRecent(sorted.map(pr => ({ progress: pr, topic: topicsById.get(pr.topicId) })))
      setProjects(projs.slice(0, 3))

      const mastery = await repo.listMastery()
      const byId = new Map(mastery.map(m => [m.topicId, m.score]))
      const unstarted = topics.find(t => !byId.has(t.id)) ?? topics[0]
      setNextTopic(unstarted ?? null)

      const library = await repo.listLibrary()
      const viewable = library.filter(i => !!i.body)
      setLibraryTotal(viewable.length)
      // Pinned first, then newest
      const sortedLib = [...viewable].sort((a, b) =>
        Number(b.pinned) - Number(a.pinned) || b.addedAt - a.addedAt
      )
      setLibraryItems(sortedLib.slice(0, 3))
    })()
  }, [])

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planned').length

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dashboard"
        title="Learn. Build. Ship."
        subtitle="Pick up where you left off, or start something new."
      />

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

          <div className={s.sectionLabel}>Recent</div>
          {recent.length === 0 ? (
            <div className={s.muted}>Start a lesson or quiz — it'll show up here.</div>
          ) : (
            <List>
              {recent.map(({ progress, topic }) => (
                <RecentRow key={progress.id + progress.kind} progress={progress} topic={topic} />
              ))}
            </List>
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

          <div className={s.sectionLabel}>Recent</div>
          {projects.length === 0 ? (
            <div className={s.muted}>No projects yet.</div>
          ) : (
            <List>
              {projects.map(p => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </List>
          )}
        </section>

        {/* ---------- Library panel ---------- */}
        <section className={s.panel}>
          <header className={s.panelHead}>
            <span className={s.panelTitle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <LibraryIcon size={16} strokeWidth={1.75} /> Library
              </span>
            </span>
            <span className={s.panelMeta}>{libraryTotal} entries</span>
          </header>

          <Link to="/library" className={s.cta} style={{ color: 'inherit' }}>
            <span className={s.ctaLeft}>
              <span>Browse library</span>
              <span className={s.ctaSub}>Tools, docs, references. Pin what you come back to.</span>
            </span>
            <ArrowRight size={16} />
          </Link>

          <div className={s.sectionLabel}>Pinned</div>
          {libraryItems.length === 0 ? (
            <div className={s.muted}>Nothing pinned yet.</div>
          ) : (
            <List>
              {libraryItems.map(it => (
                <LibraryRow key={it.id} item={it} />
              ))}
            </List>
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
  const sub = progress.kind === 'quiz'
    ? `Quiz · ${Math.round((progress.score ?? 0) * 100)}%`
    : 'Lesson · done'
  return (
    <Link to={to} style={{ color: 'inherit' }}>
      <Row
        title={topic?.title ?? progress.topicId}
        sub={sub}
        right={
          <Chip variant={progress.kind === 'quiz' ? 'accent' : 'mastery'}>
            {progress.kind}
          </Chip>
        }
      />
    </Link>
  )
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} style={{ color: 'inherit' }}>
      <Row
        title={project.title}
        sub={project.summary}
        right={<Chip>{STATUS_LABEL[project.status]}</Chip>}
      />
    </Link>
  )
}

const KIND_LABEL: Record<string, string> = { tool: 'Tool', doc: 'Doc', read: 'Read', video: 'Video' }

function LibraryRow({ item }: { item: LibraryItem }) {
  return (
    <Link to={`/library/${item.id}`} style={{ color: 'inherit' }}>
      <Row
        title={item.title}
        sub={item.summary}
        right={<Chip variant={item.pinned ? 'accent' : undefined}>{KIND_LABEL[item.kind] ?? item.kind}</Chip>}
      />
    </Link>
  )
}
