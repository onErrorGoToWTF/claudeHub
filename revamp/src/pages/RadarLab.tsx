// Experimental mastery radar — /labs/radar
//
// EXPLICITLY THROWAWAY. Keep this file self-contained so rollback is
// delete-this-file + remove one route line. No shared tokens extended,
// no new repo methods, no design-system primitives. Everything local.
//
// Purpose: test bright "electric" highlight colors on an animated graph
// while the rest of the app stays warm greige / black / white. Pick a
// color from the swatch row; radar repaints.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { repo } from '../db/repo'
import type { Track, Topic, Mastery } from '../db/types'
import { PageHeader } from '../ui'
import s from './RadarLab.module.css'

type Swatch = { id: string; label: string; base: string; glow: string }

// OKLCH hues, tuned to read "electric" against the warm-greige canvas —
// chroma and lightness kept in Apple-native territory (not neon-vomit).
const SWATCHES: Swatch[] = [
  { id: 'blue',    label: 'Electric blue',    base: 'oklch(66% 0.22 250)', glow: 'oklch(66% 0.22 250 / 0.35)' },
  { id: 'green',   label: 'Electric green',   base: 'oklch(76% 0.21 160)', glow: 'oklch(76% 0.21 160 / 0.35)' },
  { id: 'cyan',    label: 'Cyan',             base: 'oklch(78% 0.16 210)', glow: 'oklch(78% 0.16 210 / 0.35)' },
  { id: 'violet',  label: 'Violet',           base: 'oklch(66% 0.22 295)', glow: 'oklch(66% 0.22 295 / 0.35)' },
  { id: 'magenta', label: 'Magenta',          base: 'oklch(68% 0.26 340)', glow: 'oklch(68% 0.26 340 / 0.35)' },
  { id: 'amber',   label: 'Amber',            base: 'oklch(78% 0.18 70)',  glow: 'oklch(78% 0.18 70 / 0.35)'  },
]

type TrackScore = { track: Track; score: number; count: number; totalTopics: number }

