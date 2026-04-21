import { db } from './schema'
import type {
  Track, Topic, Lesson, Quiz, LibraryItem, Project,
} from './types'

const tracks: Track[] = [
  { id: 'foundations', order: 1, title: 'AI Foundations',
    summary: 'How modern AI models work, from tokens to transformers.' },
  { id: 'prompt-eng', order: 2, title: 'Prompt Engineering',
    summary: 'Get precise, reliable output from any frontier model.' },
  { id: 'agents',     order: 3, title: 'Agents & Tool Use',
    summary: 'Give models hands: tool calls, memory, autonomous loops.' },
  { id: 'frontend-ai', order: 4, title: 'AI Frontend',
    summary: 'Ship polished interfaces for AI products (streaming, glass UI, motion).' },
]

const topics: Topic[] = [
  { id: 't.tokens',     trackId: 'foundations', order: 1, title: 'Tokens & Tokenization',
    summary: 'What a token is, why it matters, and how context windows are measured.' },
  { id: 't.transformers', trackId: 'foundations', order: 2, title: 'How Transformers Think',
    summary: 'Attention, self-attention, and why models pay attention the way they do.' },
  { id: 't.sampling',   trackId: 'foundations', order: 3, title: 'Sampling & Temperature',
    summary: 'Why the same prompt can produce different answers, and how to control it.' },

  { id: 't.clear-prompts', trackId: 'prompt-eng', order: 1, title: 'Writing Clear Prompts',
    summary: 'Structure, specificity, and anti-patterns that quietly degrade answers.' },
  { id: 't.few-shot',   trackId: 'prompt-eng', order: 2, title: 'Few-Shot Examples',
    summary: 'When examples help, when they hurt, and how to pick them.' },

  { id: 't.tool-use',   trackId: 'agents', order: 1, title: 'Tool Use Basics',
    summary: 'Defining tools, returning results, composing multi-step calls.' },
  { id: 't.memory',     trackId: 'agents', order: 2, title: 'Memory Patterns',
    summary: 'Short-term context vs. persistent memory, and when each fits.' },

  { id: 't.streaming',  trackId: 'frontend-ai', order: 1, title: 'Streaming UIs',
    summary: 'Render tokens as they arrive without jank, typewriter traps, or layout shift.' },
  { id: 't.glass-motion', trackId: 'frontend-ai', order: 2, title: 'Glass, Motion & Feel',
    summary: 'Backdrop filters, premium easing, and when motion helps vs. distracts.' },
]

const lessons: Lesson[] = [
  {
    id: 'l.tokens.intro', topicId: 't.tokens', order: 1, minutes: 6,
    title: 'What is a token, really?',
    summary: 'The smallest unit a model actually sees. Counts, costs, and limits all flow from here.',
    body: `
# What is a token, really?

Before a model sees your prompt, a **tokenizer** breaks the text into small pieces called **tokens**.
A token is often a word, sometimes a fragment of a word, and occasionally a single character.

Rough mental model for English:

- ~1 token ≈ 4 characters
- ~1 token ≈ 0.75 of a word
- 1,000 tokens ≈ 750 words

## Why it matters

Every limit you care about is counted in tokens, not words:

- **Context window** — the total tokens a model can consider at once.
- **Cost** — you're billed per token in, and per token out.
- **Latency** — more tokens in, more time to first byte.

## What tokenization isn't

It is **not** the same as splitting on spaces. Punctuation becomes its own token. Uppercase often differs from lowercase. Rare words get shattered into pieces — "anthropomorphism" may be several tokens, while "the" is one.

## Quick intuition

If a prompt feels long in characters but the model is still responsive, you're probably within budget.
If a reply cuts off mid-sentence, you likely hit the output token cap — raise the cap or trim context.
`.trim(),
  },
]

