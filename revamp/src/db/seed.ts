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
  { id: 'vibe-coding', order: 5, title: 'Vibe Coding',
    summary: 'Build software end-to-end with AI doing most of the typing. Tools, loops, guardrails.',
    audience: ['vibe'] },
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

  // ---- Prompt-basics (referenced by 4 of 5 pathway templates) ----
  { id: 't.prompt-basics', trackId: 'prompt-eng', order: 0, title: 'Prompt Basics',
    summary: 'What a prompt is, system vs. user, and the anatomy of one that works.',
    audience: ['student', 'office', 'media', 'vibe', 'dev'] },

  // ---- Vibe-coding track ----
  { id: 't.vibe-what-and-why', trackId: 'vibe-coding', order: 1, title: 'What Vibe Coding Is',
    summary: 'Building software without typing the code yourself. What it is, what it isn\'t, and when to reach for it.',
    audience: ['vibe'] },
  { id: 't.vibe-tools-compared', trackId: 'vibe-coding', order: 2, title: 'The Vibe Stack',
    summary: 'Cursor vs. Claude Code vs. v0 vs. Lovable vs. Replit — what each is for.',
    audience: ['vibe'],
    prereqTopicIds: ['t.vibe-what-and-why'] },
  { id: 't.claude-code-basics', trackId: 'vibe-coding', order: 3, title: 'Claude Code Basics',
    summary: 'The terminal agent you point at a project. What it does, what it won\'t, how to drive it.',
    audience: ['vibe', 'dev'],
    prereqTopicIds: ['t.vibe-tools-compared'] },
  { id: 't.vibe-iteration-loop', trackId: 'vibe-coding', order: 4, title: 'The Iteration Loop',
    summary: 'Prompt → observe → correct → commit. The rhythm of shipping without writing code.',
    audience: ['vibe'],
    prereqTopicIds: ['t.claude-code-basics'] },
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

  // ==================== t.prompt-basics ====================
  {
    id: 'l.prompt-basics.intro', topicId: 't.prompt-basics', order: 1, minutes: 7,
    title: 'Anatomy of a prompt',
    summary: 'The five pieces every good prompt has, and why most bad output is a missing piece — not a weak model.',
    body: `
**TL;DR** — A prompt isn't just "what you want." It's **role**, **context**, **task**, **constraints**, and **format**. Most disappointing answers are missing one of the five.

## What a prompt actually is

A prompt is the full text a model sees before it starts writing. Two layers:

- **System prompt** — who the model is playing. Tone, persona, rules.
- **User prompt** — what you're asking right now.

You don't always get to set a system prompt (in claude.ai you mostly don't; in the API and in many vibe-coding tools you do). When you can, use it for the stuff that shouldn't change between turns.

> The system prompt says "you are a careful code reviewer." The user prompt says "review this diff." Two layers, two jobs.
> — Source

## The five pieces

1. **Role** — who is answering? "You're a senior TypeScript reviewer."
2. **Context** — what do they need to know? The relevant file, the user, the stakes.
3. **Task** — the one verb. Summarize, rewrite, find, propose.
4. **Constraints** — length, tone, what to avoid, what must be true.
5. **Format** — prose, bullets, JSON, a specific schema.

Drop one and the output gets vague in a predictable way. No role → generic voice. No constraints → walls of text. No format → hard to use downstream.

## The fastest win

Before hitting send, read your prompt back and ask: **which of the five am I missing?** Usually it's format or constraints. Add one sentence and try again.

## What beginners skip

- **Examples.** One before/after pair is worth a paragraph of description.
- **Anti-requirements.** "Don't apologize" and "don't ask me follow-up questions" are as important as the positive asks.
- **The grain size.** "Short" is subjective; "~80 words" isn't.
`.trim(),
  },

  // ==================== t.vibe-what-and-why ====================
  {
    id: 'l.vibe-what.intro', topicId: 't.vibe-what-and-why', order: 1, minutes: 8,
    title: 'What vibe coding is (and isn\'t)',
    summary: 'Define the thing, separate it from "asking ChatGPT for code," and name the failure modes people hit in the first week.',
    body: `
**TL;DR** — Vibe coding is building working software by describing what you want and letting an AI do the typing, while you stay in the loop as the taste-maker and reviewer. It is not "I don't have to think." It is "I don't have to type."

## The definition

Vibe coding means you:

1. **Describe** what you want in plain language.
2. **Let the AI** translate that into code, run it, and show results.
3. **Steer** — you read, you test, you correct, you decide.

The AI writes the text. You own the product.

## What it isn't

It isn't "no-code." No-code tools constrain you to pre-built blocks (Bubble, Airtable forms, Zapier). Vibe coding produces actual source code — you could read it if you wanted to. You just mostly don't write it yourself.

It also isn't "prompting a chatbot." Chatbot coding means copy/paste loops: you ask ChatGPT, paste the answer into your editor, run it, paste the error back. Vibe coding tools close that loop — the AI runs the code itself and sees its own output.

> The leap isn't "AI can code." The leap is "AI can debug what it just wrote, so you don't have to copy-paste the error back in."
> — Source

## When to reach for it

Good fits:

- **Personal tools.** Scripts, flashcard apps, dashboards, side projects.
- **Prototypes.** "Show me what this idea looks like running."
- **Glue code.** Wiring two services together, scraping, transforming data.

Bad fits (today):

- **Life-safety or regulated systems.** Review requirements exceed what most vibe setups enforce.
- **Novel algorithms you don't understand.** If you can't evaluate the output, you can't trust it.
- **Huge existing codebases with subtle invariants.** The AI will change things it shouldn't.

## The first-week failure modes

- **Cargo-culting prompts.** Copying someone's killer prompt without knowing why it works.
- **Accepting output you didn't read.** Looks plausible ≠ is correct.
- **No version control.** Five iterations in, you can't go back to the one that worked.
- **Drifting past the goal.** You asked for a button; after an hour you have a framework.

## The mental shift

You're the **product manager, reviewer, and QA** — not the typist. The tool is the typist. Your leverage is in saying clearly what you want, noticing fast when it's wrong, and pulling the thread back to the goal.
`.trim(),
  },

  // ==================== t.vibe-tools-compared ====================
  {
    id: 'l.vibe-tools.intro', topicId: 't.vibe-tools-compared', order: 1, minutes: 9,
    title: 'The vibe stack in one page',
    summary: 'Cursor, Claude Code, v0, Lovable, Replit, Supabase — what each one actually does, and which ones compete vs. compose.',
    body: `
**TL;DR** — The five tools most people mean by "vibe stack" do different jobs. Cursor edits files in an IDE. Claude Code runs in the terminal. v0 + Lovable generate whole apps from a prompt. Replit hosts + runs. Supabase is your database + auth. Pick one editor, one generator, one runner, one backend.

## Editors — where you sit while coding

### Cursor
A VS Code fork with an AI side panel. You see the file, you see the diff, you accept or reject. Great if you already like VS Code and want AI that respects your files.

### Claude Code
A terminal agent. You run it in your project folder; it reads, writes, runs commands. No IDE. Feels like pair-programming with someone at your shoulder, driving the keyboard.

> Cursor asks before it changes a file. Claude Code asks before it runs a command. Both are guardrails — know which one you're trusting today.
> — Source

## Generators — start from nothing

### v0 (by Vercel)
Prompt → a React component or a small Next.js app. Great for UI scaffolding. Less great once you need custom backend logic.

### Lovable
Prompt → a full web app, end-to-end. More ambitious scope than v0, more surface area for bugs. Best for taking something from "idea" to "demo you can click."

## Runners — where the code actually runs

### Replit
In-browser IDE + runtime. Hosts the app for you. Good for scripts, bots, and "I don't want to think about deployment."

## Backends — where your data lives

### Supabase
Postgres + auth + file storage + realtime. Generous free tier. Most vibe-coded apps that need "users" + "data" end up here.

## How to pick

Don't pick all of them. Pick one per job:

- **Editor OR generator** — not both. Start with a generator if you have no app yet; switch to an editor once you do.
- **One runner** — wherever the generator sends you is usually fine.
- **One backend** — only when the prototype needs it. Most "v0" projects don't.

## Common composition

A typical path:

1. **v0** or **Lovable** to scaffold the app.
2. **Cursor** or **Claude Code** to modify it as it grows.
3. **Supabase** added when you need users and data.
4. **Replit** or the host the generator handed you for deploys.

You can absolutely skip 3 and 4 forever if your project doesn't need them.
`.trim(),
  },

  // ==================== t.claude-code-basics ====================
  {
    id: 'l.claude-code.intro', topicId: 't.claude-code-basics', order: 1, minutes: 9,
    title: 'Claude Code in 10 minutes',
    summary: 'What the CLI is, how a session works, the permission model, and the two commands that matter on day one.',
    body: `
**TL;DR** — Claude Code is Claude running in your terminal, in your project folder, with read + write + run permission (subject to your approval). A session is a conversation; each reply can include edits and shell commands that run in your actual repo.

## What it is

You install it, \`cd\` into a project, run \`claude\`, and type. Claude sees the files you point it at, writes diffs, runs tests, and explains as it goes. It works over any project — it's language-agnostic.

> The value isn't "it writes code." Every chatbot writes code. The value is "it runs the code and reads its own errors." That tightens the loop from a minute to a second.
> — Source

## The permission model

By default, Claude Code asks before doing anything that touches your system:

- **Edit a file** → confirmation prompt
- **Run a shell command** → confirmation prompt
- **Read a file** → usually allowed without prompting

You can relax these via settings, or run in "plan mode" where it only proposes without executing. The defaults favor safety; loosen them as you learn what to trust.

## Day-one moves

The two commands that pay for themselves immediately:

1. **\`/init\`** — generates a CLAUDE.md file with repo conventions. Claude reads it at the start of every session, so future turns already know your style.
2. **\`/clear\`** — resets the conversation. When Claude gets confused (or the context gets long), clear and start fresh. Costs you nothing; cleans a lot up.

## What a session looks like

- You ask: "add a delete button to the task list."
- Claude reads the relevant files, proposes a diff, asks to apply it.
- You accept.
- Claude runs the test, sees it pass, reports back.
- You try it in the browser, find a bug, paste the error back.
- Claude fixes it.

The loop is tight. It's the tightness that makes it different from copy/paste coding.

## What it won't do

- **Design your product for you.** You still pick the features.
- **Know the business.** If it's not in the code or you don't tell it, it doesn't know.
- **Guarantee correctness.** Always run the code. Always check git diffs. Always keep commits small.

## The guardrail rhythm

Commit before you let it touch anything big. Commit after each working iteration. When a change goes sideways, \`git reset --hard\` and re-describe.
`.trim(),
  },

  // ==================== t.vibe-iteration-loop ====================
  {
    id: 'l.vibe-loop.intro', topicId: 't.vibe-iteration-loop', order: 1, minutes: 10,
    title: 'The iteration loop',
    summary: 'The rhythm of prompt → observe → correct → commit, the guardrails that keep a vibe session from drifting, and how to know when to stop.',
    body: `
**TL;DR** — Vibe coding is a loop: **describe, observe, correct, commit**. Each turn is cheap; accumulating drift is expensive. Commit often, reset when confused, and stop the moment the goal is met.

## The four beats

### 1. Describe
Say what you want in one sentence. Not "let's build an app." Something specific: "add a toggle that filters the list to items from the last 7 days."

### 2. Observe
The AI changes files and runs code. **Read the diff.** Skim the output. Click the thing. Don't trust "it works" until you've seen it work.

### 3. Correct
When it misses, be specific. Paste the error, paste the wrong output, or describe what's off. Vague corrections ("no, make it better") produce vague fixes.

### 4. Commit
When a step works, commit. \`git commit -am "add 7-day filter"\`. This is your anchor. Everything that comes next can be reset back to this point.

> Each turn should end with either a commit or a reset. Never "I'll commit later." Later means you've lost the good version.
> — Source

## The guardrails

- **Keep turns small.** One capability per turn is the right grain. Big asks drift.
- **Read diffs before accepting.** Even if you can't evaluate every line, you'll catch the obvious "why is it deleting that file."
- **Run it.** Tests, the app in the browser, a curl request — something that actually executes.
- **Know your reset point.** The last commit is the only version you're sure of.

## Drift — the silent failure

After an hour of loose iteration, you have:

- Fifteen files changed.
- Five small bugs introduced.
- A feature that wasn't on your list.
- No idea which step made what worse.

The fix is boring: commit every 5–15 minutes, keep a running note of "today's goal," and when you catch yourself off-path, \`git reset --hard HEAD\` and re-describe.

## When to stop

- **The goal is met.** Ship. Don't "polish" into new bugs.
- **Two consecutive fixes failed.** The approach is wrong; step back and re-describe from scratch.
- **You can't remember what you were doing.** Commit what works, close the session, come back tomorrow.

## What this looks like in practice

A 90-minute vibe session produces **8–15 small commits**, not 1 giant one. Each commit has a one-line message. At the end you can read the log and see the story of the session. That's the artifact.
`.trim(),
  },
]

