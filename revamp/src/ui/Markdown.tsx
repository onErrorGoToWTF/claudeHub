/**
 * Tiny markdown renderer — handles what the seed content uses:
 *   # / ## / ### headings, paragraphs, blank-line separation,
 *   - bullets, **bold**, inline `code`, and line breaks.
 * Enough for the v1 lesson view; swap for react-markdown if richer syntax appears.
 *
 * XSS posture (audited 2026-04-23):
 *   - Input is TRUSTED markdown (code-committed lessons + library notes).
 *   - Output is built from React elements; no raw HTML passthrough from input.
 *   - The one `dangerouslySetInnerHTML` lives in CodeBlock, fed by highlight.js
 *     which escapes input before tokenising. Safe as long as input stays a
 *     string and the library isn't replaced with one that doesn't escape.
 *   - External links use `rel="noreferrer noopener"` + `target="_blank"`.
 *   - If user-authored markdown is ever accepted (feedback comments, journal,
 *     user-authored lessons), add DOMPurify here and re-audit.
 */
import { useMemo, useState, type JSX } from 'react'
import { Check, Copy } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import bash       from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json       from 'highlight.js/lib/languages/json'
import css        from 'highlight.js/lib/languages/css'
import xml        from 'highlight.js/lib/languages/xml'
import python     from 'highlight.js/lib/languages/python'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('jsx', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)

/** Resolve an Obsidian-style wiki-link like `[[t.tokens]]` or
 *  `[[i.claude-code|Claude Code]]` to a local route + label.
 *  Convention: `t.*` → `/learn/topic/…`, `i.*`/`n.*` → `/library/…`.
 *  Pipe form overrides the label. Unknown IDs render as literal text. */
function resolveWikiLink(raw: string): { href: string; label: string } | null {
  const pipeIdx = raw.indexOf('|')
  const id    = (pipeIdx === -1 ? raw : raw.slice(0, pipeIdx)).trim()
  const label = (pipeIdx === -1 ? id  : raw.slice(pipeIdx + 1)).trim() || id
  if (id.startsWith('t.'))                          return { href: `/learn/topic/${id}`, label }
  if (id.startsWith('i.') || id.startsWith('n.'))   return { href: `/library/${id}`, label }
  return null
}

function inline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  // Wiki-links FIRST in the alternation so `[[...]]` matches before the
  // single-bracket link pattern `[label](url)`.
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const token = m[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={`b${i++}`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      parts.push(<code key={`c${i++}`}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('[[')) {
      // Wiki-link — internal route. Rendered as same-tab navigation.
      const inner = token.slice(2, -2)
      const resolved = resolveWikiLink(inner)
      if (resolved) {
        parts.push(
          <a key={`w${i++}`} href={resolved.href} data-wiki="true">{resolved.label}</a>
        )
      } else {
        parts.push(`[[${inner}]]`)
      }
    } else {
      // [label](url) — external link.
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!
      parts.push(
        <a key={`l${i++}`} href={mm[2]} target="_blank" rel="noreferrer noopener">{mm[1]}</a>
      )
    }
    last = regex.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: JSX.Element[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    // Fenced code block — preserve whitespace verbatim
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || undefined
      i++
      const codeLines: string[] = []
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      if (i < lines.length) i++ // skip closing fence
      out.push(<CodeBlock key={k++} lang={lang} code={codeLines.join('\n')} />)
      continue
    }
    if (line.startsWith('### ')) { out.push(<h3 key={k++}>{inline(line.slice(4))}</h3>); i++; continue }
    if (line.startsWith('## '))  { out.push(<h2 key={k++}>{inline(line.slice(3))}</h2>); i++; continue }
    if (line.startsWith('# '))   { out.push(<h1 key={k++}>{inline(line.slice(2))}</h1>); i++; continue }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) { items.push(lines[i].slice(2)); i++ }
      out.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>)
      continue
    }
    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) { quoteLines.push(lines[i].slice(2)); i++ }
      // Swallow the following attribution line (starts with em-dash) and
      // fold it into the title attribute — no separate rendered line.
      while (i < lines.length && !lines[i].trim()) i++
      let attribution: string | undefined
      if (i < lines.length && /^[——]/.test(lines[i].trim())) {
        attribution = lines[i].trim().replace(/^[——]\s*/, '')
        i++
      }
      out.push(
        <p key={k++} className="md-cite" title={attribution}>
          {quoteLines.map((t, j) => <span key={j}>{inline(t)}{j < quoteLines.length - 1 ? ' ' : ''}</span>)}
        </p>
      )
      continue
    }
    // paragraph: collect consecutive non-empty non-block lines
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^#|^- /.test(lines[i])) { para.push(lines[i]); i++ }
    out.push(<p key={k++}>{inline(para.join(' '))}</p>)
  }
  return <div className="md">{out}</div>
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)

  const html = useMemo(() => {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value } catch { /* fall through */ }
    }
    return hljs.highlightAuto(code).value
  }, [code, lang])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // Some contexts block clipboard; silent.
    }
  }
  return (
    <div className="md-code">
      <div className="md-code-head">
        <span className="md-code-lang">{lang ?? 'code'}</span>
        <button type="button" className="md-code-copy" onClick={copy} aria-label="Copy code">
          {copied ? <Check size={13} strokeWidth={2.2} /> : <Copy size={13} strokeWidth={1.8} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre data-lang={lang}>
        <code className={`hljs language-${lang ?? 'plain'}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}
