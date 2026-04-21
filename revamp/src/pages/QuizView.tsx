import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, X, Sparkles } from 'lucide-react'
import { repo } from '../db/repo'
import type { Quiz } from '../db/types'
import { Button, PageHeader, ProgressBar } from '../ui'
import styles from './QuizView.module.css'

type Phase = 'answering' | 'feedback' | 'done'

export function QuizView() {
  const { quizId = '' } = useParams()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('answering')
  const [correct, setCorrect] = useState(0)

  useEffect(() => { repo.getQuiz(quizId).then(q => setQuiz(q ?? null)) }, [quizId])

  const q = quiz?.questions[i]
  const total = quiz?.questions.length ?? 0
  const progress = useMemo(() => (total === 0 ? 0 : (phase === 'done' ? 1 : i / total)), [i, total, phase])

  // Keyboard: 1-9 pick (no lock), Enter submit / advance
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q) return
      if (phase === 'answering') {
        const n = parseInt(e.key, 10)
        if (!isNaN(n) && n >= 1 && n <= q.choices.length) setPicked(n - 1)
        else if ((e.key === 'Enter' || e.key === ' ') && picked !== null) {
          e.preventDefault()
          submit()
        }
      } else if (phase === 'feedback' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, phase, i, correct, picked])

  if (!quiz || !q) return <div className="page" />

  function select(idx: number) {
    if (phase !== 'answering') return
    setPicked(idx)
  }

  function submit() {
    if (phase !== 'answering' || picked === null) return
    setPhase('feedback')
    if (picked === q!.answerIdx) setCorrect(c => c + 1)
  }

  async function next() {
    if (!quiz) return
    if (i + 1 >= quiz.questions.length) {
      const score = correct / quiz.questions.length
      await repo.recordQuiz(quiz.id, quiz.topicId, score)
      setPhase('done')
    } else {
      setI(x => x + 1)
      setPicked(null)
      setPhase('answering')
    }
  }

  if (phase === 'done') {
    const score = correct / quiz.questions.length
    const pct = Math.round(score * 100)
    const passed = score >= 0.8
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
              <Sparkles size={14} /> Mastery updated
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
          key={i + ':' + phase}
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
              const isAnswer = idx === q.answerIdx
              const state =
                phase === 'answering'
                  ? (isPicked ? 'picked' : 'idle')
                  : isPicked && isAnswer ? 'correct'
                  : isPicked ? 'wrong'
                  : isAnswer ? 'reveal'
                  : 'dim'
              return (
                <button
                  key={idx}
                  type="button"
                  role="radio"
                  aria-checked={isPicked}
                  className={`${styles.choice} ${state !== 'idle' ? styles[`state_${state}`] : ''}`}
                  data-tappable="true"
                  onClick={() => select(idx)}
                  disabled={phase !== 'answering'}
                >
                  <span className={styles.dot} aria-hidden>
                    {state === 'picked'  && <span className={styles.dotInner} />}
                    {state === 'correct' && <Check size={13} strokeWidth={2.5} />}
                    {state === 'wrong'   && <X size={13} strokeWidth={2.5} />}
                    {state === 'reveal'  && <Check size={13} strokeWidth={2} />}
                  </span>
                  <span className={styles.choiceLabel}>{c}</span>
                </button>
              )
            })}
          </div>

          {phase === 'feedback' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={styles.explain}
            >
              {q.explain}
            </motion.div>
          )}

          <div className={styles.footer}>
            <span className={styles.footerHint}>
              {phase === 'answering'
                ? (picked === null ? 'Select an answer' : 'Change your mind, or submit')
                : 'Press Enter to continue'}
            </span>
            {phase === 'answering' && (
              <button className={styles.secondaryBtn} onClick={submit} disabled={picked === null}>
                Submit
              </button>
            )}
            {phase === 'feedback' && (
              <button className={styles.secondaryBtn} onClick={next}>
                {i + 1 < total ? 'Next question' : 'See results'}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
