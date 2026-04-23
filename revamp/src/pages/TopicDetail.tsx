import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, CircleCheckBig, HelpCircle, RotateCcw, Lock } from 'lucide-react'
import { repo } from '../db/repo'
import type { Lesson, Quiz, Topic, Progress, LibraryItem } from '../db/types'
import { PageHeader, Section, Tile, TileTitle, TileMeta, TileRow, Chip, ProgressBar } from '../ui'
import { grid } from '../ui/grid'
import { PASS_THRESHOLD, MASTERY_THRESHOLD } from '../lib/mastery'

export function TopicDetail() {
  const { topicId = '' } = useParams()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  const [mastery, setMastery] = useState(0)
  const [related, setRelated] = useState<{
    topics: Topic[]; prereqs: Topic[]; library: LibraryItem[]
  }>({ topics: [], prereqs: [], library: [] })

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

      if (t) {
        const prereqIds = t.prereqTopicIds ?? []
        const relIds    = t.relatedTopicIds ?? []
        const relLibIds = t.relatedLibraryIds ?? []
        const allTopics = await repo.listTopics()
        const topicsById = new Map(allTopics.map(x => [x.id, x]))
        const library = await Promise.all(relLibIds.map(id => repo.getLibraryItem(id)))
        setRelated({
          topics: relIds.map(id => topicsById.get(id)).filter((x): x is Topic => !!x),
          prereqs: prereqIds.map(id => topicsById.get(id)).filter((x): x is Topic => !!x),
          library: library.filter((x): x is LibraryItem => !!x),
        })
      }
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

      {/* Tags row — quiet, under the header */}
      {topic.tags && topic.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-6)' }}>
          {topic.tags.map(tag => (
            <Link key={tag} to={`/library?tag=${encodeURIComponent(tag)}`} style={{ textDecoration: 'none' }}>
              <Chip>#{tag}</Chip>
            </Link>
          ))}
        </div>
      )}

      {/* Prerequisites — only if any */}
      {related.prereqs.length > 0 && (
        <Section title={<><Lock size={14} strokeWidth={1.75} /> Prerequisites</>} meta="Get these first for the smoothest path">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {related.prereqs.map(t => (
              <Link key={t.id} to={`/learn/topic/${t.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--hair)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--ink-1)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
              }}>
                <span><b>{t.title}</b> — <span style={{ color: 'var(--ink-3)' }}>{t.summary}</span></span>
                <ArrowRight size={14} strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        </Section>
      )}

      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>
          <span>Mastery</span><span>{Math.round(mastery * 100)}%</span>
        </div>
        <ProgressBar value={mastery} />
        {(() => {
          const lessonsDone    = lessons.filter(l => !!progress[l.id]?.completedAt).length
          const quizzesPassed  = quizzes.filter(q => (progress[q.id]?.score ?? 0) >= PASS_THRESHOLD).length
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
                        ? <Chip variant="mastery"><CircleCheckBig size={12} /> Completed</Chip>
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

      <Section title="Quizzes" meta={`${quizzes.length} items`} key="quizzes-section">
        {quizzes.length === 0 ? <TileMeta>No quizzes yet.</TileMeta> : (
          <div className={grid}>
            {quizzes.map(q => {
              const pr = progress[q.id]
              const score = pr?.score ?? 0
              const failed = !!pr && score < PASS_THRESHOLD
              const mastered = score >= MASTERY_THRESHOLD
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
                        ? <Chip variant={mastered ? 'mastery' : score >= PASS_THRESHOLD ? 'accent' : undefined}>
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

      {/* See also — symmetric related topics */}
      {related.topics.length > 0 && (
        <Section title="See also" meta="Topics that connect to this one">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {related.topics.map(t => (
              <Link key={t.id} to={`/learn/topic/${t.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--hair)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--ink-1)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
              }}>
                <span><b>{t.title}</b> — <span style={{ color: 'var(--ink-3)' }}>{t.summary}</span></span>
                <ArrowRight size={14} strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Further reading — linked library items */}
      {related.library.length > 0 && (
        <Section title="Further reading" meta="Library resources for this topic">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {related.library.map(item => (
              <Link key={item.id} to={`/library/${item.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--hair)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--ink-1)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
              }}>
                <span>
                  <Chip>{item.kind}</Chip>&nbsp;
                  <b>{item.title}</b>
                  {item.summary && <span style={{ color: 'var(--ink-3)' }}> — {item.summary}</span>}
                </span>
                <ArrowRight size={14} strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
