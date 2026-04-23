import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { Project, ProjectStatus } from '../db/types'
import { Button, Chip, Empty, PageHeader, Tile, TileMeta, TileRow, TileTitle } from '../ui'
import { Disclosure } from '../ui/Disclosure'
import { grid } from '../ui/grid'
import { STATUS_LABEL, statusChipVariant } from '../lib/projectStatus'
import s from './Projects.module.css'

// Live-grid filter. "all" = default. Individual statuses drill the grid
// to only that status's projects; archive disclosure below is unaffected.
type LiveFilter = 'all' | Extract<ProjectStatus, 'backlog' | 'planned' | 'in_progress'>
const LIVE_FILTERS: { id: LiveFilter; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'planned',     label: 'Planned' },
  { id: 'backlog',     label: 'Backlog' },
]

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => { repo.listProjects().then(setProjects) }, [])

  const liveFilter: LiveFilter = (() => {
    const v = searchParams.get('status')
    if (LIVE_FILTERS.some(f => f.id === v)) return v as LiveFilter
    return 'all'
  })()
  const setLiveFilter = (f: LiveFilter) => {
    const next = new URLSearchParams(searchParams)
    if (f === 'all') next.delete('status'); else next.set('status', f)
    setSearchParams(next, { replace: true })
  }

  const active = useMemo(
    () => projects.filter(p => p.status === 'in_progress' || p.status === 'planned'),
    [projects],
  )
  // Live projects stay in the main grid (anything a user would still act on).
  // Done/abandoned projects collapse into an "Archived" disclosure so the
  // grid doesn't get drowned as the portfolio grows. Backlog counts as live.
  const liveProjects = useMemo(
    () => projects.filter(p => p.status !== 'completed' && p.status !== 'canceled'),
    [projects],
  )
  const archivedProjects = useMemo(
    () => projects.filter(p => p.status === 'completed' || p.status === 'canceled'),
    [projects],
  )
  // Status-chip filter operates only on the live grid — archived projects
  // stay hidden inside the disclosure regardless of the chosen filter.
  const shownLive = useMemo(() => {
    if (liveFilter === 'all') return liveProjects
    return liveProjects.filter(p => p.status === liveFilter)
  }, [liveProjects, liveFilter])
  const liveCounts = useMemo(() => {
    const out: Record<string, number> = { all: liveProjects.length }
    for (const p of liveProjects) out[p.status] = (out[p.status] ?? 0) + 1
    return out
  }, [liveProjects])
  const inProgress = projects.filter(p => p.status === 'in_progress').length
  const completed  = projects.filter(p => p.status === 'completed').length

  // Most-recently-updated active project = what to resume
  const resume = useMemo(() => {
    return [...active].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
  }, [active])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Projects"
        title="What are you building?"
        subtitle="Describe a project, pick a route, and follow it end-to-end."
        right={
          <Link to="/projects/new">
            <Button variant="primary"><Plus size={15} /> New project</Button>
          </Link>
        }
      />

      {projects.length > 0 && (
        <div className={s.summary}>
          <div className={s.stats}>
            <div className={s.stat}>
              <span className={s.statValue}>{inProgress}</span>
              <span className={s.statLabel}>In progress</span>
            </div>
            <div className={s.stat}>
              <span className={s.statValue}>{active.length}</span>
              <span className={s.statLabel}>Active</span>
            </div>
            <div className={s.stat}>
              <span className={s.statValue}>{completed}</span>
              <span className={s.statLabel}>Completed</span>
            </div>
          </div>
          {resume && (
            <Link to={`/projects/${resume.id}`} className={s.resume}>
              <span className={s.resumeLeft}>
                <span>Resume</span>
                <span className={s.resumeSub}>{resume.title}</span>
              </span>
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <Empty>No projects yet. Start one.</Empty>
      ) : (
        <>
          {liveProjects.length > 0 && (
            <div className={s.statusChips}>
              {LIVE_FILTERS.map(f => {
                const count = liveCounts[f.id] ?? 0
                if (f.id !== 'all' && count === 0) return null
                const active = liveFilter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`${s.statusChip} ${active ? s.statusChipOn : ''}`}
                    onClick={() => setLiveFilter(f.id)}
                    aria-pressed={active}
                  >
                    {f.label} <span className={s.statusChipCount}>{count}</span>
                  </button>
                )
              })}
            </div>
          )}
          {liveProjects.length === 0 ? (
            <Empty>
              No live projects. Everything's archived — start a new one, or expand below to revisit.
            </Empty>
          ) : shownLive.length === 0 ? (
            <Empty>
              No {LIVE_FILTERS.find(f => f.id === liveFilter)?.label.toLowerCase()} projects.{' '}
              <button
                type="button"
                onClick={() => setLiveFilter('all')}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  color: 'var(--accent-ink)', cursor: 'pointer', font: 'inherit',
                  textDecoration: 'underline',
                }}
              >Show all</button>.
            </Empty>
          ) : (
            <div className={grid}>
              {shownLive.map(p => (
                <ProjectTile key={p.id} project={p} />
              ))}
            </div>
          )}
          {archivedProjects.length > 0 && (
            <Disclosure
              label="Archived"
              meta={`${archivedProjects.length} ${archivedProjects.length === 1 ? 'project' : 'projects'}`}
              defaultOpen={false}
            >
              <div className={grid}>
                {archivedProjects.map(p => (
                  <ProjectTile key={p.id} project={p} />
                ))}
              </div>
            </Disclosure>
          )}
        </>
      )}
    </div>
  )
}

function ProjectTile({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} style={{ color: 'inherit' }}>
      <Tile>
        <TileRow>
          <TileTitle>{project.title}</TileTitle>
        </TileRow>
        <TileMeta>{project.summary}</TileMeta>
        <TileRow>
          <Chip variant={statusChipVariant(project.status)}>{STATUS_LABEL[project.status]}</Chip>
          <TileMeta>{new Date(project.updatedAt).toLocaleDateString()}</TileMeta>
        </TileRow>
      </Tile>
    </Link>
  )
}
