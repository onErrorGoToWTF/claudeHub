import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowDown, ArrowUp, Flag, Sparkles } from 'lucide-react'
import { repo } from '../db/repo'
import type {
  Quiz,
  QuizQuestion,
  QuizReportKind,
  OrderedStepsQuestion,
  CodeTypingQuestion,
  ShortAnswerQuestion,
  MCQQuestion,
} from '../db/types'
import { Button, PageHeader, ProgressBar } from '../ui'
import { PASS_THRESHOLD, MASTERY_LABEL, masteryStatus } from '../lib/mastery'
import { gradeQuestion, isAnswerable, questionKind } from '../lib/quizGrading'
import styles from './QuizView.module.css'

type Phase = 'answering' | 'done'

/** Shuffle an array deterministically-ish (Fisher–Yates with Math.random). */
function shuffled<T>(arr: T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Initial draft answer for a question (shape depends on kind). */
function initialAnswer(q: QuizQuestion): unknown {
  const kind = questionKind(q)
  if (kind === 'mcq') return null
  if (kind === 'ordered-steps') {
    const os = q as OrderedStepsQuestion
    // Present steps in a shuffled order; don't accidentally hand the user the answer.
    const indices = os.steps.map((_, i) => i)
    let next = shuffled(indices)
    // Guard: if by chance we shuffled into the correct order, swap the first two.
    if (next.length >= 2 && next.every((v, i) => v === os.correctOrder[i])) {
      ;[next[0], next[1]] = [next[1], next[0]]
    }
    return next
  }
  if (kind === 'code-typing') return ''
  if (kind === 'short-answer') return ''
  return null
}

export function QuizView() {
  const { quizId = '' } = useParams()
  const [quiz, setQuiz] = useState<Quiz | null | undefined>(undefined)
  const [i, setI] = useState(0)
  const [answer, setAnswer] = useState<unknown>(null)
  const [phase, setPhase] = useState<Phase>('answering')
  const [correct, setCorrect] = useState(0)

  useEffect(() => { repo.getQuiz(quizId).then(q => setQuiz(q ?? null)) }, [quizId])

  const q = quiz?.questions[i]
  const total = quiz?.questions.length ?? 0
  const progress = useMemo(
    () => (total === 0 ? 0 : (phase === 'done' ? 1 : i / total)),
    [i, total, phase],
  )

  // Reset the draft answer whenever the current question changes.
  useEffect(() => {
    if (q) setAnswer(initialAnswer(q))
  }, [q])

  const answerable = q ? isAnswerable(q, answer) : false

  // Keyboard: Enter advances when answerable. 1–9 picks MCQ choice.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || phase !== 'answering') return
      // Don't hijack typing inside inputs/textareas.
      const tgt = e.target as HTMLElement | null
      const typing = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)

      const kind = questionKind(q)
      if (kind === 'mcq' && !typing) {
        const n = parseInt(e.key, 10)
        if (!isNaN(n) && n >= 1 && n <= (q as MCQQuestion).choices.length) {
          setAnswer(n - 1)
          return
        }
      }
      if (e.key === 'Enter' && !typing && answerable) {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, phase, answerable, answer])

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

  async function advance() {
    if (phase !== 'answering' || !quiz || !q) return
    if (!isAnswerable(q, answer)) return
    const wasCorrect = gradeQuestion(q, answer)
    const nextCorrect = correct + (wasCorrect ? 1 : 0)
    if (i + 1 >= quiz.questions.length) {
      const score = nextCorrect / quiz.questions.length
      await repo.recordQuiz(quiz.id, quiz.topicId, score)
      setCorrect(nextCorrect)
      setPhase('done')
    } else {
      setCorrect(nextCorrect)
      setI(x => x + 1)
    }
  }

  if (phase === 'done') {
    const score = correct / quiz.questions.length
    const pct = Math.round(score * 100)
    const passed = score >= PASS_THRESHOLD
    return (
      <div className="page">
        <PageHeader eyebrow="Quiz complete" title={passed ? 'Nicely done.' : 'Not quite — try again soon.'} />
        <div className={styles.resultCard} role="status" aria-live="polite">
          <div className={styles.resultScore}>
            <CountUp to={pct} />
            <span>%</span>
          </div>
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
        <div className={styles.reportRow}>
          <ReportFlag quizId={quiz.id} />
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

          <QuestionBody q={q} answer={answer} onChange={setAnswer} />

          <div className={styles.footer}>
            <span className={styles.footerHint}>{hintFor(q, answerable)}</span>
            <button className={styles.secondaryBtn} onClick={advance} disabled={!answerable}>
              {i + 1 < total ? 'Next' : 'Finish'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Report flag lives OUTSIDE the card so its tap target can't overlap
          the Next/Finish button. Separated by a margin; left-aligned so it
          sits opposite (and not stacked under) the right-aligned footer. */}
      <div className={styles.reportRow}>
        <ReportFlag quizId={quiz.id} questionId={q.id} />
      </div>
    </div>
  )
}

