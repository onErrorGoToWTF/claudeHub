import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { repo } from '../db/repo'
import type { Quiz } from '../db/types'
import { Button, PageHeader, ProgressBar } from '../ui'
import { PASS_THRESHOLD, MASTERY_LABEL, masteryStatus } from '../lib/mastery'
import styles from './QuizView.module.css'

type Phase = 'answering' | 'done'

export function QuizView() {
  const { quizId = '' } = useParams()
  const [quiz, setQuiz] = useState<Quiz | null | undefined>(undefined)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('answering')
  const [correct, setCorrect] = useState(0)

  useEffect(() => { repo.getQuiz(quizId).then(q => setQuiz(q ?? null)) }, [quizId])

  const q = quiz?.questions[i]
  const total = quiz?.questions.length ?? 0
  const progress = useMemo(() => (total === 0 ? 0 : (phase === 'done' ? 1 : i / total)), [i, total, phase])

  // Keyboard: 1-9 pick, Enter advance
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || phase !== 'answering') return
      const n = parseInt(e.key, 10)
      if (!isNaN(n) && n >= 1 && n <= q.choices.length) setPicked(n - 1)
      else if ((e.key === 'Enter' || e.key === ' ') && picked !== null) {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, phase, i, correct, picked])

  if (quiz === undefined) return <div className="page" />
  if (quiz === null) {
    return (
      <div className="page">
        <Link to="/learn" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
        }}>
          <ArrowLeft size={14} /> Back to Learn
        </Link>
        <PageHeader eyebrow="Quiz" title="Quiz not found" subtitle="This quiz may have been removed or the link is out of date." />
      </div>
    )
  }
  if (quiz.questions.length === 0) {
    return (
      <div className="page">
        <Link to={`/learn/topic/${quiz.topicId}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
        }}>
          <ArrowLeft size={14} /> Back to topic
        </Link>
        <PageHeader eyebrow="Quiz" title={quiz.title} subtitle="Quiz unavailable at this time — no questions yet. Check back later." />
      </div>
    )
  }
  if (!q) return <div className="page" />

  function select(idx: number) {
    if (phase !== 'answering') return
    setPicked(idx)
  }

  async function advance() {
    if (phase !== 'answering' || picked === null || !quiz) return
    const wasCorrect = picked === q!.answerIdx
    const nextCorrect = correct + (wasCorrect ? 1 : 0)
    if (i + 1 >= quiz.questions.length) {
      const score = nextCorrect / quiz.questions.length
      await repo.recordQuiz(quiz.id, quiz.topicId, score)
      setCorrect(nextCorrect)
      setPhase('done')
    } else {
      setCorrect(nextCorrect)
      setI(x => x + 1)
      setPicked(null)
    }
  }

  if (phase === 'done') {
    const score = correct / quiz.questions.length
    const pct = Math.round(score * 100)
    const passed = score >= PASS_THRESHOLD
    return (
      <div className="page">
        <PageHeader eyebrow="Quiz complete" title={passed ? 'Nicely done.' : 'Not quite — try again soon.'} />
        <div className={styles.resultCard}>
          <div className={styles.resultScore}>{pct}<span>%</span></div>
          <div className={styles.resultSub}>
            {correct} of {quiz.questions.length} correct
          </div>
          <ProgressBar value={score} />
          <div className={styles.resultActions}>
            <Link to={`/learn/topic/${quiz.topicId}`}>
              <Button variant="primary">Back to topic</Button>
            </Link>
          </div>
          {passed && (
            <div className={styles.masteryPing}>
              <Sparkles size={14} /> {MASTERY_LABEL[masteryStatus(score)]}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to={`/learn/topic/${quiz.topicId}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
      }}>
        <ArrowLeft size={14} /> Back to topic
      </Link>

      <PageHeader eyebrow={`Question ${i + 1} of ${total}`} title={quiz.title} />

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <ProgressBar value={progress} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          className={styles.card}
        >
          <div className={styles.prompt}>{q.prompt}</div>

          <div className={styles.choices} role="radiogroup">
            {q.choices.map((c, idx) => {
              const isPicked = picked === idx
              const state = isPicked ? 'picked' : 'idle'
              return (
                <button
                  key={idx}
                  type="button"
                  role="radio"
                  aria-checked={isPicked}
                  className={`${styles.choice} ${state !== 'idle' ? styles[`state_${state}`] : ''}`}
                  data-tappable="true"
                  onClick={() => select(idx)}
                >
                  <span className={styles.dot} aria-hidden>
                    {isPicked && <span className={styles.dotInner} />}
                  </span>
                  <span className={styles.choiceLabel}>{c}</span>
                </button>
              )
            })}
          </div>

          <div className={styles.footer}>
            <span className={styles.footerHint}>
              {picked === null ? 'Select an answer' : 'Change your mind, or continue'}
            </span>
            <button className={styles.secondaryBtn} onClick={advance} disabled={picked === null}>
              {i + 1 < total ? 'Next' : 'Finish'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
