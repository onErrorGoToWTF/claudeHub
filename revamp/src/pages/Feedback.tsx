import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { repo } from '../db/repo'
import type { FeedbackKind } from '../db/types'
import { Button, PageHeader } from '../ui'

const KINDS: { id: FeedbackKind; label: string; blurb: string }[] = [
  { id: 'bug',           label: 'Bug',            blurb: 'Something is broken or behaves unexpectedly.' },
  { id: 'idea',          label: 'Idea',           blurb: 'A feature or improvement you\'d like to see.' },
  { id: 'content-issue', label: 'Content issue',  blurb: 'A lesson / library item that\'s wrong, stale, or missing.' },
  { id: 'other',         label: 'Other',          blurb: 'Anything else.' },
]

export function Feedback() {
  const nav = useNavigate()
  const [kind, setKind] = useState<FeedbackKind>('idea')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy || message.trim().length < 3) return
    setBusy(true)
    try {
      await repo.logFeedback({ kind, message, path: document.referrer || undefined })
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="page">
        <PageHeader eyebrow="Feedback" title="Thanks — logged." subtitle="Feedback is stored locally today; once accounts land it'll route to the maintainer's review queue." />
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => nav('/')}>Back to Dashboard</Button>
          <Button onClick={() => { setSent(false); setMessage(''); setKind('idea') }}>Send another</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 'var(--text-sm)', color: 'var(--ink-3)', marginBottom: 'var(--space-4)',
      }}>
        <ArrowLeft size={14} /> Back
      </Link>
      <PageHeader
        eyebrow="Feedback"
        title="Send feedback"
        subtitle="Bug, idea, content issue, or anything else. Local for now; will route to review once accounts land."
      />

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <label style={labelStyle}>Kind</label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-2)',
        }}>
          {KINDS.map(k => {
            const on = kind === k.id
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: on ? 'var(--accent-surface)' : 'var(--bg-card)',
                  border: `1px solid ${on ? 'var(--accent-border)' : 'var(--hair)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  fontSize: 'var(--text-md)',
                  fontWeight: 600,
                  color: on ? 'var(--accent-ink)' : 'var(--ink-1)',
                  marginBottom: 2,
                }}>{k.label}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>{k.blurb}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <label htmlFor="feedback-message" style={labelStyle}>Message</label>
        <textarea
          id="feedback-message"
          autoFocus
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What happened, what you expected, any detail that helps…"
          rows={6}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--hair)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--ink-1)',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </section>

      <Button variant="primary" onClick={submit} disabled={busy || message.trim().length < 3}>
        Send
      </Button>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-3)',
}
