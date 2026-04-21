/**
 * Tiny markdown renderer — handles what the seed content uses:
 *   # / ## / ### headings, paragraphs, blank-line separation,
 *   - bullets, **bold**, inline `code`, and line breaks.
 * Enough for the v1 lesson view; swap for react-markdown if richer syntax appears.
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

function inline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
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
    } else {
      // [label](url)
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!
      parts.push(
        <a key={`l${i++}`} href={mm[2]} target="_blank" rel="noreferrer">{mm[1]}</a>
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
      out.push(
        <blockquote key={k++}>
          {quoteLines.map((t, j) => <p key={j}>{inline(t)}</p>)}
        </blockquote>
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