export function RadarLab() {
  const [tracks, setTracks]   = useState<Track[]>([])
  const [topics, setTopics]   = useState<Topic[]>([])
  const [mastery, setMastery] = useState<Mastery[]>([])
  const [swatchId, setSwatchId] = useState<string>('blue')

  useEffect(() => {
    ;(async () => {
      const [tr, tp, ms] = await Promise.all([
        repo.listTracks(), repo.listTopics(), repo.listMastery(),
      ])
      setTracks(tr)
      setTopics(tp)
      setMastery(ms)
    })()
  }, [])

  const axes: TrackScore[] = useMemo(() => {
    if (tracks.length === 0) return []
    const masteryByTopic = new Map(mastery.map(m => [m.topicId, m.score]))
    return tracks
      .map(t => {
        const trackTopics = topics.filter(tp => tp.trackId === t.id)
        if (trackTopics.length === 0) return null
        const sum = trackTopics.reduce((acc, tp) => acc + (masteryByTopic.get(tp.id) ?? 0), 0)
        const avg = sum / trackTopics.length // 0..1
        return { track: t, score: Math.round(avg * 100), count: trackTopics.length, totalTopics: trackTopics.length }
      })
      .filter((x): x is TrackScore => !!x)
      .sort((a, b) => a.track.order - b.track.order)
  }, [tracks, topics, mastery])

  const swatch = SWATCHES.find(s => s.id === swatchId) ?? SWATCHES[0]

  return (
    <div className="page">
      <Link to="/me" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
      }}>
        <ArrowLeft size={14} /> Back to /me
      </Link>
      <PageHeader
        eyebrow="Lab · experimental"
        title="Mastery radar"
        subtitle="Testing bright highlight colors against the greige canvas. One axis per track, value = average mastery across that track's topics. Pick a color to compare the feel."
      />

      <div className={s.swatchRow} role="radiogroup" aria-label="Highlight color">
        {SWATCHES.map(sw => {
          const active = sw.id === swatchId
          return (
            <button
              key={sw.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${s.swatch} ${active ? s.swatchOn : ''}`}
              onClick={() => setSwatchId(sw.id)}
              title={sw.label}
            >
              <span className={s.swatchDot} style={{ background: sw.base }} />
              <span className={s.swatchLabel}>{sw.label}</span>
            </button>
          )
        })}
      </div>

      <div
        className={s.chartWrap}
        style={{
          // Per-instance CSS vars so the SVG strokes/fills pull from the
          // active swatch without rerendering the SVG tree.
          ['--radar-line' as string]: swatch.base,
          ['--radar-glow' as string]: swatch.glow,
        }}
      >
        {axes.length === 0 ? (
          <div className={s.empty}>
            Radar is blank — no tracks with topics found. Seed the DB (start a quiz) to populate axes.
          </div>
        ) : (
          <>
            <Radar axes={axes} key={swatchId} />
            <ConfettiBurst key={`c-${swatchId}`} />
          </>
        )}
      </div>

      <p className={s.caption}>
        Keyed on swatch change so the draw-in animation replays when you pick a new color.
        Score = average mastery across all topics in the track (0 % if you haven't touched them).
        This page is sandboxed at <code>/labs/radar</code> — not linked from nav.
      </p>
    </div>
  )
}

// ------------------ Confetti burst (zero-dep) ------------------
// 60 rectangular "confetti" pieces launched outward from center with
// random angles, distances, spin, and delay. Each piece picks up the
// active swatch color via the same --radar-line CSS var. Reduced-motion
// hides the whole layer (see .module.css). Fires on mount / key change.
function ConfettiBurst() {
  const pieces = useMemo(() => {
    const count = 60
    return Array.from({ length: count }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2
      const distance = 140 + Math.random() * 180 // px
      const tx = Math.cos(angle) * distance
      const ty = Math.sin(angle) * distance * 0.9 + 40 // slight gravity drift
      const spin = (Math.random() * 720 - 360).toFixed(0)
      const delay = Math.floor(Math.random() * 160)
      const hueShift = (Math.random() * 20 - 10).toFixed(0) // subtle tonal variation
      return { i, tx, ty, spin, delay, hueShift }
    })
  }, [])
  return (
    <div className={s.confetti} aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.i}
          className={s.confettiPiece}
          style={{
            ['--tx' as string]: `${p.tx.toFixed(0)}px`,
            ['--ty' as string]: `${p.ty.toFixed(0)}px`,
            ['--spin' as string]: `${p.spin}deg`,
            ['--delay' as string]: `${p.delay}ms`,
            filter: `hue-rotate(${p.hueShift}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ------------------ SVG radar ------------------
function Radar({ axes }: { axes: TrackScore[] }) {
  const size = 480
  const cx = size / 2
  const cy = size / 2
  const r  = size / 2 - 80 // leave room for labels outside
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]
  const n = axes.length

  const vertex = (i: number, frac: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * r * frac, cy + Math.sin(a) * r * frac] as const
  }

  const poly = axes
    .map((ax, i) => vertex(i, Math.max(0.02, ax.score / 100)).join(','))
    .join(' ')

  // Label positions a touch beyond the outer ring
  const labelAt = (i: number) => vertex(i, 1.12)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={s.radarSvg} aria-label="Mastery radar">
      {/* Concentric grid */}
      {rings.map((rg, idx) => (
        <polygon
          key={idx}
          points={axes.map((_, i) => vertex(i, rg).join(',')).join(' ')}
          className={s.ring}
        />
      ))}

      {/* Spokes */}
      {axes.map((_, i) => {
        const [x, y] = vertex(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={s.spoke} />
      })}

      {/* Score polygon */}
      <polygon points={poly} className={s.scoreFill} />
      <polygon points={poly} className={s.scoreStroke} />

      {/* Vertex dots */}
      {axes.map((ax, i) => {
        const [x, y] = vertex(i, Math.max(0.02, ax.score / 100))
        return <circle key={i} cx={x} cy={y} r={4} className={s.dot} />
      })}

      {/* Axis labels */}
      {axes.map((ax, i) => {
        const [x, y] = labelAt(i)
        // text-anchor shifts so labels don't overlap spokes on the sides
        const a = (Math.PI * 2 * i) / n - Math.PI / 2
        const cos = Math.cos(a)
        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
        return (
          <g key={`l-${i}`}>
            <text x={x} y={y} className={s.axisLabel} textAnchor={anchor} dominantBaseline="middle">
              {ax.track.title}
            </text>
            <text x={x} y={y + 14} className={s.axisMeta} textAnchor={anchor} dominantBaseline="middle">
              {ax.score}% · {ax.count} topics
            </text>
          </g>
        )
      })}
    </svg>
  )
}
