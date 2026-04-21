import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight } from 'lucide-react'
import { repo } from '../db/repo'
import type { Project } from '../db/types'
import { Button, Chip, Empty, PageHeader, Tile, TileMeta, TileRow, TileTitle, grid } from '../ui'
import { STATUS_LABEL } from '../lib/projectStatus'

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  useEffect(() => { repo.listProjects().then(setProjects) }, [])

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
                    <Chip>{STATUS_LABEL[p.status]}</Chip>
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