function hintFor(q: QuizQuestion, answerable: boolean): string {
  const kind = questionKind(q)
  if (!answerable) {
    if (kind === 'mcq') return 'Select an answer'
    if (kind === 'ordered-steps') return 'Arrange the steps'
    if (kind === 'code-typing') return 'Type your answer'
    if (kind === 'short-answer') return 'Type your answer'
  }
  return 'Change your mind, or continue'
}

function QuestionBody({
  q, answer, onChange,
}: { q: QuizQuestion; answer: unknown; onChange: (next: unknown) => void }) {
  const kind = questionKind(q)
  if (kind === 'mcq') return <MCQBody q={q as MCQQuestion} picked={typeof answer === 'number' ? answer : null} onPick={onChange} />
  if (kind === 'ordered-steps') return <OrderedStepsBody q={q as OrderedStepsQuestion} order={Array.isArray(answer) ? (answer as number[]) : []} onChange={(ord) => onChange(ord)} />
  if (kind === 'code-typing') return <CodeTypingBody q={q as CodeTypingQuestion} value={typeof answer === 'string' ? answer : ''} onChange={(v) => onChange(v)} />
  if (kind === 'short-answer') return <ShortAnswerBody q={q as ShortAnswerQuestion} value={typeof answer === 'string' ? answer : ''} onChange={(v) => onChange(v)} />
  return null
}

