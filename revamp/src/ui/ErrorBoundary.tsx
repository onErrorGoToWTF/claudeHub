import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Catches render errors anywhere below; shows a quiet fallback instead of
 *  white-screening the whole app. Logs the error so there's something to
 *  grep in the browser console. Future: report to Sentry / equivalent. */
interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep in console for now — wire to an error-reporting service when one
    // is chosen. Intentional `console.error` so it's visible without a debug
    // flag.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div style={{
        maxWidth: 640,
        margin: '20vh auto',
        padding: '32px 28px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 12,
        }}>Something broke</div>
        <h1 style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 600,
          color: 'var(--ink-1)',
          marginBottom: 8,
        }}>
          A page crashed, not the app.
        </h1>
        <p style={{ color: 'var(--ink-2)', marginBottom: 24 }}>
          Refresh to try again. If it keeps happening on the same page, it's a
          real bug — use the footer Colophon for a context, or just reload.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 18px',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'white',
            background: 'var(--accent-solid)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
        {import.meta.env.DEV && (
          <pre style={{
            marginTop: 24,
            padding: 12,
            textAlign: 'left',
            background: 'var(--bg-sunken)',
            border: '1px solid var(--hair)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 11,
            color: 'var(--ink-3)',
            overflow: 'auto',
            maxHeight: 240,
          }}>
            {error.stack ?? error.message}
          </pre>
        )}
      </div>
    )
  }
}
