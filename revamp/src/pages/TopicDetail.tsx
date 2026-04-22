import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, CircleCheckBig, HelpCircle, RotateCcw } from 'lucide-react'
import { repo } from '../db/repo'
import type { Lesson, Quiz, Topic, Progress } from '../db/types'
import { PageHeader, Section, Tile, TileTitle, TileMeta, TileRow, Chip, ProgressBar } from '../ui'
import { grid } from '../ui/grid'

export function TopicDetail() {
  const { topicId = '' } = useParams()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  const [mastery, setMastery] = useState(0)

  useEffect(() => {
    ;(async () => {
      const [t, ls, qs, allProg, mas] = await Promise.all([
        repo.getTopic(topicId),
        repo.listLessons(topicId),
        repo.listQuizzesByTopic(topicId),
        repo.listProgress(),
        repo.getMastery(topicId),
      ])
      setTopic(t ?? null)
      setLessons(ls)
      setQuizzes(qs)
      setProgress(Object.fromEntries(allProg.map(p => [p.id, p])))
      setMastery(mas?.score ?? 0)
    })()
  }, [topicId])

  if (!topic) return <div className="page" />

  return (
    <div className="page">
      <Link to="/learn" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
      }}>
        <ArrowLeft size={14} /> Back to Learn
      </Link>
      <PageHeader eyebrow="Topic" title={topic.title} subtitle={topic.summary} />

      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>
          <span>Mastery</span><span>{Math.round(mastery * 100)}%</span>
        </div>
        <ProgressBar value={mastery} />
        {(() => {
          const lessonsDone    = lessons.filter(l => !!progress[l.id]?.completedAt).length
          const quizzesPassed  = quizzes.filter(q => (progress[q.id]?.score ?? 0) >= 0.8).length
          const lessonsTotal   = lessons.length
          const quizzesTotal   = quizzes.length
          if (lessonsTotal === 0 && quizzesTotal === 0) return null
          const bits: string[] = []
          if (lessonsTotal > 0)  bits.push(`${lessonsDone}/${lessonsTotal} lessons done`)
          if (quizzesTotal > 0)  bits.push(`${quizzesPassed}/${quizzesTotal} quizzes passed`)
          return (
            <div style={{
              marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--ink-3)',
            }}>{bits.join(' · ')}</div>
          )
        })()}
      </div>

      <Section title="Lessons" meta={`${lessons.length} items`}>
        {lessons.length === 0 ? <TileMeta>No lessons yet.</TileMeta> : (
          <div className={grid}>
            {lessons.map(l => {
              const done = !!progress[l.id]?.completedAt
              return (
                <Link key={l.id} to={`/learn/lesson/${l.id}`} style={{ color: 'inherit' }}>
                  <Tile>
                    <TileRow>
                      <TileTitle>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <BookOpen size={15} strokeWidth={1.75} /> {l.title}
                        </span>
                      </TileTitle>
                      {done
                        ? <Chip variant="mastery"><CircleCheckBig size={12} /> Done</Chip>
                        : <ArrowRight size={16} />}
                    </TileRow>
                    <TileMeta>{l.summary}</TileMeta>
                    <TileRow>
                      <Chip>{l.minutes} min</Chip>
                    </TileRow>
                  </Tile>
                </Link>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Quizzes" meta={`${quizzes.length} items`}>
        {quizzes.length === 0 ? <TileMeta>No quizzes yet.</TileMeta> : (
          <div className={grid}>
            {quizzes.map(q => {
              const pr = progress[q.id]
              const score = pr?.score ?? 0
              const failed = !!pr && score < 0.8
              return (
                <Link key={q.id} to={`/learn/quiz/${q.id}`} style={{ color: 'inherit' }}>
                  <Tile>
                    <TileRow>
                      <TileTitle>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <HelpCircle size={15} strokeWidth={1.75} /> {q.title}
                        </span>
                      </TileTitle>
                      {pr
                        ? <Chip variant={score >= 0.8 ? 'mastery' : 'accent'}>
                            {Math.round(score * 100)}%
                          </Chip>
                        : <ArrowRight size={16} />}
                    </TileRow>
                    <TileRow>
                      <TileMeta>{q.questions.length} questions</TileMeta>
                      {failed && (
                        <Chip variant="accent">
                          <RotateCcw size={12} /> Retake
                        </Chip>
                      )}
                    </TileRow>
                  </Tile>
                </Link>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
