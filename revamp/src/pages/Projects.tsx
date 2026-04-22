import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { Project } from '../db/types'
import { Button, Chip, Empty, PageHeader, Tile, TileMeta, TileRow, TileTitle } from '../ui'
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
        <div className={grid}>
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} style={{ color: 'inherit' }}>
              <Tile>
                <TileRow>
                  <TileTitle>{p.title}</TileTitle>
                  <ArrowRight size={16} />
                </TileRow>
                <TileMeta>{p.summary}</TileMeta>
                <TileRow>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Chip variant="accent">{p.route}</Chip>
                    <Chip variant={statusChipVariant(p.status)}>{STATUS_LABEL[p.status]}</Chip>
                  </div>
                  <TileMeta>{new Date(p.updatedAt).toLocaleDateString()}</TileMeta>
                </TileRow>
              </Tile>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