const quizzes: Quiz[] = [
  {
    id: 'q.tokens', topicId: 't.tokens', title: 'Tokens check',
    questions: [
      { kind: 'mcq', id: 'q.tokens.1',
        prompt: 'Roughly how many words are 1,000 tokens, for English?',
        choices: ['About 250', 'About 500', 'About 750', 'About 1,500'],
        answerIdx: 2,
        explain: 'A useful rule of thumb: 1,000 tokens ≈ 750 English words.' },
      { kind: 'mcq', id: 'q.tokens.2',
        prompt: 'Which of these is NOT counted in tokens?',
        choices: ['The context window', 'API cost', 'Output length caps', 'Your CPU clock speed'],
        answerIdx: 3,
        explain: 'Context, cost, and output caps are all token-denominated. CPU speed is unrelated.' },
      { kind: 'mcq', id: 'q.tokens.3',
        prompt: 'Why does "anthropomorphism" often cost more tokens than "the"?',
        choices: [
          'Longer words are always one token',
          'Rare words get split into multiple sub-word tokens',
          'Tokenizers only accept lowercase',
          'Capital letters double the token count',
        ],
        answerIdx: 1,
        explain: 'Tokenizers use sub-word units; rare words break into several pieces while common ones stay whole.' },
      { kind: 'mcq', id: 'q.tokens.4',
        prompt: 'A reply cuts off mid-sentence. Most likely cause?',
        choices: [
          'The context window is full',
          'You hit the max output tokens',
          'Temperature is too low',
          'The tokenizer crashed',
        ],
        answerIdx: 1,
        explain: 'Mid-sentence cutoff is the classic signature of hitting max output tokens.' },
      { kind: 'ordered-steps', id: 'q.tokens.5',
        prompt: 'Put these steps in order: what happens to your prompt on its way to a model reply?',
        steps: [
          'Your text is split into tokens by the tokenizer',
          'Tokens are embedded into vectors',
          'The model generates output tokens one at a time',
          'Output tokens are decoded back into text',
        ],
        correctOrder: [0, 1, 2, 3],
        explain: 'Text → tokenize → embed → generate → decode. Every API call walks this pipeline.' },
      { kind: 'code-typing', id: 'q.tokens.6',
        prompt: 'Fill in the field that caps reply length (in tokens) on the Anthropic Messages API.',
        language: 'json',
        code: '{\n  "model": "claude-sonnet-4-6",\n  "{{blank}}": 1024,\n  "messages": [...]\n}',
        expected: 'max_tokens',
        explain: '`max_tokens` is the per-request cap on output tokens.' },
      { kind: 'short-answer', id: 'q.tokens.7',
        prompt: 'One word: the unit text is broken into before a model can process it.',
        pattern: '^tokens?$',
        placeholder: 'one word',
        explain: 'Tokens — the atomic unit of model I/O, billing, and context limits.' },
    ],
  },

  // ==================== q.prompt-basics ====================
  {
    id: 'q.prompt-basics', topicId: 't.prompt-basics', title: 'Prompt anatomy check',
    questions: [
      { kind: 'mcq', id: 'q.pb.1',
        prompt: 'A prompt produces generic-voice output. Which of the five pieces is most likely missing?',
        choices: ['Format', 'Role', 'Task', 'Constraints'],
        answerIdx: 1,
        explain: 'No role = no perspective, which reads as generic.' },
      { kind: 'mcq', id: 'q.pb.2',
        prompt: 'Which statement best describes the relationship between system and user prompts?',
        choices: [
          'System sets persistent rules; user is the current ask',
          'System is required; user is optional',
          'They are identical — different names only',
          'Only the system prompt influences output',
        ],
        answerIdx: 0,
        explain: 'System = the tone/rules layer; user = what you\'re asking this turn.' },
      { kind: 'mcq', id: 'q.pb.3',
        prompt: 'Output is too long and rambly. Which fix is highest-leverage?',
        choices: [
          'Ask nicer',
          'Add a length + format constraint ("~80 words, bullets")',
          'Switch models',
          'Repeat the prompt three times',
        ],
        answerIdx: 1,
        explain: 'Specific constraints beat begging or model-hopping.' },
      { kind: 'ordered-steps', id: 'q.pb.4',
        prompt: 'Put the five prompt pieces in a natural authoring order.',
        steps: ['Role', 'Context', 'Task', 'Constraints', 'Format'],
        correctOrder: [0, 1, 2, 3, 4],
        explain: 'Role → Context → Task → Constraints → Format is the canonical order in this lesson.' },
      { kind: 'short-answer', id: 'q.pb.5',
        prompt: 'Worth a paragraph of description: what single technique (one word) most reliably lifts output quality?',
        pattern: '^examples?$',
        placeholder: 'one word',
        explain: 'Examples. One before/after pair beats a paragraph of description.' },
      { kind: 'mcq', id: 'q.pb.6',
        prompt: 'Why are anti-requirements ("don\'t apologize, don\'t ask follow-ups") worth writing down?',
        choices: [
          'They\'re optional polish',
          'Models default to behaviors you may not want; naming them explicitly suppresses them',
          'They only work on older models',
          'They lower token cost',
        ],
        answerIdx: 1,
        explain: 'Named-and-banned beats unspoken-and-hoped.' },
    ],
  },

  // ==================== q.vibe-what-and-why ====================
  {
    id: 'q.vibe-what', topicId: 't.vibe-what-and-why', title: 'What vibe coding is',
    questions: [
      { kind: 'mcq', id: 'q.vw.1',
        prompt: 'Vibe coding is best described as…',
        choices: [
          'Writing code faster by hand with AI suggestions',
          'Describing what you want, letting AI type, staying in the loop as reviewer',
          'Using no-code tools like Bubble or Airtable',
          'A new programming language',
        ],
        answerIdx: 1,
        explain: 'You describe + review; the AI does the typing.' },
      { kind: 'mcq', id: 'q.vw.2',
        prompt: 'Key difference between vibe coding and "copy-paste ChatGPT coding"?',
        choices: [
          'Vibe coding is always in the browser',
          'Vibe coding tools run the code and see their own errors; you don\'t copy-paste the loop',
          'ChatGPT coding produces worse code',
          'There is no difference',
        ],
        answerIdx: 1,
        explain: 'The closed loop (AI runs + reads its own output) is the leap.' },
      { kind: 'mcq', id: 'q.vw.3',
        prompt: 'Which of these is a BAD fit for vibe coding today?',
        choices: [
          'A personal flashcard app',
          'A data-transformation script',
          'Life-safety systems in a regulated industry',
          'A prototype of an idea',
        ],
        answerIdx: 2,
        explain: 'Regulated / life-safety review requirements exceed most vibe setups.' },
      { kind: 'mcq', id: 'q.vw.4',
        prompt: 'First-week failure mode most likely to silently ruin a session?',
        choices: [
          'Accepting code you didn\'t read',
          'Using a fast model instead of a slow one',
          'Picking Cursor over Claude Code',
          'Writing too-short prompts',
        ],
        answerIdx: 0,
        explain: 'Plausible-looking ≠ correct. Reading is the guardrail.' },
      { kind: 'short-answer', id: 'q.vw.5',
        prompt: 'In the vibe model, the AI is the typist. What are you? (one or two words)',
        pattern: '^(reviewer|product manager|pm|qa|taste[- ]?maker)',
        placeholder: 'one or two words',
        explain: 'Reviewer / product manager / QA / taste-maker — any of these fit.' },
      { kind: 'ordered-steps', id: 'q.vw.6',
        prompt: 'Put these vibe-loop beats in order.',
        steps: ['Describe what you want', 'Let AI implement', 'Observe the result', 'Correct or commit'],
        correctOrder: [0, 1, 2, 3],
        explain: 'Describe → implement → observe → correct/commit. The loop.' },
    ],
  },

  // ==================== q.vibe-tools-compared ====================
  {
    id: 'q.vibe-tools', topicId: 't.vibe-tools-compared', title: 'The vibe stack',
    questions: [
      { kind: 'mcq', id: 'q.vt.1',
        prompt: 'You want to scaffold a React component from a one-paragraph description. Best fit?',
        choices: ['Cursor', 'v0', 'Supabase', 'Replit'],
        answerIdx: 1,
        explain: 'v0 generates React/Next from a prompt.' },
      { kind: 'mcq', id: 'q.vt.2',
        prompt: 'Where does Claude Code run?',
        choices: ['In a web IDE', 'As a VS Code side panel', 'In your terminal', 'Only in Replit'],
        answerIdx: 2,
        explain: 'Claude Code is a terminal agent.' },
      { kind: 'mcq', id: 'q.vt.3',
        prompt: 'You need user accounts and a database for a prototype. Most vibe-coded apps land on…',
        choices: ['Firebase', 'DynamoDB', 'Supabase', 'Postgres you self-host'],
        answerIdx: 2,
        explain: 'Supabase is the default: Postgres + auth + storage with a generous free tier.' },
      { kind: 'mcq', id: 'q.vt.4',
        prompt: 'Compose-vs-compete: which two overlap and usually shouldn\'t both be on your stack?',
        choices: [
          'Cursor + Claude Code',
          'v0 + Supabase',
          'Replit + Claude Code',
          'Supabase + Cursor',
        ],
        answerIdx: 0,
        explain: 'Cursor and Claude Code are both editor-AIs. Pick one.' },
      { kind: 'short-answer', id: 'q.vt.5',
        prompt: 'Which tool\'s tagline fits best: "prompt in, full clickable web app out"?',
        pattern: '^lovable$',
        placeholder: 'one word',
        explain: 'Lovable — end-to-end app from a prompt.' },
      { kind: 'mcq', id: 'q.vt.6',
        prompt: 'Rule of thumb for picking an editor-AI vs. a generator?',
        choices: [
          'Always editor',
          'Always generator',
          'Generator when you have nothing yet; editor once an app exists',
          'Pick by pricing only',
        ],
        answerIdx: 2,
        explain: 'Start with a generator if there\'s no app; move to an editor once you do.' },
    ],
  },

  // ==================== q.claude-code-basics ====================
  {
    id: 'q.claude-code', topicId: 't.claude-code-basics', title: 'Claude Code day-one',
    questions: [
      { kind: 'mcq', id: 'q.cc.1',
        prompt: 'What does Claude Code do before editing a file or running a shell command, by default?',
        choices: [
          'Nothing — it just does it',
          'Asks for confirmation',
          'Writes to a log file silently',
          'Only acts if you\'re on a specific plan',
        ],
        answerIdx: 1,
        explain: 'Defaults favor safety — file edits and shell runs are confirmed.' },
      { kind: 'code-typing', id: 'q.cc.2',
        prompt: 'Type the slash-command that generates a CLAUDE.md at the start of a session.',
        language: 'bash',
        code: '{{blank}}',
        expected: '/init',
        explain: '/init writes a CLAUDE.md Claude will read in every future session.' },
      { kind: 'code-typing', id: 'q.cc.3',
        prompt: 'The conversation is getting long and confused. Type the slash-command that resets it.',
        language: 'bash',
        code: '{{blank}}',
        expected: '/clear',
        explain: '/clear wipes the current context without restarting the CLI.' },
      { kind: 'mcq', id: 'q.cc.4',
        prompt: 'Which of these is NOT something Claude Code can do for you?',
        choices: [
          'Read your repo\'s files',
          'Run tests',
          'Know what your business needs without being told',
          'Write a diff',
        ],
        answerIdx: 2,
        explain: 'Business context must come from you (or from CLAUDE.md).' },
      { kind: 'mcq', id: 'q.cc.5',
        prompt: 'A change goes sideways mid-session. Safest recovery?',
        choices: [
          'Keep iterating and hope',
          'Ask Claude to undo all its changes verbally',
          'git reset --hard to the last known-good commit and re-describe',
          'Delete the project and start over',
        ],
        answerIdx: 2,
        explain: 'Your last commit is the only version you\'re sure of. Reset, re-describe, retry.' },
      { kind: 'short-answer', id: 'q.cc.6',
        prompt: 'What\'s the file Claude Code reads at session start to learn your project\'s conventions?',
        pattern: '^claude\\.?\\s*md$',
        placeholder: 'filename',
        explain: 'CLAUDE.md — project-local conventions that survive /clear.' },
    ],
  },

  // ==================== q.vibe-iteration-loop ====================
  {
    id: 'q.vibe-loop', topicId: 't.vibe-iteration-loop', title: 'The iteration loop',
    questions: [
      { kind: 'ordered-steps', id: 'q.vl.1',
        prompt: 'Put the four beats of the vibe loop in order.',
        steps: ['Describe', 'Observe', 'Correct', 'Commit'],
        correctOrder: [0, 1, 2, 3],
        explain: 'Describe → observe → correct → commit. Each turn ends with a commit or a reset.' },
      { kind: 'mcq', id: 'q.vl.2',
        prompt: 'Right grain size for a single iteration turn?',
        choices: [
          'A full app',
          'One capability (one button, one filter, one function)',
          'A week of work',
          'A whole track of the roadmap',
        ],
        answerIdx: 1,
        explain: 'Small turns commit cleanly; big turns drift.' },
      { kind: 'mcq', id: 'q.vl.3',
        prompt: 'Two consecutive fixes fail to solve the same bug. Best next move?',
        choices: [
          'Ship a third fix',
          'Step back, reassess from first principles, re-describe',
          'Blame the model',
          'Switch editors',
        ],
        answerIdx: 1,
        explain: 'Two failed fixes = wrong approach. Don\'t ship a third.' },
      { kind: 'mcq', id: 'q.vl.4',
        prompt: 'Vague correction ("no, make it better") tends to produce…',
        choices: ['A better version', 'A vague fix', 'No change', 'A rewrite from scratch'],
        answerIdx: 1,
        explain: 'Specific in, specific out.' },
      { kind: 'short-answer', id: 'q.vl.5',
        prompt: 'The only version of your work you can truly trust is the last ____.',
        pattern: '^commit$',
        placeholder: 'one word',
        explain: 'The last commit — your reset anchor.' },
      { kind: 'mcq', id: 'q.vl.6',
        prompt: 'A 90-minute vibe session is healthy when it produces roughly…',
        choices: [
          '1 giant commit',
          '8–15 small commits, each a clear step',
          '100 tiny commits, mostly noise',
          'Zero commits — save them for the end',
        ],
        answerIdx: 1,
        explain: 'Small + frequent. The log is the artifact.' },
      { kind: 'mcq', id: 'q.vl.7',
        prompt: 'When is it time to stop a session?',
        choices: [
          'Only when exhausted',
          'When the goal is met, when two fixes failed in a row, or when you can\'t remember what you were doing',
          'Every 15 minutes',
          'Never — keep going',
        ],
        answerIdx: 1,
        explain: 'Three natural stop signals. Ignoring them is how drift wins.' },
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
  } else {
    // Existing install: insert-if-missing for tracks/topics/lessons/quizzes
    // so new content (e.g., vibe-coding track in Chunk F) reaches users who
    // already have a seeded DB. User-authored rows are never overwritten —
    // this only fills gaps.
    for (const t of tracks) {
      if (!(await db.tracks.get(t.id))) await db.tracks.put(t)
    }
    for (const t of topics) {
      if (!(await db.topics.get(t.id))) await db.topics.put(t)
    }
    for (const l of lessons) {
      if (!(await db.lessons.get(l.id))) await db.lessons.put(l)
    }
    for (const q of quizzes) {
      if (!(await db.quizzes.get(q.id))) await db.quizzes.put(q)
    }
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