const quizzes: Quiz[] = [
  {
    id: 'q.tokens', topicId: 't.tokens', title: 'Tokens check',
    questions: [
      { id: 'q.tokens.1',
        prompt: 'Roughly how many words are 1,000 tokens, for English?',
        choices: ['About 250', 'About 500', 'About 750', 'About 1,500'],
        answerIdx: 2,
        explain: 'A useful rule of thumb: 1,000 tokens ≈ 750 English words.' },
      { id: 'q.tokens.2',
        prompt: 'Which of these is NOT counted in tokens?',
        choices: ['The context window', 'API cost', 'Output length caps', 'Your CPU clock speed'],
        answerIdx: 3,
        explain: 'Context, cost, and output caps are all token-denominated. CPU speed is unrelated.' },
      { id: 'q.tokens.3',
        prompt: 'Why does "anthropomorphism" often cost more tokens than "the"?',
        choices: [
          'Longer words are always one token',
          'Rare words get split into multiple sub-word tokens',
          'Tokenizers only accept lowercase',
          'Capital letters double the token count',
        ],
        answerIdx: 1,
        explain: 'Tokenizers use sub-word units; rare words break into several pieces while common ones stay whole.' },
      { id: 'q.tokens.4',
        prompt: 'A reply cuts off mid-sentence. Most likely cause?',
        choices: [
          'The context window is full',
          'You hit the max output tokens',
          'Temperature is too low',
          'The tokenizer crashed',
        ],
        answerIdx: 1,
        explain: 'Mid-sentence cutoff is the classic signature of hitting max output tokens.' },
    ],
  },
]

const NOW = Date.now()
const L = (n: number) => NOW - n * 86400_000

