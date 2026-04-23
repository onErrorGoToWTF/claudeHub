import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleCheckBig, HelpCircle } from 'lucide-react'
import { repo } from '../db/repo'
import type { Lesson, Quiz, Progress } from '../db/types'
import { Button, Chip, PageHeader } from '../ui'
import { Markdown } from '../ui/Markdown'
import { useUserStore } from '../state/userStore'
import styles from './LessonView.module.css'

export function LessonView() {
  const { lessonId = '' } = useParams()
  const nav = useNavigate()
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [topicQuiz, setTopicQuiz] = useState<Quiz | null>(null)
  const [showAddPrompt, setShowAddPrompt] = useState(false)
  const [topicTitle, setTopicTitle] = useState('')
  const dismissAddPrompt  = useUserStore(s => s.dismissAddPrompt)
  const dismissedTopicIds = useUserStore(s => s.promptDismissedTopicIds)

  useEffect(() => {
    ;(async () => {
      const l = await repo.getLesson(lessonId)
      if (!l) { setLesson(null); return }
      setLesson(l)
      const [p, qs, pathwayItems, topic] = await Promise.all([
        repo.getProgress(l.id),
        repo.listQuizzesByTopic(l.topicId),
        repo.listPathwayItems(),
        repo.getTopic(l.topicId),
      ])
      setProgress(p ?? null)
      setTopicQuiz(qs[0] ?? null)
      setTopicTitle(topic?.title ?? '')

      // Engagement prompt: ask once per topic, only if topic isn't already
      // active in the pathway AND the user hasn't declined before. A yes-
      // answer adds the topic, so this won't fire again.
      const inPathway = pathwayItems.some(r => r.topicId === l.topicId && r.status === 'active')
      const dismissed = (dismissedTopicIds ?? []).includes(l.topicId)
      if (!inPathway && !dismissed) setShowAddPrompt(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  async function acceptAddPrompt() {
    if (!lesson) return
    await repo.addPathwayItem(lesson.topicId, 'manual')
    setShowAddPrompt(false)
  }
  function declineAddPrompt() {
    if (!lesson) return
    dismissAddPrompt(lesson.topicId)
    setShowAddPrompt(false)
  }

  if (lesson === undefined) return <div className="page" />
  if (lesson === null) {
    return (
      <div className="page">
        <Link to="/learn" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
        }}>
          <ArrowLeft size={14} /> Back to Learn
        </Link>
        <PageHeader eyebrow="Lesson" title="Lesson not found" subtitle="This lesson may have been removed or the link is out of date." />
      </div>
    )
  }

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
        right={done ? <Chip variant="mastery"><CircleCheckBig size={12} /> Completed</Chip> : undefined}
      />

      {showAddPrompt && (
        <div className={styles.addPrompt} role="dialog" aria-label="Add to plan">
          <div className={styles.addPromptBody}>
            <span className={styles.addPromptText}>
              Add <b>{topicTitle}</b> to your plan? It'll show up on /me and in your report card.
            </span>
            <span className={styles.addPromptActions}>
              <button className={styles.addPromptNo}  onClick={declineAddPrompt}>Not now</button>
              <button className={styles.addPromptYes} onClick={acceptAddPrompt}>Add to plan</button>
            </span>
          </div>
        </div>
      )}

      <article className={styles.article}>
        <Markdown text={lesson.body} />
      </article>

      {/* Practice what we teach: every lesson models the hallucination-
          awareness rule by explicitly disclosing AI-assisted authoring
          and pointing back to sources for verification. */}
      <aside className={styles.authorNote} role="note">
        <b>AI-assisted authoring.</b> Lessons are drafted with Claude and
        reviewed, not hand-written from scratch. Specifics (numbers,
        names, citations, API shapes) can drift — verify anything you're
        going to act on against the <b>Sources</b> section inline or the
        "Further reading" links on the topic page.
      </aside>

      <div className={styles.footer}>
        {!done && <Button variant="primary" onClick={markDone}>Mark as done</Button>}
        {topicQuiz && (
          <Button variant={done ? 'primary' : 'default'} onClick={() => nav(`/learn/quiz/${topicQuiz.id}`)}>
            <HelpCircle size={15} /> Take the quiz
          </Button>
        )}
      </div>

      {lesson.updatedAt && (
        <p style={{
          marginTop: 'var(--space-8)',
          fontSize: 11,
          color: 'var(--ink-3)',
          textAlign: 'center',
        }}>
          Last updated {new Date(lesson.updatedAt).toISOString().slice(0, 10)}
        </p>
      )}
    </div>
  )
}
