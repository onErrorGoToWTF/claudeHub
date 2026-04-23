import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { Project } from '../db/types'
import { Button, Chip, Empty, PageHeader, Tile, TileMeta, TileRow, TileTitle } from '../ui'
import { Disclosure } from '../ui/Disclosure'
import { grid } from '../ui/grid'
import { STATUS_LABEL, statusChipVariant } from '../lib/projectStatus'
import s from './Projects.module.css'

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  useEffect(() => { repo.listProjects().then(setProjects) }, [])

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
          {liveProjects.length === 0 ? (
            <Empty>
              No live projects. Everything's archived — start a new one, or expand below to revisit.
            </Empty>
          ) : (
            <div className={grid}>
              {liveProjects.map(p => (
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
