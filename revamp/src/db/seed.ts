import { db } from './schema'
import type {
  Track, Topic, Lesson, Quiz, LibraryItem, Project,
} from './types'
import { libraryNotes } from './seedLibraryNotes'
import { TOOL_BODIES } from './toolBodies'
import { migrateLegacyStatus } from '../lib/projectStatus'
import { deriveLibraryAudience } from '../lib/audience'

const tracks: Track[] = [
  { id: 'foundations', order: 1, title: 'AI Foundations',
    summary: 'How modern AI models work, from tokens to transformers.',
    audience: ['student', 'office', 'media', 'vibe', 'dev'] },
  { id: 'prompt-eng', order: 2, title: 'Prompt Engineering',
    summary: 'Get precise, reliable output from any frontier model.',
    audience: ['student', 'office', 'media', 'vibe', 'dev'] },
  { id: 'agents',     order: 3, title: 'Agents & Tool Use',
    summary: 'Give models hands: tool calls, memory, autonomous loops.',
    audience: ['vibe', 'dev'] },
  { id: 'frontend-ai', order: 4, title: 'AI Frontend',
    summary: 'Ship polished interfaces for AI products (streaming, glass UI, motion).',
    audience: ['vibe', 'dev'] },
]

const topics: Topic[] = [
  { id: 't.tokens',     trackId: 'foundations', order: 1, title: 'Tokens & Tokenization',
    summary: 'What a token is, why it matters, and how context windows are measured.' },
  { id: 't.transformers', trackId: 'foundations', order: 2, title: 'How Transformers Think',
    summary: 'Attention, self-attention, and why models pay attention the way they do.',
    prereqTopicIds: ['t.tokens'] },
  { id: 't.sampling',   trackId: 'foundations', order: 3, title: 'Sampling & Temperature',
    summary: 'Why the same prompt can produce different answers, and how to control it.',
    prereqTopicIds: ['t.transformers'] },

  { id: 't.clear-prompts', trackId: 'prompt-eng', order: 1, title: 'Writing Clear Prompts',
    summary: 'Structure, specificity, and anti-patterns that quietly degrade answers.',
    prereqTopicIds: ['t.tokens'] },
  { id: 't.few-shot',   trackId: 'prompt-eng', order: 2, title: 'Few-Shot Examples',
    summary: 'When examples help, when they hurt, and how to pick them.',
    prereqTopicIds: ['t.clear-prompts'] },

  { id: 't.tool-use',   trackId: 'agents', order: 1, title: 'Tool Use Basics',
    summary: 'Defining tools, returning results, composing multi-step calls.',
    prereqTopicIds: ['t.clear-prompts'] },
  { id: 't.memory',     trackId: 'agents', order: 2, title: 'Memory Patterns',
    summary: 'Short-term context vs. persistent memory, and when each fits.',
    prereqTopicIds: ['t.tool-use'] },

  { id: 't.streaming',  trackId: 'frontend-ai', order: 1, title: 'Streaming UIs',
    summary: 'Render tokens as they arrive without jank, typewriter traps, or layout shift.',
    prereqTopicIds: ['t.tokens'] },
  { id: 't.glass-motion', trackId: 'frontend-ai', order: 2, title: 'Glass, Motion & Feel',
    summary: 'Backdrop filters, premium easing, and when motion helps vs. distracts.',
    prereqTopicIds: ['t.streaming'] },
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
  { id: 'i.claude-haiku',  kind: 'tool', title: 'Claude Haiku 4.5',   tags: ['model', 'fast'],     pinned: false, addedAt: L(1),  toolCategory: 'model',     cost: 'subscription', owned: true  },
  { id: 'i.gpt',           kind: 'tool', title: 'GPT (paid)',         tags: ['model'],             pinned: false, addedAt: L(14), toolCategory: 'model',     cost: 'subscription', owned: false },
  { id: 'i.gemini',        kind: 'tool', title: 'Gemini',             tags: ['model', 'google'],   pinned: false, addedAt: L(1),  toolCategory: 'model',     cost: 'subscription', owned: false },
  { id: 'i.grok',          kind: 'tool', title: 'Grok (xAI)',         tags: ['model', 'xai'],      pinned: false, addedAt: L(1),  toolCategory: 'model',     cost: 'subscription', owned: false },
  { id: 'i.llama',         kind: 'tool', title: 'Llama (Meta)',       tags: ['model', 'open'],     pinned: false, addedAt: L(1),  toolCategory: 'model',     cost: 'free',         owned: false },
  { id: 'i.mistral',       kind: 'tool', title: 'Mistral',            tags: ['model', 'open'],     pinned: false, addedAt: L(1),  toolCategory: 'model',     cost: 'free',         owned: false },
  { id: 'i.deepseek',      kind: 'tool', title: 'DeepSeek',           tags: ['model', 'open'],     pinned: false, addedAt: L(1),  toolCategory: 'model',     cost: 'free',         owned: false },
  { id: 'i.vscode',        kind: 'tool', title: 'VS Code',            tags: ['ide'],               pinned: false, addedAt: L(30), toolCategory: 'ide',       cost: 'free',         owned: true  },
  { id: 'i.claude-code',   kind: 'tool', title: 'Claude Code (CLI)',  tags: ['agent', 'cli'],      pinned: true,  addedAt: L(2),  toolCategory: 'tool',      cost: 'subscription', owned: true  },
  { id: 'i.vite',          kind: 'tool', title: 'Vite',               tags: ['framework', 'build'],pinned: false, addedAt: L(10), toolCategory: 'framework', cost: 'free',         owned: true  },
  { id: 'i.react',         kind: 'tool', title: 'React',              tags: ['framework'],         pinned: false, addedAt: L(10), toolCategory: 'framework', cost: 'free',         owned: true  },
  { id: 'i.github-pages',  kind: 'tool', title: 'GitHub Pages',       tags: ['hosting'],           pinned: false, addedAt: L(30), toolCategory: 'service',   cost: 'free',         owned: true  },
  { id: 'i.vercel',        kind: 'tool', title: 'Vercel',             tags: ['hosting'],           pinned: false, addedAt: L(45), toolCategory: 'service',   cost: 'free',         owned: false },
  { id: 'i.supabase',      kind: 'tool', title: 'Supabase',           tags: ['db', 'hosting'],     pinned: false, addedAt: L(45), toolCategory: 'service',   cost: 'free',         owned: false },
  { id: 'i.cursor',        kind: 'tool', title: 'Cursor',
    summary: 'AI-first code editor — inline edit, tab-complete, full-context chat on the open repo.',
    tags: ['ide', 'coding'],      pinned: false, addedAt: L(0), toolCategory: 'ide',       cost: 'subscription', owned: false },
  { id: 'i.claude-agent-sdk', kind: 'tool', title: 'Claude Agent SDK',
    summary: 'TS / Python SDK for building custom agentic apps on Claude with tool use + MCP.',
    tags: ['agent', 'sdk', 'mcp'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free',         owned: false },
  { id: 'i.framer-motion', kind: 'tool', title: 'Framer Motion',
    summary: 'React animation library — premium UI motion, spring physics, layout transitions.',
    tags: ['framework', 'motion'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free',         owned: true  },
  { id: 'i.claude-ai', kind: 'tool', title: 'Claude.ai',
    summary: "Claude's web + mobile app. Chat, Projects, Artifacts, file uploads.",
    tags: ['chat', 'model'], pinned: true, addedAt: L(0), toolCategory: 'tool', cost: 'subscription', owned: true },
  { id: 'i.dexie', kind: 'tool', title: 'Dexie',
    summary: 'Minimal IndexedDB wrapper — the persistence layer powering this app.',
    tags: ['db', 'local-first'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: true },
  { id: 'i.n8n', kind: 'tool', title: 'n8n',
    summary: 'Self-hostable visual workflow runner. 70+ AI nodes, persistent agent memory.',
    tags: ['automation', 'agent'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'free', owned: false },
  { id: 'i.v0', kind: 'tool', title: 'v0',
    summary: 'Prompt-to-React-component generator with Shadcn UI and one-click Vercel deploy.',
    tags: ['coding', 'ui'], pinned: false, addedAt: L(0), toolCategory: 'tool', cost: 'subscription', owned: false },
  { id: 'i.nano-banana', kind: 'tool', title: 'Nano Banana',
    summary: 'Gemini 3.1 Flash Image — fast in-chat image gen with accurate text rendering.',
    tags: ['image', 'model'], pinned: false, addedAt: L(0), toolCategory: 'model', cost: 'free', owned: false },
  { id: 'i.elevenlabs', kind: 'tool', title: 'ElevenLabs',
    summary: 'Expressive TTS and voice cloning — the reference for AI narration quality.',
    tags: ['voice', 'audio'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'subscription', owned: false },
  { id: 'i.midjourney', kind: 'tool', title: 'Midjourney',
    summary: 'Painterly / cinematic end of image generation — strongest aesthetic defaults.',
    tags: ['image', 'generative'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'subscription', owned: false },
  { id: 'i.veo', kind: 'tool', title: 'Veo 3.1',
    summary: 'Best-in-class generative video — synced audio, 4K60, first/last-frame conditioning.',
    tags: ['video', 'generative'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'subscription', owned: false },
  { id: 'i.davinci', kind: 'tool', title: 'DaVinci Resolve',
    summary: 'Free pro-grade editor + color grading — industry standard for post-production.',
    tags: ['video', 'editing'], pinned: false, addedAt: L(0), toolCategory: 'tool', cost: 'free', owned: false },
  { id: 'i.tailwind', kind: 'tool', title: 'Tailwind CSS',
    summary: 'Utility-first CSS framework. Style in HTML/JSX with pre-made classes instead of writing custom CSS.',
    tags: ['framework', 'css'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: false },
  { id: 'i.shadcn', kind: 'tool', title: 'Shadcn UI',
    summary: "Copy-paste component library for React. Not a package — you own the code that lands in your repo.",
    tags: ['framework', 'ui', 'react'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: false },
  { id: 'i.nextjs', kind: 'tool', title: 'Next.js',
    summary: 'The React framework with file-based routing, server components, and first-class Vercel deployment.',
    tags: ['framework', 'react', 'ssr'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: false },
  { id: 'i.typescript', kind: 'tool', title: 'TypeScript',
    summary: "JavaScript with a type system. Catches whole classes of bugs at edit time without running the code.",
    tags: ['language'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: true },
  { id: 'i.zustand', kind: 'tool', title: 'Zustand',
    summary: 'Tiny, hook-based state library for React. The one we use in this app.',
    tags: ['react', 'state'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: true },
  { id: 'i.react-router', kind: 'tool', title: 'React Router',
    summary: 'Client-side routing for React. Works everywhere React runs; also drives modern Remix.',
    tags: ['react', 'routing'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: true },
  { id: 'i.astro', kind: 'tool', title: 'Astro',
    summary: 'Content-first web framework. Ship mostly static HTML with islands of React/Svelte/Vue only where interactive.',
    tags: ['framework', 'content'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: false },
  { id: 'i.sveltekit', kind: 'tool', title: 'SvelteKit',
    summary: 'Svelte\'s Next.js-equivalent full-stack framework. Small, fast, no virtual DOM.',
    tags: ['framework', 'svelte'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: false },
  { id: 'i.cloudflare-pages', kind: 'tool', title: 'Cloudflare Pages + Workers',
    summary: 'Static hosting + edge compute on Cloudflare\'s network. Generous free tier, cheap egress.',
    tags: ['hosting', 'edge'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'free', owned: false },
  { id: 'i.neon', kind: 'tool', title: 'Neon',
    summary: 'Serverless Postgres with branch-per-environment — great dev ergonomics, scales to zero.',
    tags: ['db', 'postgres'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'free', owned: false },
  { id: 'i.pinecone', kind: 'tool', title: 'Pinecone',
    summary: 'Managed vector database. The fastest path to production RAG if you don\'t want to run the infra.',
    tags: ['db', 'vector'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'subscription', owned: false },
  { id: 'i.whisper', kind: 'tool', title: 'Whisper (OpenAI)',
    summary: 'Speech-to-text. Open-weights + a hosted API. The reference ASR for English and dozens of other languages.',
    tags: ['audio', 'asr'], pinned: false, addedAt: L(0), toolCategory: 'model', cost: 'free', owned: false },
  { id: 'i.huggingface', kind: 'tool', title: 'Hugging Face',
    summary: 'Model + dataset hub + tooling. If open-weights AI has a home, this is it.',
    tags: ['ecosystem', 'models'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'free', owned: false },
  { id: 'i.langchain', kind: 'tool', title: 'LangChain / LangGraph',
    summary: 'Agent + retrieval framework for Python and TypeScript. LangGraph adds explicit state-machine graphs.',
    tags: ['agent', 'framework'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: false },
  { id: 'i.ideogram', kind: 'tool', title: 'Ideogram',
    summary: 'Image gen tuned for accurate typography in posters, logos, and mockups.',
    tags: ['image', 'generative'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'subscription', owned: false },
  { id: 'i.runway', kind: 'tool', title: 'Runway',
    summary: 'Generative video + AI editing tools. Strong pre-Veo, still a serious creative-post suite.',
    tags: ['video', 'generative'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'subscription', owned: false },
  { id: 'i.cartesia', kind: 'tool', title: 'Cartesia',
    summary: 'Low-latency expressive voice. Sonic model competes with ElevenLabs on quality, wins on speed.',
    tags: ['voice', 'audio'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'subscription', owned: false },
  { id: 'i.python', kind: 'tool', title: 'Python',
    summary: 'The lingua franca of ML, scripting, and backend. If something has an SDK, it usually has a Python one.',
    tags: ['language'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: true },
  { id: 'i.docker', kind: 'tool', title: 'Docker',
    summary: 'Containerize anything; same image runs on your laptop and a production cluster.',
    tags: ['devops', 'container'], pinned: false, addedAt: L(0), toolCategory: 'tool', cost: 'free', owned: false },
  { id: 'i.git', kind: 'tool', title: 'Git',
    summary: 'The distributed version-control system everyone uses. Commits, branches, rebases, worktrees.',
    tags: ['devops', 'vcs'], pinned: false, addedAt: L(0), toolCategory: 'tool', cost: 'free', owned: true },
  { id: 'i.groq', kind: 'tool', title: 'Groq',
    summary: 'Hosted inference on Groq LPU chips — open-weights models at multi-hundred-tokens/second, very low cost.',
    tags: ['infra', 'inference'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'free', owned: false },
  { id: 'i.replicate', kind: 'tool', title: 'Replicate',
    summary: 'Run any open-source model via a simple API. Pay-per-second; hundreds of models one endpoint each.',
    tags: ['infra', 'models'], pinned: false, addedAt: L(0), toolCategory: 'service', cost: 'subscription', owned: false },
  { id: 'i.prisma', kind: 'tool', title: 'Prisma',
    summary: 'TypeScript ORM + schema language. Model database shape in one file, get a typed client for free.',
    tags: ['db', 'orm'], pinned: false, addedAt: L(0), toolCategory: 'framework', cost: 'free', owned: false },

  // ---- documents ----
  { id: 'd.apple-hig',      kind: 'doc', title: 'Apple Human Interface Guidelines',
    summary: 'Apple\'s definitive reference on macOS/iOS interaction, visual design, typography, motion, and accessibility.',
    url: 'https://developer.apple.com/design/human-interface-guidelines/',
    tags: ['design', 'reference'], pinned: true, addedAt: L(1) },
  { id: 'd.liquid-glass',   kind: 'doc', title: 'Liquid Glass (WWDC25)',
    summary: 'Apple\'s 2025 glass material spec — blur, saturation, and layering rules for light/dark surfaces.',
    url: 'https://developer.apple.com/documentation/technologyoverviews/liquid-glass',
    tags: ['design', 'glass'], pinned: false, addedAt: L(4) },
  { id: 'd.linear-method',  kind: 'doc', title: 'The Linear Method',
    summary: 'Linear\'s product philosophy and UX principles — the reference we\'re modeling this app on.',
    url: 'https://linear.app/method',
    tags: ['design', 'product'], pinned: true, addedAt: L(5) },
  { id: 'd.anthropic-docs', kind: 'doc', title: 'Anthropic Claude docs',
    summary: 'API reference, SDK guides, and Claude model documentation.',
    url: 'https://docs.anthropic.com/',
    tags: ['api', 'reference'], pinned: false, addedAt: L(6) },

  // ---- articles ----
  { id: 'a.attention',      kind: 'read', title: 'Attention is All You Need',
    summary: 'The original transformer paper. If you want intuition for how modern LLMs actually think, start here.',
    url: 'https://arxiv.org/abs/1706.03762',
    tags: ['ml', 'foundations'], pinned: false, addedAt: L(20) },
  { id: 'a.mcp',            kind: 'read', title: 'Model Context Protocol overview',
    summary: 'Anthropic\'s open protocol for connecting Claude to tools, data, and external systems.',
    url: 'https://modelcontextprotocol.io/',
    tags: ['agents', 'protocol'], pinned: false, addedAt: L(8) },

  // ---- videos ----
  { id: 'v.claude-code-demo', kind: 'video', title: 'Claude Code — getting started',
    summary: 'Walkthrough of the CLI agent, from install to first autonomous task.',
    url: 'https://www.youtube.com/results?search_query=claude+code+cli',
    tags: ['agents', 'tutorial'], pinned: false, addedAt: L(12) },
].map(item => {
  const withBody = TOOL_BODIES[item.id] ? { ...item, body: TOOL_BODIES[item.id] } : item
  // Tag audience at seed time so UI filtering doesn't re-derive on every render.
  return { ...withBody, audience: deriveLibraryAudience(withBody as LibraryItem) } as LibraryItem
}) as LibraryItem[]

const sampleProject: Project = {
  id: 'p.sample',
  title: 'Personal AI flashcard app',
  summary: 'A mobile-friendly flashcard app that drills the topics I\'m currently learning, backed by the same mastery model the site uses.',
  status: 'backlog',
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

// Demo projects — one per status — so the status colors are visible at a glance.
const demoProjects: Project[] = [
  {
    id: 'p.demo-backlog', title: 'Rough idea — agent that files receipts',
    summary: 'Rough sketch. Worth revisiting later when expenses get out of hand.',
    status: 'backlog', route: 'easiest', stack: [], gapTopicIds: [], checklist: [],
    createdAt: Date.now() - 60_000 * 60 * 24 * 21, updatedAt: Date.now() - 60_000 * 60 * 24 * 20,
  },
  {
    id: 'p.demo-planned', title: 'Weekly board prep automation',
    summary: 'Outline the workflow, pick tools, draft the prompts. Not started yet.',
    status: 'planned', route: 'easiest', stack: [], gapTopicIds: [], checklist: [],
    createdAt: Date.now() - 60_000 * 60 * 24 * 10, updatedAt: Date.now() - 60_000 * 60 * 24 * 9,
  },
  {
    id: 'p.demo-in_progress', title: 'Personal dashboard with Claude integrations',
    summary: 'Building now. Scaffold is up, wiring the Slack + Gmail connections.',
    status: 'in_progress', route: 'best', stack: [], gapTopicIds: [], checklist: [],
    createdAt: Date.now() - 60_000 * 60 * 24 * 7, updatedAt: Date.now() - 60_000 * 60 * 3,
  },
  {
    id: 'p.demo-completed', title: 'Claude-powered résumé refresh',
    summary: 'Done. Shipped a tightened one-pager that lands the elevator pitch up top.',
    status: 'completed', route: 'cheapest', stack: [], gapTopicIds: [], checklist: [],
    createdAt: Date.now() - 60_000 * 60 * 24 * 30, updatedAt: Date.now() - 60_000 * 60 * 24 * 4,
  },
  {
    id: 'p.demo-canceled', title: 'Custom Slack bot for standups',
    summary: 'Shelved — team switched to a commercial tool before this was worth finishing.',
    status: 'canceled', route: 'easiest', stack: [], gapTopicIds: [], checklist: [],
    createdAt: Date.now() - 60_000 * 60 * 24 * 45, updatedAt: Date.now() - 60_000 * 60 * 24 * 15,
  },
]

/** Populate on first boot. Idempotent — only seeds stores that are empty. */
export async function seedIfEmpty(): Promise<void> {
  // Remove orphan doc-note duplicates of tools (merged into their tool entries)
  await db.library.bulkDelete([
    'n.claude-code', 'n.claude-agent-sdk', 'n.framer-motion', 'n.dexie',
  ])

  // Migrate legacy project statuses (draft/active/paused/shipped → Linear vocab)
  const projects = await db.projects.toArray()
  for (const p of projects) {
    const migrated = migrateLegacyStatus(p.status)
    if (migrated !== p.status) await db.projects.put({ ...p, status: migrated })
  }

  // Migrate legacy kinds in-place (document/article/paper → doc/read)
  const all = await db.library.toArray() as (LibraryItem & { kind: string })[]
  const LEGACY: Record<string, LibraryItem['kind']> = {
    document: 'doc', article: 'read', paper: 'read',
  }
  for (const item of all) {
    if (LEGACY[item.kind]) {
      await db.library.put({ ...item, kind: LEGACY[item.kind] })
    }
  }

  // Backfill `audience` for rows seeded before the pathway model existed.
  const untagged = await db.library.toArray()
  for (const item of untagged) {
    if (!item.audience || item.audience.length === 0) {
      await db.library.put({ ...item, audience: deriveLibraryAudience(item) })
    }
  }
  // Same backfill for tracks (existing installs are missing audience on all 4).
  const trks = await db.tracks.toArray()
  for (const t of trks) {
    if (!t.audience || t.audience.length === 0) {
      const seed = tracks.find(x => x.id === t.id)
      if (seed?.audience) await db.tracks.put({ ...t, audience: seed.audience })
    }
  }
  // Backfill topic prerequisites from the seed list for existing installs.
  const existingTopics = await db.topics.toArray()
  for (const t of existingTopics) {
    if (!t.prereqTopicIds) {
      const seed = topics.find(x => x.id === t.id)
      if (seed?.prereqTopicIds) await db.topics.put({ ...t, prereqTopicIds: seed.prereqTopicIds })
    }
  }

  // Backfill demo projects (one per status) on existing installs so the
  // color vocabulary is visible without clearing local data. Idempotent per-id.
  for (const d of demoProjects) {
    const existing = await db.projects.get(d.id)
    if (!existing) await db.projects.put(d)
  }

  // Seed a `created` event for any project missing history (e.g., projects
  // that existed before projectEvents was introduced, plus the sample seed).
  const allProjects = await db.projects.toArray()
  for (const proj of allProjects) {
    const existing = await db.projectEvents.where('projectId').equals(proj.id).count()
    if (existing === 0) {
      await db.projectEvents.put({
        id: `evt.${proj.id}.${proj.createdAt}.created`,
        projectId: proj.id,
        ts: proj.createdAt,
        kind: 'created',
        from: null,
        to: proj.status,
      })
    }
  }

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
        await db.projects.bulkPut([sampleProject, ...demoProjects])
      },
    )
  }
  if (lc === 0) {
    await db.library.bulkPut(library)
    await db.library.bulkPut(libraryNotes)
  } else {
    // System-managed notes: overwrite from code, preserve user's pinned state.
    for (const n of libraryNotes) {
      const prev = await db.library.get(n.id)
      const merged = { ...n, pinned: prev?.pinned ?? n.pinned }
      await db.library.put({ ...merged, audience: deriveLibraryAudience(merged) })
    }
    // Library items: soft-insert missing IDs so user edits (owned, pinned) stick.
    // Existing rows that gained a `body` in code get that body patched in
    // without overwriting user-editable fields.
    for (const item of library) {
      const prev = await db.library.get(item.id)
      if (!prev) {
        await db.library.put(item)
      } else if (item.body && prev.body !== item.body) {
        const merged = { ...prev, body: item.body, summary: item.summary ?? prev.summary }
        await db.library.put({ ...merged, audience: merged.audience ?? item.audience })
      }
    }
  }
}
