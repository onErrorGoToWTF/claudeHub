/**
 * Tiny markdown renderer — handles what the seed content uses:
 *   # / ## / ### headings, paragraphs, blank-line separation,
 *   - bullets, **bold**, inline `code`, and line breaks.
 * Enough for the v1 lesson view; swap for react-markdown if richer syntax appears.
 */
import type { JSX } from 'react'

function inline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const token = m[0]
    if (token.startsWith('**')) parts.push(<strong key={`b${i++}`}>{token.slice(2, -2)}</strong>)
    else parts.push(<code key={`c${i++}`}>{token.slice(1, -1)}</code>)
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
    if (line.startsWith('### ')) { out.push(<h3 key={k++}>{inline(line.slice(4))}</h3>); i++; continue }
    if (line.startsWith('## '))  { out.push(<h2 key={k++}>{inline(line.slice(3))}</h2>); i++; continue }
    if (line.startsWith('# '))   { out.push(<h1 key={k++}>{inline(line.slice(2))}</h1>); i++; continue }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) { items.push(lines[i].slice(2)); i++ }
      out.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>)
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