const library: LibraryItem[] = [
  // ---- tools ----
  { id: 'i.claude-opus',   kind: 'tool', title: 'Claude Opus 4.7',    tags: ['model', 'frontier'], pinned: true,  addedAt: L(3),  toolCategory: 'model',     cost: 'subscription', owned: true  },
  { id: 'i.claude-sonnet', kind: 'tool', title: 'Claude Sonnet 4.6',  tags: ['model'],             pinned: false, addedAt: L(7),  toolCategory: 'model',     cost: 'subscription', owned: true  },
  { id: 'i.gpt',           kind: 'tool', title: 'GPT (paid)',         tags: ['model'],             pinned: false, addedAt: L(14), toolCategory: 'model',     cost: 'subscription', owned: false },
  { id: 'i.vscode',        kind: 'tool', title: 'VS Code',            tags: ['ide'],               pinned: false, addedAt: L(30), toolCategory: 'ide',       cost: 'free',         owned: true  },
  { id: 'i.claude-code',   kind: 'tool', title: 'Claude Code (CLI)',  tags: ['agent', 'cli'],      pinned: true,  addedAt: L(2),  toolCategory: 'tool',      cost: 'subscription', owned: true  },
  { id: 'i.vite',          kind: 'tool', title: 'Vite',               tags: ['framework', 'build'],pinned: false, addedAt: L(10), toolCategory: 'framework', cost: 'free',         owned: true  },
  { id: 'i.react',         kind: 'tool', title: 'React',              tags: ['framework'],         pinned: false, addedAt: L(10), toolCategory: 'framework', cost: 'free',         owned: true  },
  { id: 'i.github-pages',  kind: 'tool', title: 'GitHub Pages',       tags: ['hosting'],           pinned: false, addedAt: L(30), toolCategory: 'service',   cost: 'free',         owned: true  },
  { id: 'i.vercel',        kind: 'tool', title: 'Vercel',             tags: ['hosting'],           pinned: false, addedAt: L(45), toolCategory: 'service',   cost: 'free',         owned: false },
  { id: 'i.supabase',      kind: 'tool', title: 'Supabase',           tags: ['db', 'hosting'],     pinned: false, addedAt: L(45), toolCategory: 'service',   cost: 'free',         owned: false },

  // ---- documents ----
  { id: 'd.apple-hig',      kind: 'document', title: 'Apple Human Interface Guidelines',
    summary: 'Apple\'s definitive reference on macOS/iOS interaction, visual design, typography, motion, and accessibility.',
    url: 'https://developer.apple.com/design/human-interface-guidelines/',
    tags: ['design', 'reference'], pinned: true, addedAt: L(1) },
  { id: 'd.liquid-glass',   kind: 'document', title: 'Liquid Glass (WWDC25)',
    summary: 'Apple\'s 2025 glass material spec — blur, saturation, and layering rules for light/dark surfaces.',
    url: 'https://developer.apple.com/documentation/technologyoverviews/liquid-glass',
    tags: ['design', 'glass'], pinned: false, addedAt: L(4) },
  { id: 'd.linear-method',  kind: 'document', title: 'The Linear Method',
    summary: 'Linear\'s product philosophy and UX principles — the reference we\'re modeling this app on.',
    url: 'https://linear.app/method',
    tags: ['design', 'product'], pinned: true, addedAt: L(5) },
  { id: 'd.anthropic-docs', kind: 'document', title: 'Anthropic Claude docs',
    summary: 'API reference, SDK guides, and Claude model documentation.',
    url: 'https://docs.anthropic.com/',
    tags: ['api', 'reference'], pinned: false, addedAt: L(6) },

  // ---- articles ----
  { id: 'a.attention',      kind: 'article', title: 'Attention is All You Need',
    summary: 'The original transformer paper. If you want intuition for how modern LLMs actually think, start here.',
    url: 'https://arxiv.org/abs/1706.03762',
    tags: ['ml', 'foundations'], pinned: false, addedAt: L(20) },
  { id: 'a.mcp',            kind: 'article', title: 'Model Context Protocol overview',
    summary: 'Anthropic\'s open protocol for connecting Claude to tools, data, and external systems.',
    url: 'https://modelcontextprotocol.io/',
    tags: ['agents', 'protocol'], pinned: false, addedAt: L(8) },

  // ---- videos ----
  { id: 'v.claude-code-demo', kind: 'video', title: 'Claude Code — getting started',
    summary: 'Walkthrough of the CLI agent, from install to first autonomous task.',
    url: 'https://www.youtube.com/results?search_query=claude+code+cli',
    tags: ['agents', 'tutorial'], pinned: false, addedAt: L(12) },
]

const sampleProject: Project = {
  id: 'p.sample',
  title: 'Personal AI flashcard app',
  summary: 'A mobile-friendly flashcard app that drills the topics I\'m currently learning, backed by the same mastery model the site uses.',
  status: 'draft',
  route: 'easiest',
  stack: ['i.vite', 'i.react', 'i.claude-code', 'i.github-pages'],
  gapTopicIds: ['t.streaming'],
  checklist: [
    { id: 'c1', label: 'Scaffold with Vite + React',       done: true },
    { id: 'c2', label: 'Design token pass',                done: false },
    { id: 'c3', label: 'Card component + deck view',       done: false },
    { id: 'c4', label: 'IndexedDB persistence',            done: false },
    { id: 'c5', label: 'Deploy to GitHub Pages',           done: false },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/** Populate on first boot. Idempotent — only seeds stores that are empty. */
export async function seedIfEmpty(): Promise<void> {
  const [tc, lc] = await Promise.all([db.tracks.count(), db.library.count()])
  if (tc === 0) {
    await db.transaction(
      'rw',
      [db.tracks, db.topics, db.lessons, db.quizzes, db.projects],
      async () => {
        await db.tracks.bulkPut(tracks)
        await db.topics.bulkPut(topics)
        await db.lessons.bulkPut(lessons)
        await db.quizzes.bulkPut(quizzes)
        await db.projects.bulkPut([sampleProject])
      },
    )
  }
  if (lc === 0) await db.library.bulkPut(library)
}
