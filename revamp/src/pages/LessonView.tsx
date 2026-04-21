import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleCheckBig, HelpCircle } from 'lucide-react'
import { repo } from '../db/repo'
import type { Lesson, Quiz, Progress } from '../db/types'
import { Button, Chip, PageHeader } from '../ui'
import { Markdown } from '../ui/Markdown'
import styles from './LessonView.module.css'

export function LessonView() {
  const { lessonId = '' } = useParams()
  const nav = useNavigate()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [topicQuiz, setTopicQuiz] = useState<Quiz | null>(null)

  useEffect(() => {
    ;(async () => {
      const l = await repo.getLesson(lessonId)
      if (!l) return
      setLesson(l)
      const [p, qs] = await Promise.all([
        repo.getProgress(l.id),
        repo.listQuizzesByTopic(l.topicId),
      ])
      setProgress(p ?? null)
      setTopicQuiz(qs[0] ?? null)
    })()
  }, [lessonId])

  if (!lesson) return <div className="page" />

  const done = !!progress?.completedAt

  async function markDone() {
    if (!lesson) return
    await repo.markLessonComplete(lesson.id, lesson.topicId)
    const p = await repo.getProgress(lesson.id)
    setProgress(p ?? null)
  }

  return (
    <div className="page">
      <Link to={`/learn/topic/${lesson.topicId}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
      }}>
        <ArrowLeft size={14} /> Back to topic
      </Link>

      <PageHeader
        eyebrow={`Lesson · ${lesson.minutes} min`}
        title={lesson.title}
        subtitle={lesson.summary}
        right={done ? <Chip variant="mastery"><CircleCheckBig size={12} /> Complete</Chip> : undefined}
      />

      <article className={styles.article}>
        <Markdown text={lesson.body} />
      </article>

      <div className={styles.footer}>
        {!done && <Button variant="primary" onClick={markDone}>Mark as done</Button>}
        {topicQuiz && (
          <Button variant={done ? 'primary' : 'default'} onClick={() => nav(`/learn/quiz/${topicQuiz.id}`)}>
            <HelpCircle size={15} /> Take the quiz
          </Button>
        )}
      </div>
    </div>
  )
}
