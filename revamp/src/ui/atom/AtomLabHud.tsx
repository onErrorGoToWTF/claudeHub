/*
 * AtomLabHud — fixed bottom 4-line diagnostic HUD for /labs/atom-* pages.
 *
 * Lines (LOCKED in atom-system-plan.md §"HUD contents"):
 *   1: build·{commit}  |  route·{path}  |  viewport·{w}×{h}  |  t·{HH:MM:SS}
 *   2: cfg·{compact serialization of every user-set parameter}
 *   3: math·{phase}·{stateName} t={t} |v|={vMag} {extra}
 *   4: evt·{newest first, 5-deep, t·{relSec}s {action}}
 *
 * Refresh discipline:
 *   - Line 1: 1s interval (timestamp ticks) + react re-render on route change
 *   - Line 2: re-renders when config prop identity changes
 *   - Line 3: 30Hz, written via direct DOM textContent on the line node — never
 *             through React state, to avoid useFrame back-pressure.
 *   - Line 4: re-renders when events prop changes
 *
 * Also:
 *   - Hidden <div data-atom-debug-context> in the DOM for screenshot/source-view
 *     debugging.
 *   - console.debug(...) every 1s with the full debug state, for laptop+phone
 *     remote-DevTools sessions.
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import s from './AtomLabHud.module.css'

export type AtomLabMathState = {
  phase: string
  stateName: string
  t: number
  vMag: number
  /** Optional extra space-prefixed metrics (e.g. "scale=1.04 r=0.93"). */
  extra?: string
}

export type AtomLabEvent = {
  /** Wall-clock ms (Date.now() or performance.now()) — relSec rendered against `now`. */
  ts: number
  action: string
}

export type AtomLabHudProps = {
  config: Record<string, unknown>
  mathRef: React.MutableRefObject<AtomLabMathState>
  events: AtomLabEvent[]
  /** Visual tone: "dark" (white text — default) or "light" (black text). */
  tone?: 'dark' | 'light'
}

const COMMIT: string = (import.meta.env.VITE_GIT_COMMIT as string | undefined) ?? 'dev-local'

function formatClock(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function compactConfig(cfg: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(cfg)) {
    if (v === undefined) continue
    let value: string
    if (v === null) value = 'null'
    else if (typeof v === 'number') value = Number.isInteger(v) ? String(v) : v.toFixed(3)
    else if (typeof v === 'string') value = v
    else if (typeof v === 'boolean') value = v ? 't' : 'f'
    else if (Array.isArray(v)) value = `[${v.length}]`
    else value = JSON.stringify(v)
    parts.push(`${k}=${value}`)
  }
  return parts.join(' ')
}

function formatMath(m: AtomLabMathState): string {
  const t = m.t.toFixed(3)
  const v = m.vMag.toFixed(2)
  const tail = m.extra ? ` ${m.extra}` : ''
  return `math·${m.phase}·${m.stateName} t=${t} |v|=${v}${tail}`
}

function formatEvents(events: AtomLabEvent[], now: number): string {
  if (events.length === 0) return 'evt·—'
  const recent = events.slice(0, 5)
  const lines = recent.map((e) => {
    const rel = ((now - e.ts) / 1000).toFixed(1)
    return `  t·${rel}s ${e.action}`
  })
  return `evt·\n${lines.join('\n')}`
}

function AtomLabHudImpl({ config, mathRef, events, tone = 'dark' }: AtomLabHudProps) {
  const location = useLocation()
  const mathLineRef = useRef<HTMLSpanElement>(null)
  const clockLineRef = useRef<HTMLSpanElement>(null)
  const evtLineRef = useRef<HTMLSpanElement>(null)
  const hiddenRef = useRef<HTMLDivElement>(null)

  const cfgString = useMemo(() => compactConfig(config), [config])

  // 30Hz math writer — direct DOM textContent, no React state.
  useEffect(() => {
    const node = mathLineRef.current
    if (!node) return
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < 33) return
      last = now
      node.textContent = formatMath(mathRef.current)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mathRef])

  // 1s clock + console.debug heartbeat + event-line relative-time refresh.
  useEffect(() => {
    const computeBase = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      return `build·${COMMIT}  |  route·${location.pathname}  |  viewport·${w}×${h}`
    }
    const writeClock = () => {
      const node = clockLineRef.current
      if (!node) return
      node.textContent = `${computeBase()}  |  t·${formatClock(new Date())}`
    }
    const writeEvtRel = () => {
      const node = evtLineRef.current
      if (!node) return
      node.textContent = formatEvents(events, Date.now())
    }
    const debugDump = () => {
      // eslint-disable-next-line no-console
      console.debug('[atom-lab]', {
        commit: COMMIT,
        route: location.pathname,
        config,
        math: { ...mathRef.current },
        events: events.slice(0, 10),
      })
      const node = hiddenRef.current
      if (node) {
        node.textContent = JSON.stringify({
          commit: COMMIT,
          route: location.pathname,
          config,
          math: { ...mathRef.current },
          events: events.slice(0, 10),
        })
      }
    }

    writeClock()
    writeEvtRel()
    debugDump()
    const id = window.setInterval(() => {
      writeClock()
      writeEvtRel()
      debugDump()
    }, 1000)
    return () => window.clearInterval(id)
  }, [config, events, location.pathname, mathRef])

  return (
    <>
      <div className={s.hud} data-tone={tone} aria-hidden="true">
        <span ref={clockLineRef} className={s.line}>
          {`build·${COMMIT}  |  route·${location.pathname}  |  viewport·…  |  t·…`}
        </span>
        <span className={s.line}>{`cfg·${cfgString}`}</span>
        <span ref={mathLineRef} className={s.line}>
          {formatMath(mathRef.current)}
        </span>
        <span ref={evtLineRef} className={s.evtList}>
          {formatEvents(events, Date.now())}
        </span>
      </div>
      <div ref={hiddenRef} className={s.hidden} data-atom-debug-context aria-hidden="true" />
    </>
  )
}

export const AtomLabHud = memo(AtomLabHudImpl)