// ---------- MCQ ----------
function MCQBody({ q, picked, onPick }: { q: MCQQuestion; picked: number | null; onPick: (idx: number) => void }) {
  return (
    <div className={styles.choices} role="radiogroup">
      {q.choices.map((c, idx) => {
        const isPicked = picked === idx
        return (
          <button
            key={idx}
            type="button"
            role="radio"
            aria-checked={isPicked}
            className={`${styles.choice} ${isPicked ? styles.state_picked : ''}`}
            data-tappable="true"
            onClick={() => onPick(idx)}
          >
            <span className={styles.dot} aria-hidden>
              {isPicked && <span className={styles.dotInner} />}
            </span>
            <span className={styles.choiceLabel}>{c}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------- Ordered steps ----------
function OrderedStepsBody({
  q, order, onChange,
}: { q: OrderedStepsQuestion; order: number[]; onChange: (next: number[]) => void }) {
  const listRef = useRef<HTMLOListElement | null>(null)

  function move(fromPos: number, delta: number) {
    const toPos = fromPos + delta
    if (toPos < 0 || toPos >= order.length) return
    const next = order.slice()
    ;[next[fromPos], next[toPos]] = [next[toPos], next[fromPos]]
    onChange(next)
    // Preserve focus on the moved row.
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-step-pos="${toPos}"]`)
      el?.focus()
    })
  }

  return (
    <ol ref={listRef} className={styles.stepsList} aria-label="Ordered steps — use Up/Down arrows on a step to reorder">
      {order.map((stepIdx, pos) => {
        const text = q.steps[stepIdx]
        return (
          <li key={stepIdx} className={styles.stepRow}>
            <span className={styles.stepIndex} aria-hidden>{pos + 1}</span>
            <span
              className={styles.stepText}
              tabIndex={0}
              role="button"
              aria-label={`Step ${pos + 1} of ${order.length}: ${text}. Press Up or Down to reorder.`}
              data-step-pos={pos}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') { e.preventDefault(); move(pos, -1) }
                else if (e.key === 'ArrowDown') { e.preventDefault(); move(pos, +1) }
              }}
            >
              {text}
            </span>
            <span className={styles.stepControls}>
              <button
                type="button"
                className={styles.stepBtn}
                aria-label={`Move step ${pos + 1} up`}
                onClick={() => move(pos, -1)}
                disabled={pos === 0}
              >
                <ArrowUp size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={styles.stepBtn}
                aria-label={`Move step ${pos + 1} down`}
                onClick={() => move(pos, +1)}
                disabled={pos === order.length - 1}
              >
                <ArrowDown size={16} strokeWidth={2} />
              </button>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// ---------- Code typing ----------
function CodeTypingBody({
  q, value, onChange,
}: { q: CodeTypingQuestion; value: string; onChange: (v: string) => void }) {
  const parts = q.code.split('{{blank}}')
  const before = parts[0] ?? ''
  const after = parts.slice(1).join('{{blank}}')
  return (
    <div className={styles.codeBlock}>
      <pre className={styles.codePre}>
        <code>
          {before}
          <input
            className={styles.codeInput}
            type="text"
            value={value}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Fill in the blank"
            placeholder="…"
            onChange={(e) => onChange(e.target.value)}
          />
          {after}
        </code>
      </pre>
    </div>
  )
}

/** Quiet number tick from 0 to the final value on mount. ~750ms ease-out.
 *  Reduced-motion clients get the final number immediately. Single motion;
 *  no looping, no restart on re-render. */
function CountUp({ to, duration = 750 }: { to: number; duration?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') { setN(to); return }
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced || to === 0) { setN(to); return }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setN(Math.round(eased * to))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <>{n}</>
}

// ---------- Report flag (Khan-style quiet "report a problem") ----------
/** A tiny flag in the corner of the question / result card. Click →
 *  inline canned-reason form → submit → "Thanks, logged" fade. Purpose-
 *  built to be easy to ignore until you want it. */
function ReportFlag({ quizId, questionId }: { quizId: string; questionId?: string }) {
  type View = 'idle' | 'form' | 'thanks'
  const [view, setView] = useState<View>('idle')
  const [kind, setKind] = useState<QuizReportKind>('incorrect')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy) return
    setBusy(true)
    try {
      await repo.logQuizReport({ quizId, questionId, kind, note: note.trim() })
      setView('thanks')
      setTimeout(() => {
        setView('idle'); setNote(''); setKind('incorrect')
      }, 1800)
    } finally { setBusy(false) }
  }

  if (view === 'thanks') {
    return <div className={styles.reportThanks}>Thanks — logged.</div>
  }

  if (view === 'form') {
    return (
      <div className={styles.reportForm} onClick={(e) => e.stopPropagation()}>
        <div className={styles.reportKinds}>
          {([
            ['incorrect', 'Wrong answer'],
            ['unclear',   'Unclear wording'],
            ['typo',      'Typo'],
            ['other',     'Other'],
          ] as [QuizReportKind, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`${styles.reportKindBtn} ${kind === k ? styles.reportKindBtnOn : ''}`}
              onClick={() => setKind(k)}
            >{label}</button>
          ))}
        </div>
        <textarea
          className={styles.reportNote}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional detail (what's wrong, what you expected)…"
          rows={2}
        />
        <div className={styles.reportActions}>
          <button className={styles.reportCancel} onClick={() => setView('idle')}>Cancel</button>
          <button className={styles.reportSend} onClick={submit} disabled={busy}>Send</button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={styles.reportFlag}
      aria-label="Report a problem with this question"
      title="Report a problem"
      onClick={() => setView('form')}
    >
      <Flag size={14} strokeWidth={2} />
      <span className={styles.reportFlagLabel}>Report</span>
    </button>
  )
}

// ---------- Short answer ----------
function ShortAnswerBody({
  q, value, onChange,
}: { q: ShortAnswerQuestion; value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.shortWrap}>
      <input
        className={styles.shortInput}
        type="text"
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={q.placeholder ?? 'Your answer'}
        aria-label="Short answer"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
