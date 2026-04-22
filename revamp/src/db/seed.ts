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
  { id: 'literacy', order: 0, title: 'AI Literacy',
    summary: 'What AI is, what it isn\'t, and how to tell when it\'s wrong. The first thing to learn.',
    audience: ['student', 'office', 'media', 'vibe', 'dev'] },
  { id: 'office-ai', order: 6, title: 'AI at Work',
    summary: 'Claude as a coworker: docs, meetings, communication, and day-to-day knowledge work.',
    audience: ['office'] },
  { id: 'generative-media', order: 7, title: 'Generative Media',
    summary: 'Prompting images, video, voice, and music — and knowing what you\'re allowed to do with the output.',
    audience: ['media'] },
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

  // ---- Literacy track (cross-pathway, taught first) ----
  { id: 't.ai-literacy', trackId: 'literacy', order: 1, title: 'AI Literacy',
    summary: 'What a language model actually is, what "trained" means, and when not to believe it.',
    audience: ['student', 'office', 'media', 'vibe', 'dev'] },
  { id: 't.ai-literacy-at-work', trackId: 'literacy', order: 2, title: 'AI Literacy at Work',
    summary: 'Confidentiality, verifying claims, sign-your-name rule, and the failure modes that get people fired.',
    audience: ['office'],
    prereqTopicIds: ['t.ai-literacy'] },
  { id: 't.ai-for-students', trackId: 'literacy', order: 3, title: 'AI for Students',
    summary: 'Study aid without self-sabotage. Integrity lines, privacy, and how to learn instead of copy.',
    audience: ['student'],
    prereqTopicIds: ['t.ai-literacy'] },

  // ---- Foundations — models-compared slots in ----
  { id: 't.models-compared', trackId: 'foundations', order: 4, title: 'Models Compared',
    summary: 'Claude vs. ChatGPT vs. Gemini: what each is good at, free tiers, and picking for the task.',
    audience: ['student', 'office', 'media', 'vibe', 'dev'],
    prereqTopicIds: ['t.tokens'] },

  // ---- Office track ----
  { id: 't.claude-for-office', trackId: 'office-ai', order: 1, title: 'Claude as a Coworker',
    summary: 'Projects, custom instructions, and the coworker-mode mental model.',
    audience: ['office'],
    prereqTopicIds: ['t.prompt-basics'] },
  { id: 't.docs-with-ai', trackId: 'office-ai', order: 2, title: 'Document Work with AI',
    summary: 'Draft, rewrite, shorten, tone-shift, and summarise — the shapes of daily doc work.',
    audience: ['office'],
    prereqTopicIds: ['t.claude-for-office'] },
  { id: 't.meetings-with-ai', trackId: 'office-ai', order: 3, title: 'Meetings with AI',
    summary: 'Agendas, talking points, transcript summaries, follow-up drafts — before, during, after.',
    audience: ['office'],
    prereqTopicIds: ['t.claude-for-office'] },

  // ---- Generative media track ----
  { id: 't.generative-media-101', trackId: 'generative-media', order: 1, title: 'Generative Media 101',
    summary: 'What "generative" means, creator-side literacy, rights + consent, and what platforms will and won\'t accept.',
    audience: ['media'] },
  { id: 't.image-generation', trackId: 'generative-media', order: 2, title: 'Image Generation',
    summary: 'Midjourney / Nano Banana / Ideogram — painterly vs. fast vs. typography, and the iteration loop.',
    audience: ['media'],
    prereqTopicIds: ['t.generative-media-101'] },
  { id: 't.video-generation', trackId: 'generative-media', order: 3, title: 'Video Generation',
    summary: 'Veo / Sora / Runway. Shot prompting, first/last-frame conditioning, cost + duration reality.',
    audience: ['media'],
    prereqTopicIds: ['t.generative-media-101'] },
  { id: 't.voice-and-audio', trackId: 'generative-media', order: 4, title: 'Voice & Audio',
    summary: 'ElevenLabs, Cartesia, Suno. Narration vs. music, consent for cloned voices, expressiveness controls.',
    audience: ['media'],
    prereqTopicIds: ['t.generative-media-101'] },

  // ---- Agents — flesh out slots the dev template points at ----
  { id: 't.agents-intro', trackId: 'agents', order: 0, title: 'Agents Introduction',
    summary: 'What an "agent" actually is: plan → act → observe loops, memory, autonomy, where hype ends and engineering starts.',
    audience: ['vibe', 'dev'] },
  { id: 't.prompt-caching', trackId: 'agents', order: 3, title: 'Prompt Caching',
    summary: 'Cut cost and latency on repeat context. Cache points, TTL, what counts as a hit, and when it breaks.',
    audience: ['dev'],
    prereqTopicIds: ['t.tool-use'] },
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

  // ==================== t.ai-literacy ====================
  {
    id: 'l.ai-literacy.intro', topicId: 't.ai-literacy', order: 1, minutes: 9,
    title: 'What AI actually is (and what it isn\'t)',
    summary: 'The single most important lesson: a language model is a really good guesser, not a truth engine. What that means for when to trust it.',
    body: `
**TL;DR** — A large language model is a system that predicts the next word based on patterns from enormous amounts of text. It doesn't *know* things; it produces plausible continuations. Some of those continuations are true. Some are confidently wrong. Telling the difference is the whole job.

## What a model is

An LLM — large language model — is trained by showing it trillions of words and asking, over and over: "what word comes next?" After enough rounds, it gets very good at plausible continuations. That's the entire trick.

It doesn't:

- **Look things up** (unless given tools that do so)
- **Remember the training data** as facts
- **Know the current date** (unless told)
- **Have beliefs, feelings, or intentions**

It does:

- Produce text that sounds like what a thoughtful person would say
- Apply patterns it has seen to new situations
- Fail gracefully-looking on things it never saw

> The model doesn't know Paris is the capital of France. It knows "the capital of France is ___" is almost always followed by "Paris" in its training data. Usually those are the same answer. Sometimes they're not.
> — Source

## Hallucinations

When a model produces confidently-phrased output that is simply false, we call it a **hallucination**. Hallucinations are not bugs; they're a consequence of how the model works. It's trying to predict plausible text, and "plausible" and "true" are not the same.

Classic failure modes:

- **Made-up citations.** Authors, book titles, case law that don't exist.
- **Confident wrong math.** Numbers that sound right.
- **Invented APIs.** Functions and libraries that never shipped.
- **False-but-familiar dates.** "Released in March 2023" when it was April.

The tell is the confidence. A hallucination rarely says "I'm not sure." It says the wrong thing in the same voice as the right thing.

## Trust calibration

Rule of thumb — trust the model most on:

- **General patterns.** How a letter is usually structured. What kinds of things show up in a résumé.
- **Transformations of text you gave it.** Summarising, shortening, rewriting, translating.
- **Things that are easy to verify.** "What does this Python code do?" — you can run it.

Trust it least on:

- **Specific facts you can't check.** Numbers, names, dates, citations.
- **Things that happened recently.** Training cutoffs lag months or years.
- **Your own context.** It doesn't know your company, your kids, your relationship history.

## The habit that matters

Every time you use an LLM, form a tiny mental picture of **how you'd verify this**. If the answer is "I'd just trust it," slow down. If it's "I'd run the code" or "I'd scan the doc," you're in safe territory.
`.trim(),
  },

  // ==================== t.ai-literacy-at-work ====================
  {
    id: 'l.ai-literacy-work.intro', topicId: 't.ai-literacy-at-work', order: 1, minutes: 8,
    title: 'AI literacy at work',
    summary: 'Sign-your-name rule, what never to paste, verifying claims under deadline, and the failure modes that become incidents.',
    body: `
**TL;DR** — At work, an AI hallucination isn't a curiosity — it's a legal filing, a board memo, a client email. The three rules: **verify anything specific, paste nothing confidential, sign your own name.**

## The sign-your-name rule

If your name is on it when it goes out, you own every word. The model helped; you shipped. This doesn't mean don't use AI — it means read before you send, and read as if a lawyer will. If you wouldn't put your name on a phrase a colleague wrote, don't put it on a phrase a model wrote.

## What never to paste

- **Client data with identifying info** (names, account numbers, medical details) into a public model.
- **NDAs, signed contracts, M&A memos, HR files, grievance documentation.**
- **Security secrets** — API keys, passwords, private keys, internal URLs.
- **Code from a codebase with a restrictive license** or a confidentiality agreement.

Check your employer's policy. Most have one now. Enterprise/Team plans with data-retention controls change what's OK. Personal free-tier claude.ai does not.

> "The AI did it" has never won a HIPAA case. "I entered the data" is what shows up in the audit log.
> — Source

## Verifying under deadline

Three classes of claim, three levels of verification:

1. **Names, numbers, dates, quotes, citations.** Verify every single one. These are the most common hallucinations and the most damaging.
2. **Summaries of documents you gave it.** Spot-check 2–3 claims against the source. Hallucinations here are rarer but happen.
3. **Tone, phrasing, transitions, structure.** These you can judge by reading. No external check needed.

## Failure modes that become incidents

- **Hallucinated case law** (Mata v. Avianca, 2023 — sanctioned lawyers). Legal research without verification is misconduct in many bars now.
- **Wrong numbers in a board deck.** "The model generated it" is not a defense.
- **Leaked private data.** Pasting into a public model may surface in another user's response weeks later, under the wrong circumstances.
- **Tone mismatch.** An email that reads like a marketing blast when it should read like a peer.
- **Policy confabulation.** Making up a company policy the model assumed exists.

## Practical habits

- Keep a clipboard of **what-you-pasted-where** until you learn your policy.
- When the model gives you a number, ask it where the number came from. If it can't say, don't use it.
- Before sending anything externally, re-read it out loud once. It catches 80% of the off-tone mistakes.
- Tools that come with data-retention controls (enterprise Claude, ChatGPT Team, etc.) are worth the upgrade for any regulated work.
`.trim(),
  },

  // ==================== t.ai-for-students ====================
  {
    id: 'l.ai-students.intro', topicId: 't.ai-for-students', order: 1, minutes: 8,
    title: 'AI for students — without cheating yourself',
    summary: 'Using AI to actually learn more, not just to finish faster. Integrity lines, privacy, and the specific moves that pay off.',
    body: `
**TL;DR** — AI is a tutor that's always available, infinitely patient, and sometimes wrong. Used well, it's the best study aid of your life. Used lazily, it trains you to produce work you can't reproduce.

## The trap

The lazy path: "write this essay about the French Revolution." You get a passable essay. You learn nothing. You now have a document you can't defend under questioning and a habit that weakens every time you use it.

The value of AI for students isn't **faster output** — it's **more feedback**, **more explanation**, **more practice**. Turn it into a tutor that's never tired of your questions.

## The five moves that pay off

1. **Explain-it-back.** After reading a chapter, ask AI to test your understanding: "ask me five hard questions about X." Answer them. Check yourself.
2. **Simpler, please.** When a textbook is opaque, paste the paragraph and ask: "explain this like I know algebra but not calculus." Iterate on the level.
3. **Practice-problem generator.** Ask for five problems at your level. Check your work. Ask for five more.
4. **Draft-and-critique — on your own draft.** Write the essay. Then ask AI to be a harsh but fair TA and critique your draft. Fix what lands.
5. **Flashcard expander.** Give it your notes; ask for anki-ready Q/A pairs. Drill.

Each of these uses AI to multiply your practice, not to skip it.

## The integrity lines

Different schools have different policies. Universal truths:

- **Submitting AI-written work as yours is cheating.** Always.
- **Using AI to explain a concept is studying.** Basically always.
- **Using AI to brainstorm is grey.** Depends on the course + teacher — ask.
- **Using AI to polish your own draft** is grey. Ask.

When in doubt, **disclose**. "I used Claude to generate practice questions and to check my introduction for clarity." Honesty after the fact beats a surprise investigation.

## Privacy

- Don't paste classmates' work without permission.
- Don't paste your own essays into a public model if your school has a policy against it.
- Don't paste personal information (yours or others') — AI chats can live on servers for a long time.

## When AI is definitely worth it

- Stuck on a homework problem after real effort — ask for a **hint**, not the answer.
- Don't understand a concept your teacher already explained twice — ask for a third framing.
- Studying for a test and running out of practice problems — generate more.
- Writing an essay and unsure about structure — describe your thesis and ask for three possible outlines.

## When it's not

- You haven't read the material. Go read it. The AI can't study for you.
- You're avoiding the hard part. The hard part is the point.
- You're in a timed exam that bans AI. Don't.
`.trim(),
  },

  // ==================== t.models-compared ====================
  {
    id: 'l.models-compared.intro', topicId: 't.models-compared', order: 1, minutes: 9,
    title: 'Picking a model',
    summary: 'Claude, ChatGPT, Gemini — what each is good at, where free tiers land, and how to not overthink it.',
    body: `
**TL;DR** — All the frontier models from Anthropic, OpenAI, and Google are good enough for most tasks. Pick based on access, cost, and workflow fit — not benchmark chasing.

## The big three

### Claude (Anthropic)
Strengths: writing tone, long-document analysis, following instructions carefully, code review, thoughtful long-form responses. Lower tendency to over-agree. Free tier on claude.ai is generous.

### ChatGPT (OpenAI)
Strengths: image generation built in, widest plugin ecosystem, voice mode, long memory across conversations. Ubiquitous — the one most colleagues know.

### Gemini (Google)
Strengths: integration with Google Docs / Gmail / Drive, huge context window, free Advanced tier for many users, multimodal video input.

## The tier landscape

**Free / casual:**
- claude.ai (free) — daily message limit, Haiku + Sonnet.
- chatgpt.com (free) — GPT-5 lite with a daily cap.
- gemini.google.com (free) — generous; Workspace users often get Advanced.

**Paid personal (~$20/mo):**
- Claude Pro — higher limits, access to Opus.
- ChatGPT Plus — GPT-5, image gen, voice.
- Gemini Advanced — 1M context, deep integration.

**Team / enterprise:**
- Each vendor has a business tier with data-retention controls, SSO, admin tools, and the contracts your legal team will ask for.

## Picking for the task

- **Writing / editing / long-form reading** → Claude.
- **Day-to-day Q&A + image gen in one place** → ChatGPT.
- **Integrating with the Google ecosystem** → Gemini.
- **Code at scale** → all three are competitive; pick by the coding tool you use (Cursor, Claude Code, Copilot — each has its own model defaults).
- **Huge documents (books, codebases)** → Claude or Gemini, both support long context.

## How to not overthink it

Three questions:

1. **Free or paid?** If you're unsure how often you'll use AI, start free.
2. **Which ecosystem am I already in?** Google-heavy? Gemini. Microsoft/Copilot? ChatGPT. Anthropic-curious? Claude.
3. **Is one already standard at work?** Use that one; friction-free wins.

## The honest take

Switching costs are low. Most people pay for one and free-tier the others for comparison. Differences that felt huge two years ago have narrowed. **Ship with the one you'll actually open**, not the one that scored 0.4% higher on a benchmark.
`.trim(),
  },

  // ==================== t.tool-use ====================
  {
    id: 'l.tool-use.intro', topicId: 't.tool-use', order: 1, minutes: 10,
    title: 'Tool use basics',
    summary: 'Giving the model hands: defining tools, parsing calls, returning results, and the multi-turn loop that ties it together.',
    body: `
**TL;DR** — "Tool use" is how you let a model do things beyond generating text — call APIs, query databases, run functions. You describe tools; the model decides when to call them; your code runs them; you hand results back. It's a loop.

## The shape

You call the Messages API with:

- Your usual system + user messages.
- A \`tools\` array — each tool has a name, description, and JSON schema for inputs.

The model can reply with either normal text OR a \`tool_use\` block — a request to call one of your tools with specific inputs. Your code runs it and continues the conversation with a \`tool_result\` block containing the output. The model reads the result and decides what to do next.

\`\`\`json
{
  "role": "assistant",
  "content": [
    { "type": "tool_use", "id": "tu_1",
      "name": "get_weather",
      "input": { "city": "Austin" } }
  ]
}
\`\`\`

You run \`get_weather("Austin")\`, then send back:

\`\`\`json
{
  "role": "user",
  "content": [
    { "type": "tool_result", "tool_use_id": "tu_1",
      "content": "72°F, sunny" }
  ]
}
\`\`\`

The model continues with a natural-language reply that uses the result.

## What a good tool looks like

- **Narrow.** One job per tool. "get_weather" beats "do_stuff_with_weather".
- **Named like a function.** \`search_docs\`, \`create_ticket\`, \`run_sql\` — verb_noun.
- **Described well.** The description field is what the model reads to decide when to call. Spend time on it.
- **Strict input schema.** Specify types, required fields, enums. The tighter the schema, the fewer malformed calls.

## The multi-turn loop

Real tool use often spans multiple turns:

1. User: "how busy is the office this week?"
2. Model: tool_use → \`get_calendar_events(week=current)\`
3. You run it; send back tool_result with JSON.
4. Model: tool_use → \`count_meetings_per_day(events=[...])\`
5. You run it; send back.
6. Model: "You have 12 meetings Monday, 7 Tuesday, …"

Each turn is a separate API call. Some SDKs wrap this loop for you (the Anthropic SDK has \`tool_helpers\` utilities).

> Tools don't make the model smarter. They make it *able to act*. Smart is your job — the tools, their descriptions, and when to trust a multi-call plan.
> — Source

## Common failure modes

- **Vague tool names.** \`process_data\` — the model can't guess when to call it.
- **Too many tools at once.** More than ~15–20 tools and the model starts hallucinating names that don't exist.
- **Loops without a budget.** Set a maximum turn count in your code; don't trust the model to stop.
- **Returning giant tool_results.** Summarise or paginate. Dumping a 50k-token file into a tool_result burns your context window.

## Where it leads

Tool use is the foundation for **agents** — systems that plan, act, observe, and iterate. Once the loop works, you can layer memory, retries, parallelism, and higher-level orchestration on top.
`.trim(),
  },

  // ==================== t.agents-intro ====================
  {
    id: 'l.agents-intro.intro', topicId: 't.agents-intro', order: 1, minutes: 9,
    title: 'Agents introduction',
    summary: 'What "agent" actually means once you strip the hype: a plan-act-observe loop with memory. What\'s real, what\'s hard, where people overbuild.',
    body: `
**TL;DR** — An agent is a system that takes a goal, plans steps to reach it, takes actions (via tool use), observes the results, and iterates. The loop is simple. Making it reliable is not.

## The definition that survives scrutiny

Strip the hype; an agent is:

1. **A goal** — a user-stated outcome ("book me a flight under $400").
2. **A loop** — the model plans → acts (tool call) → observes (tool result) → decides what to do next, repeating until done or stuck.
3. **Memory** — what's been tried, what worked, what didn't. Some of it is just the conversation history; some is more durable.
4. **Stop conditions** — max turns, max cost, max time, or an explicit success signal.

An "AI chatbot that occasionally calls a tool" is on the weak end of agent. A "deploy-and-ship system that runs for hours without human input" is on the strong end.

## Why agents are hard

Tool use is a one-step action. An agent is many tool-use steps in sequence, with the model deciding what comes next each time. Three places this breaks:

- **Compounding errors.** A 95%-reliable step is 77% reliable after five steps, 60% after ten.
- **Context rot.** The conversation history grows; the model gets distracted by irrelevant earlier steps.
- **Getting stuck.** The model retries the same failing action in a loop. Your code has to notice and intervene.

> Agents feel like magic when they work. The work is in the 20% of runs where they don't, and what you do in that 20%.
> — Source

## Patterns that help

### Plan-then-act
Ask the model to produce the plan as step-list first, get user buy-in, then execute. Claude's "extended thinking" + explicit planning prompts are well-suited.

### Sub-agents
Break a long task into pieces. Each piece is a fresh, short conversation — no context rot. A top-level coordinator dispatches, each sub-agent returns a result.

### The 80/20 handoff
Let the agent do the mechanical 80%; it hands back to the human for the last 20% (review, choice, sign-off). Most production agents are 80/20, not 100%.

### Guardrails
- **Max turns** — hard limit, enforced by your code.
- **Max cost** — track tokens; bail if budget exceeded.
- **Human-in-the-loop for irreversible actions** — deleting files, sending emails, spending money.

## When to reach for an agent

- The task is **multi-step** and the steps aren't fixed in advance.
- There's **ambiguity** — the model needs to check things before deciding the next move.
- The **reward for full automation** outweighs the cost of occasional bad runs.

## When not to

- The task is a **single call** — just use tool use.
- The task is **fully deterministic** — write a script.
- The cost of a bad run is catastrophic (financial, legal, safety). Use a checklist + human, not an agent.

## What's next

Two directions: (1) go deeper — tool use in multi-turn, memory patterns, the agent SDK. (2) go wider — connecting agents to the outside world via MCP, the emerging standard for agent tool access.
`.trim(),
  },

  // ==================== t.prompt-caching ====================
  {
    id: 'l.prompt-caching.intro', topicId: 't.prompt-caching', order: 1, minutes: 9,
    title: 'Prompt caching',
    summary: 'The highest-leverage SDK feature: cache repeat context so you pay for it once. How cache points work, TTLs, and the classic "why isn\'t it hitting" bugs.',
    body: `
**TL;DR** — Prompt caching lets the model remember large chunks of your prompt (system message, tool definitions, big docs) between calls, at a fraction of the per-token cost. For any agent or long-context app, it's the single biggest cost + latency win you can deploy today.

## Why it matters

Without caching, every API call re-processes every token of your prompt. With caching, processed tokens are stored on the provider side for a short TTL; subsequent calls that reuse the same prefix pay a small fraction of the normal input cost and run faster.

Typical savings:

- **Cost:** cached-read tokens are ~10% of normal input cost on Anthropic's API.
- **Latency:** first-byte time drops by half to two-thirds for long, repeat-context prompts.

In an agent loop that reuses a 20k-token system + tool definitions + doc context over 20 turns, caching pays for itself within the first two turns.

## How it works

You mark **cache points** in your messages using a \`cache_control\` block on the last content item you want cached.

\`\`\`ts
messages: [
  { role: "user", content: [
    { type: "text", text: bigDoc,
      cache_control: { type: "ephemeral" } },
    { type: "text", text: userQuestion },
  ]},
]
\`\`\`

Everything **up to and including** the marked block is cached as a prefix. The next request that uses the exact same prefix gets a cache hit.

## The prefix rule

Caches are **prefix-based**. The model can only reuse a cache if everything before and including the cache point is byte-identical to a previous call. One character different = cache miss.

Practical consequences:

- Put stable content (system prompt, tools, big docs) at the **top** of your messages.
- Put dynamic content (the user's current question) **after** the cache point.
- Reorder nothing between calls unless you mean to invalidate.

## TTL

Default cache lifetime is **5 minutes**. Extended cache is available on some models (1 hour, higher cost). A cache is only alive while something keeps hitting it — there's no hard guarantee it survives idle time.

Rule of thumb: if your agent is active every few minutes, default TTL is fine. If calls are bursty (every hour), extended TTL or no caching may be the right call.

## Classic "why isn't it hitting" bugs

1. **Appended a timestamp or request ID** to the system prompt. Every request is unique; nothing caches.
2. **Tool definitions reordered.** The SDK may re-serialize tools; serialize yourself to guarantee byte-stability.
3. **User ID or session token baked into the prefix.** Different users never share a cache; their cache points should be after user-specific content, not before.
4. **Model version changed.** Caches don't survive model upgrades.
5. **Cache point after the dynamic content.** Cache content must be at the start of the prefix, not the end.

## When to skip caching

- Prompts under ~1024 tokens — caching has a minimum cacheable size.
- One-shot calls with no expected repeat.
- Highly dynamic prompts where the stable portion is small.

## The habit

For any long-running app — an agent, a chatbot with big system context, a doc-QA system — **set up caching first**, before tuning anything else. The cost graph bends immediately.
`.trim(),
  },

  // ==================== t.claude-for-office ====================
  {
    id: 'l.claude-office.intro', topicId: 't.claude-for-office', order: 1, minutes: 8,
    title: 'Claude as a coworker',
    summary: 'Projects, custom instructions, and getting past "is this better than Google?" to an actual daily habit.',
    body: `
**TL;DR** — The mindset that unlocks Claude for office work: treat it like a coworker who just started, eager to help, needs context you'd give a new hire. Projects and custom instructions are how you give that context once instead of every conversation.

## The shift

Most people's first weeks with Claude feel like a better Google. That's fine for quick Q&A but misses the real value. The shift: **Claude isn't a search engine; it's a coworker you can delegate to**. Coworkers need:

- Context about your role, team, and goals.
- The documents you're working from.
- A sense of your tone and standards.

You give a human new hire all of that in the first week. Give Claude the same, once.

## Custom instructions

In claude.ai settings, "custom instructions" are a short description of who you are and how you work. Claude sees them on every conversation. Example:

> I'm a Director of Marketing at a 200-person B2B SaaS company. I write in a direct, warm, specific voice — short sentences, concrete examples, no jargon. I prefer bullet points for action lists and prose for reasoning. When I ask for a draft, assume the audience is a C-suite peer unless I say otherwise.

That one paragraph removes three rounds of "please make it shorter, less jargon, more like a peer" from every future conversation.

## Projects

**Projects** are persistent conversations + a knowledge base. Upload your style guide, your last five board decks, your team roster, the product roadmap. Every conversation in that project has access to those files.

Good project shapes:

- **"Q2 Board Update"** — last board deck, OKRs, key metrics. Every iteration of this deck happens here.
- **"Sales Enablement"** — product one-pager, case studies, objection handling. Every rep email gets drafted here.
- **"Onboarding Buddy"** — company handbook, team org chart. New hires can ask it anything.

The trick: a **specific, scoped** project beats one giant "work project." Five small projects; not one dumping ground.

## The coworker patterns

- **Draft, then critique.** "Here's my first cut; tell me what's missing and what's weak." Claude is better as a critic than as a first-drafter.
- **Rubber duck.** "I'm thinking about X. Talk through the tradeoffs with me." Often you'll solve it yourself, just by explaining.
- **Translator.** "Rewrite this for engineering" or "rewrite this for finance." Same content, different dialect.
- **Meeting shadow.** Paste the transcript; ask for a summary, then for follow-ups, then for "what did people not say but probably mean."

## What breaks the coworker illusion

- Asking for things it can't verify (specific numbers, recent news, personal details you haven't given it).
- Treating it like a search engine — then being surprised by hallucinated citations.
- Never reading the output carefully. It's a junior coworker; review accordingly.

## The habit

Once per Monday morning: open the project that matches what you're working on this week. Put three things into it — today's agenda, this week's goal, the one doc everything keys off. Every conversation that week starts with context already there.
`.trim(),
  },

  // ==================== t.docs-with-ai ====================
  {
    id: 'l.docs-ai.intro', topicId: 't.docs-with-ai', order: 1, minutes: 8,
    title: 'Document work with AI',
    summary: 'The five doc-work shapes — draft, rewrite, shorten, tone-shift, summarise — and the prompts that pull them cleanly.',
    body: `
**TL;DR** — Most office-doc work is five moves: **draft, rewrite, shorten, tone-shift, summarise**. Name the move, give context, specify format. Everything else is variation.

## 1. Draft

Start from a blank doc, end with a first pass.

Prompt shape: **"You're [role]. Draft [artifact] for [audience] about [topic]. Tone: [adjectives]. Length: ~[word count]. Format: [structure]."**

Example:
> You're a senior PM. Draft a one-page product brief for the leadership team about launching a premium tier. Tone: confident, specific, no hype. ~300 words. Format: problem → proposal → risks → ask.

Don't expect a finished doc. Expect a starting point worth editing.

## 2. Rewrite

Take something you have and remake it.

Prompt shape: **"Rewrite the following to [change]. Keep [what to preserve]. Here's the text: [paste]."**

Common changes:

- "Cut the hedging — every 'maybe' and 'possibly' goes."
- "Make it more concrete. Every claim gets a number or an example."
- "Punch up the opening. First sentence should make a senior exec keep reading."
- "Match the voice of this sample: [paste exemplar]."

## 3. Shorten

The highest-ROI move in office writing.

Prompt shape: **"Shorten this to [length] without losing [key points]: [paste]."**

Tips:

- Specify a word count or line count. "Shorter" is subjective.
- Name what must survive. Otherwise the model cuts the wrong thing.
- Iterate. First pass loses 30%; third pass loses 70% while staying strong.

## 4. Tone-shift

Same content, different voice.

Prompt shape: **"Rewrite this [from tone] to [to tone]. Here's the text: [paste]."**

Useful axes:

- Formal ↔ casual
- Neutral ↔ warm
- Direct ↔ diplomatic
- Peer ↔ executive ↔ technical

Watch for over-shifting. "More casual" often lands on "too casual for work." Name a concrete target ("match the voice of a Slack post from a senior colleague").

## 5. Summarise

Extract the shape of a long thing.

Prompt shape: **"Summarise [doc] for [audience], ~[length]. Answer: [specific questions]."**

The classics:

- **TL;DR for an exec.** Two sentences; what it is, what's asked.
- **Bulleted action list** from a transcript.
- **Decision log** from a thread.
- **Structured extract** — names, dates, numbers — from a long report.

For a summary you'll ship: **spot-check 2–3 claims against the source**. Summaries hallucinate, especially quotes and numbers.

## The meta-move: specify the audience

Every single one of these gets better when you name the audience. "Summarise this" is weaker than "summarise this for a CFO who has 90 seconds." The audience fixes tone, length, and what matters — all at once.

## Reusable prompt templates

Build three to five of your most-used prompts into text expander snippets or a project's "starter" doc. The first time you write one, it takes ten minutes. The thousandth time you use it, it takes one.
`.trim(),
  },

  // ==================== t.meetings-with-ai ====================
  {
    id: 'l.meetings-ai.intro', topicId: 't.meetings-with-ai', order: 1, minutes: 7,
    title: 'Meetings with AI',
    summary: 'Before, during, after. Prep, notes, summaries, follow-ups — the shape of AI-assisted meeting work.',
    body: `
**TL;DR** — A meeting has three phases. **Before:** prep with AI. **During:** capture with a transcription tool. **After:** summarise, extract actions, draft follow-ups. Each phase has a specific, low-effort prompt that pays.

## Before — prep

Inputs: the invite, any pre-read, your goals for the meeting.

Useful prompts:

- **"Write a one-sentence goal for this meeting based on the invite and pre-read."** Forces you to name it.
- **"Draft an agenda with three items, 15 minutes each, leaving 15 for discussion."** Now you have something to share.
- **"What objections might [attendee] raise? What would good answers be?"** Ten minutes of this is worth more than an hour of reading old threads.
- **"Summarise the pre-read in 150 words, flagging decisions I need to come in with a view on."**

## During — capture

Don't try to take notes while running a meeting. Use a transcription tool (Otter, Fathom, Granola, Claude's own voice-memo + transcript flow, Zoom's built-in). Let it run. You can feed the transcript to AI afterwards.

If you must take notes yourself, the **three-column** shape beats prose:

| Decision | Owner | Due |

## After — summarise + follow-ups

Inputs: the transcript or your notes.

Useful prompts:

- **"Summarise this transcript in ~200 words. Structure: decisions made, action items (owner + due), open questions."** This is the ur-prompt. Run it on every meeting.
- **"Draft a follow-up note to attendees based on the summary. Warm, short, direct. Include the action-item table."** Paste the summary back in.
- **"What did people not say but probably think?"** Useful for high-stakes meetings. Read with judgment; this is the most hallucination-prone prompt of the set.
- **"Translate this decision into an announcement for the broader team, ~100 words, no internal jargon."** When a meeting decision needs to cascade.

## The weekly rollup

One meeting is easy. Five meetings a day is a mess. Once a week, paste every meeting summary from the week and ask:

> Across these meetings, what are the top three themes? What's blocked? What decisions are still open from more than a week ago?

Ninety seconds of work produces the shape of your week. Use it to drive next week's planning.

## Watch-outs

- **Transcripts contain PII.** Attendee names, sometimes customer names, sometimes details that aren't for public models. Check your data policy.
- **Quotes in summaries hallucinate.** If you're going to attribute a specific phrase to a specific person, verify it against the transcript.
- **The "what did people not say" prompt is speculation.** Great for brainstorming; dangerous to share back as fact.

## The rhythm

Five minutes before the meeting: run the prep prompt. Five minutes after: run the summary prompt + draft the follow-up. A whole week of meetings gets 50 minutes of AI touchpoints, produces an artifact for every one of them, and leaves you with a weekly digest. That's the value.
`.trim(),
  },

  // ==================== t.generative-media-101 ====================
  {
    id: 'l.gen-media-101.intro', topicId: 't.generative-media-101', order: 1, minutes: 9,
    title: 'Generative media 101',
    summary: 'What "generative" means, hallucinated hands, the rights landscape, and what platforms will and won\'t accept.',
    body: `
**TL;DR** — Generative media models sample from a learned style-space; they don't edit footage or retrieve images. That shapes everything: what they're good at, where they fail, what rights you have, and what you can actually ship.

## What "generative" means

A generative image model has seen millions of images and learned a mathematical space where similar images cluster. When you prompt, it starts with noise and iteratively denoises toward a point in that space your prompt describes.

It is **not** a search engine — it's not pulling existing images. It is **not** an editor — it's not modifying a photo you gave it (outside specific inpainting modes). It **generates** — samples a new thing that fits the description.

Same pattern for video, audio, and voice: sampled from a learned distribution, not retrieved.

## Creator-side literacy

### Hallucinated hands (and text, and physics)
Generative image models famously struggle with:

- **Hands** — extra fingers, wrong anatomy.
- **Text** — gibberish letterforms unless the model is specifically trained for typography (Ideogram, newer Nano Banana).
- **Physics** — water, reflections, gravity in complex scenes.
- **Consistent characters across shots** — solved better with reference features now, but still imperfect.

Expectation calibration saves hours. Don't prompt "holding a phone with 'Pizza' on the screen" and be shocked when the phone says "Piaza" — that's the state of the art.

### Style-stealing and the training-data question
Models trained on the internet learned from images they didn't license. Some artists (Greg Rutkowski most famously) became "style words" early on. Legally: an active area of litigation. Ethically: contested. Practically: most paid platforms now have style-mimicry guardrails and offer opt-out for artists.

Rule of thumb: **don't prompt in the name of a living artist**. It's legally grey, ethically questionable, and many platforms flag it anyway.

### Deepfakes + consent
Generating a real person's likeness — especially saying or doing something they didn't — is now regulated in many jurisdictions (US state laws, EU AI Act). Voice cloning is under similar scrutiny. Required, always: **consent from the person whose likeness or voice you're cloning.**

## Rights you have — and don't

**You generally own the output you generate**, to the extent copyright applies. US Copyright Office has ruled purely AI-generated work may not be copyrightable; human creative input (composition, editing, arrangement) strengthens your claim.

**You don't get rights to style.** Styles aren't copyrightable. Prompting "in the style of Ghibli" produces a lookalike — no Ghibli rights to you or infringement claim from Ghibli over pure style.

**You don't get rights to depicted people.** A generated image of a real celebrity isn't yours to use commercially; it's still their likeness.

## What platforms accept

As of 2026:

- **YouTube / TikTok** — require disclosure of AI-generated content that's realistic or depicts real people.
- **Instagram / Facebook** — same; auto-detecting and labeling.
- **Stock photo sites** — mixed. Some allow with disclosure; some ban outright.
- **Major ad networks** — usage rules evolving; consent + human-in-the-loop expected.

Every platform's policy changes quarterly. The safe defaults:

1. **Disclose** when output is AI-generated or depicts a real person.
2. **Don't clone voices or faces without written consent.**
3. **Don't submit AI output where the platform bans it** (some commercial licensing still does).

## The working attitude

Generative media is a collaborator, not a printer. Use it as one layer in your workflow — you're still the director, the editor, and the owner of the final artifact.
`.trim(),
  },

  // ==================== t.image-generation ====================
  {
    id: 'l.image-gen.intro', topicId: 't.image-generation', order: 1, minutes: 9,
    title: 'Image generation',
    summary: 'Midjourney / Nano Banana / Ideogram / Flux — what each is best at, the prompt anatomy that works, and the iteration loop.',
    body: `
**TL;DR** — Different image models have different strengths. Midjourney for painterly / cinematic. Nano Banana for edit-and-iterate on a reference. Ideogram for text-in-image. Flux for photoreal + speed. The prompt shape is the same across all: **subject, composition, style, lighting, mood, negatives**.

## The model landscape

### Midjourney
Best for: cinematic, painterly, conceptual art. Has the strongest "default aesthetic" — outputs look professional with minimal prompting. Discord-native, also web app.

### Nano Banana (Google Gemini image)
Best for: iterating on a reference image. Upload a photo, describe the change, get a clean edit. Much better than most for "keep this character, change the scene."

### Ideogram
Best for: text inside images. If your prompt involves words on a sign, a poster, a book cover — this is the one. Competitive for general image gen too.

### Flux (Black Forest Labs)
Best for: photorealistic, fast, cheap. Open-weight variants available; the commercial Pro tier is competitive with Midjourney.

### DALL-E / ChatGPT image
Best for: accessibility. It's in the same app you already have. Quality is good, not SOTA. Use for quick one-offs.

## Prompt anatomy

The six slots that carry most of the signal:

1. **Subject** — what's in the frame. "A red fox."
2. **Composition** — framing, angle, shot type. "Close-up, low angle, shallow depth of field."
3. **Style** — medium + aesthetic. "Oil painting, impressionist brushwork" or "35mm film photo, Kodachrome."
4. **Lighting** — direction, quality, time of day. "Golden-hour sidelight, warm tones."
5. **Mood** — emotional register. "Melancholic, quiet."
6. **Negatives** (in models that support them) — what to exclude. "No text, no watermark, no people in background."

Stack them. A strong prompt is rarely under 20 words.

> Prompting an image model is describing a photograph that doesn't exist yet. Every omission becomes a random choice the model makes for you.
> — Source

## The iteration loop

1. **Generate four variants** from one prompt. Pick the closest.
2. **Pull on the thread.** Re-prompt with a refinement: "more dramatic lighting, closer framing."
3. **Lock the seed** (where supported) when you find a composition you love. Iterate on style with the same composition.
4. **Upscale** the final — most models produce ~1024px; upscale for print or hero use.

Plan on 10–30 iterations for a polished hero image. The first output is almost never the one.

## Reference images

Modern models accept reference images for:

- **Style transfer** — "make my scene in the style of this reference."
- **Character consistency** — "same character as this reference, different pose."
- **Composition guides** — some models accept a sketch or pose as a structural guide (ControlNet on open models; similar features on Midjourney).

Reference features cut iteration time dramatically. Use them.

## Cost reality

- Midjourney: ~$10–30/mo subscription, unlimited.
- Nano Banana: pay-per-generation, small amount per image.
- Ideogram: generous free tier; paid for more.
- Flux commercial: per-image fees.

A week of learning costs $10–30. Generate a lot; you'll internalise the models' defaults faster than reading.

## The craft

Iteration beats first-shot magic. A serious image workflow spends most of its time in steps 2–3 of the loop — refining, re-running, picking. Get comfortable generating 50 images to get one, and the medium clicks.
`.trim(),
  },

  // ==================== t.video-generation ====================
  {
    id: 'l.video-gen.intro', topicId: 't.video-generation', order: 1, minutes: 9,
    title: 'Video generation',
    summary: 'Veo, Sora, Runway. Shot prompting, first/last-frame conditioning, and the cost + duration reality that shapes every project.',
    body: `
**TL;DR** — Generative video is real in 2026. The tools (Veo 3, Sora 2, Runway Gen-4) can produce ~8–30 second clips with coherent motion. They still can't make a feature film. The craft is in **shot planning, conditioning, and stitching** — not one-shot prompting.

## The model landscape

### Veo (Google)
Best for: photorealism + physics + long takes (up to 60s on latest versions). Syncs audio. Strong camera motion understanding.

### Sora (OpenAI)
Best for: imaginative, stylised scenes. Strongest at surreal content that breaks physics deliberately. Character consistency improved in Sora 2.

### Runway (Gen-4)
Best for: editing + remixing existing footage. Strongest "act on a reference" tools. Favorite of working video editors.

### Kling
Best for: cost + speed. Competitive quality; cheaper per-second than Veo / Sora.

## Shot prompting

Video prompts follow image-prompt anatomy **plus** motion and camera:

1. **Subject + composition** — same as image.
2. **Motion** — what moves, how. "The fox turns its head slowly toward camera."
3. **Camera** — static, pan, dolly, zoom, handheld. "Slow push-in, shallow depth of field."
4. **Duration** — most models: 5–10 seconds is a natural unit.
5. **Mood + style** — same as image.

The common beginner mistake: over-specifying motion. "The fox jumps, then runs, then climbs a tree, then barks." One model; ten seconds. Pick one motion. One beat per clip.

## First- and last-frame conditioning

The single biggest craft tool: anchor a clip to a start image and/or an end image. You generate a pair of images in your image model, then ask the video model to animate between them.

Why it works: video models drift. Anchoring both ends keeps the scene coherent. It also lets you stitch shots — end frame of clip A = start frame of clip B.

## The stitching workflow

Real generative video is shot-by-shot:

1. **Storyboard.** One panel per intended shot; 8–30 panels for a minute of video.
2. **Generate a key frame per shot** using your image model.
3. **Animate each shot** to 5–10s using first-frame conditioning (and last-frame where useful).
4. **Assemble** in an editor (DaVinci, CapCut, Premiere). Trim to pace. Add audio.
5. **Ripple fixes** — when a shot doesn't cut cleanly, regenerate the offending shot, not the whole thing.

A polished 60-second video takes 20–80 generations. Most of those are iterations of the same 8–12 shots.

## Cost reality

Video is expensive. Rough 2026 numbers:

- A 10-second Veo clip: $2–5.
- A 10-second Sora clip: similar.
- A 10-second Kling clip: ~$1.
- 100 iterations on a 60-second piece: $100–500.

Plan your budget before the session. It goes fast.

## Duration reality

No current model does coherent storytelling past ~60 seconds. Longer pieces are editorial constructs — many clips, humans cutting between them. Don't plan for "prompt a 2-minute short"; plan for "generate 20 shots and edit them into 2 minutes."

## Audio

- Veo 3 generates synchronised audio (dialog + SFX + music) directly with the video.
- Sora 2 same.
- Older tools require separate audio generation (ElevenLabs for voice, Suno for music, Freesound for SFX) edited in post.

Sync matters. Out-of-sync audio breaks the illusion harder than visual glitches do.

## The craft

Generative video rewards planning. Prompt, generate, regenerate, pick, stitch, polish. One-shot prompting produces demos; real work produces sequences.
`.trim(),
  },

  // ==================== t.voice-and-audio ====================
  {
    id: 'l.voice-audio.intro', topicId: 't.voice-and-audio', order: 1, minutes: 8,
    title: 'Voice & audio',
    summary: 'ElevenLabs for voice, Suno for music — expressiveness controls, consent for cloning, and when to narrate vs. generate.',
    body: `
**TL;DR** — Voice generation is production-ready in 2026 — realistic narration, cloned voices with consent, expressive delivery. Music generation is competitive — full tracks from a prompt. Both are powerful creative tools; both have consent + disclosure obligations you need to know cold.

## Voice — the players

### ElevenLabs
Market leader. Best quality, widest language coverage, most nuance controls. Voice cloning from 1–3 minutes of reference. Strongest for audiobooks, narration, dubbing.

### Cartesia
Real-time focused — sub-100ms latency for streaming applications. Strong for interactive agents, phone use cases, live voice.

### Play.ht, Descript (Overdub), Google Cloud TTS
Varied strengths. Descript integrates with its video/podcast editor (edit text, audio updates).

## Voice patterns

### Read-aloud / narration
Point a model at your text; get a narrated audio track. Best when: the text is long, the voice is neutral, and consistency matters across chapters (audiobooks, podcasts, e-learning).

### Cloned voice — with consent
The model clones a specific voice from a short sample. You must have explicit consent from the person being cloned. Without it, you're in legal grey-to-black territory (see the generative-media-101 lesson on consent + disclosure).

### Expressive voice / character
Generate multiple characters for a scene. Most tools expose tone controls (happy, somber, urgent) and emphasis markers in the input text.

## Expressiveness controls

Two layers:

1. **Voice choice** — select a voice that already carries the tone you want.
2. **In-text markup** — most tools accept markers: ellipses for pauses, capitalisation for emphasis, explicit `[laughs]` or `[whispers]` tags. Read the model's docs; conventions differ.

Writing for voice is different from writing for the eye. Short sentences land better. Commas pace breath. Read your script out loud before generating — if it's awkward to read, it'll sound awkward.

## When to narrate vs. when to generate

- **Narration is you, captured cleanly.** Use when your voice IS the product (you as a creator, a teacher, a host).
- **Generated voice is anonymous utility.** Use for language localisation, consistency across long-form content, situations where "a voice" is enough and "your voice" isn't needed.
- **Voice cloning** bridges the two: you want your voice but you don't want to record. Consent from yourself is easy; don't clone anyone else.

## Consent — the non-negotiable

Cloning someone else's voice without consent is now illegal in many US states (e.g., Tennessee ELVIS Act) and broadly restricted under the EU AI Act. Beyond legality: it's a trust bomb. If it ever gets out that you cloned without consent, every project you touch is downstream of that.

Required for cloned voices:

- **Written consent** from the person being cloned.
- **Disclosure** in publication (many platforms now require it).
- **Scope** — consent for this project, not "all future projects forever."

## Music — Suno + friends

Suno and Udio generate full instrumental or vocal tracks from a text prompt. Pick a genre, mood, lyrics (optional), and get a 2–4 minute track.

Good fits:

- Background music for video.
- Demos for a musician's own song before recording.
- Personal projects, hobby content, ambient for study.

Weaker fits:

- Music you want to own exclusively — license terms vary; some generate public-domain outputs, some grant exclusive rights, read the fine print.
- Matching a specific existing artist's style — ethically and legally the same territory as image-model style prompting.

## SFX — Freesound + generative

For sound effects:

- **Freesound** — enormous free library, cc-licensed.
- **ElevenLabs SFX** — generate specific sounds from prompts (footsteps on gravel, door opening).
- **Generative SFX models** — improving fast in 2026.

## The integrated flow

A YouTube video with generated voice + generated music + generated SFX: technically possible, often the right move for low-budget content. Check each tool's license terms for commercial use; most allow it on paid tiers.
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

  // ==================== q.ai-literacy ====================
  {
    id: 'q.ai-literacy', topicId: 't.ai-literacy', title: 'AI literacy check',
    questions: [
      { kind: 'mcq', id: 'q.lit.1',
        prompt: 'Which is the most accurate description of what an LLM does?',
        choices: [
          'Looks up facts in a database',
          'Predicts the next word based on patterns from training text',
          'Reads live from the internet',
          'Applies reasoning like a human brain',
        ],
        answerIdx: 1,
        explain: 'An LLM is a next-token predictor. Everything else flows from that.' },
      { kind: 'mcq', id: 'q.lit.2',
        prompt: 'What is a "hallucination"?',
        choices: [
          'A bug in the model code',
          'Confidently-phrased output that is simply false',
          'When the model refuses to answer',
          'Slow response time',
        ],
        answerIdx: 1,
        explain: 'A hallucination is plausible-sounding output that isn\'t true. Not a crash; a feature of how the model works.' },
      { kind: 'mcq', id: 'q.lit.3',
        prompt: 'Which task should you trust the model MOST on?',
        choices: [
          'Citing a specific academic paper',
          'Summarising a document you just gave it',
          'Telling you yesterday\'s news',
          'Doing tax math you can\'t verify',
        ],
        answerIdx: 1,
        explain: 'Transformations of text you gave it are safer than facts you can\'t verify.' },
      { kind: 'mcq', id: 'q.lit.4',
        prompt: 'The "tell" of a hallucination is usually…',
        choices: [
          'Spelling errors',
          'Confidence — it says the wrong thing in the same voice as the right thing',
          'Refusal language',
          'Tokenizer failures',
        ],
        answerIdx: 1,
        explain: 'Hallucinations rarely say "I\'m not sure." The confident voice is the warning sign.' },
      { kind: 'short-answer', id: 'q.lit.5',
        prompt: 'What should you form a mental picture of before trusting any specific claim? (3–4 words)',
        pattern: 'how.*(verify|check|confirm)',
        placeholder: '"how I\'d …"',
        explain: '"How I\'d verify this." If the answer is "I\'d just trust it," slow down.' },
      { kind: 'ordered-steps', id: 'q.lit.6',
        prompt: 'Rank these claims from "most safe to trust" to "most risky to trust."',
        steps: [
          'A summary of the document you just pasted in',
          'General advice about how to structure a résumé',
          'A specific date or number you can\'t easily verify',
          'A quote attributed to a named public figure',
        ],
        correctOrder: [0, 1, 2, 3],
        explain: 'Document summary (safest) → general patterns → unverifiable specifics → attributed quotes (riskiest).' },
    ],
  },

  // ==================== q.ai-literacy-at-work ====================
  {
    id: 'q.ai-literacy-work', topicId: 't.ai-literacy-at-work', title: 'AI literacy at work',
    questions: [
      { kind: 'mcq', id: 'q.lw.1',
        prompt: 'The "sign your name" rule says…',
        choices: [
          'Always disclose AI use to coworkers',
          'If your name goes on it, you own every word — read before you send',
          'Always attribute AI output as a coauthor',
          'Sign every AI-generated doc with a visible AI watermark',
        ],
        answerIdx: 1,
        explain: 'You own what ships under your name, regardless of who (or what) drafted it.' },
      { kind: 'mcq', id: 'q.lw.2',
        prompt: 'Which is the BIGGEST red flag to paste into a free public model?',
        choices: [
          'A blog post draft',
          'An NDA with client names and case numbers',
          'Your meeting agenda',
          'A question about Excel formulas',
        ],
        answerIdx: 1,
        explain: 'Confidential legal documents into a public model is the classic career-ending mistake.' },
      { kind: 'mcq', id: 'q.lw.3',
        prompt: 'The model produces a summary of a report with three specific numbers. What do you do before sharing it?',
        choices: [
          'Trust the numbers; summaries are safe',
          'Spot-check each number against the source report',
          'Change the numbers to look nicer',
          'Add a disclaimer and ship it',
        ],
        answerIdx: 1,
        explain: 'Specific numbers in a summary are a classic hallucination site. Verify.' },
      { kind: 'mcq', id: 'q.lw.4',
        prompt: 'You\'re drafting a legal brief under time pressure. The model offers three case citations. Safe move?',
        choices: [
          'Ship with the citations',
          'Verify every citation in a real legal database before using',
          'Trust citations if the model seems confident',
          'Ask the model to double-check itself',
        ],
        answerIdx: 1,
        explain: 'Mata v. Avianca (2023): sanctioned lawyers who did not verify AI citations. The model cannot check itself.' },
      { kind: 'short-answer', id: 'q.lw.5',
        prompt: 'One word: what kind of plan changes the rules on what data you can paste?',
        pattern: 'enterprise|business|team',
        placeholder: 'one word',
        explain: 'Enterprise / business / team plans with data-retention controls, not free-tier.' },
      { kind: 'mcq', id: 'q.lw.6',
        prompt: '"The AI did it" as a defense in a HIPAA incident will…',
        choices: [
          'Exonerate you',
          'Transfer liability to the AI vendor',
          'Not work — the audit log records you pasted the data',
          'Be accepted if you disclose it proactively',
        ],
        answerIdx: 2,
        explain: 'Liability sits with whoever entered the data. The audit log is clear.' },
    ],
  },

  // ==================== q.ai-for-students ====================
  {
    id: 'q.ai-students', topicId: 't.ai-for-students', title: 'AI for students',
    questions: [
      { kind: 'mcq', id: 'q.stu.1',
        prompt: 'Which use of AI gives you the most learning, not just the most output?',
        choices: [
          'Asking it to write your essay for you',
          'Asking it to generate 5 hard practice questions on a chapter',
          'Asking it to do your homework and explain briefly',
          'Copy-pasting the question and submitting the answer',
        ],
        answerIdx: 1,
        explain: 'Practice-problem generation multiplies your practice — the thing learning is made of.' },
      { kind: 'mcq', id: 'q.stu.2',
        prompt: 'The textbook explains a concept in a way you don\'t understand. Best AI move?',
        choices: [
          'Submit whatever it says as your answer',
          'Ask AI to explain the same concept at a simpler level; iterate until you get it',
          'Paste the whole chapter and ask for the TL;DR',
          'Skip the concept and move on',
        ],
        answerIdx: 1,
        explain: 'Use AI as a re-explainer. Learn; don\'t skip.' },
      { kind: 'mcq', id: 'q.stu.3',
        prompt: 'Is submitting AI-written work as your own cheating?',
        choices: [
          'No — you prompted it',
          'Depends on the course',
          'Yes — universally cheating',
          'Only if you don\'t credit the AI',
        ],
        answerIdx: 2,
        explain: 'Submitting AI-written work as yours is cheating across every policy framework we know.' },
      { kind: 'mcq', id: 'q.stu.4',
        prompt: 'Stuck on a homework problem after real effort. Best ask?',
        choices: [
          '"Give me the answer."',
          '"Give me a hint without solving it."',
          '"Solve it with full explanation."',
          '"Skip this problem for me."',
        ],
        answerIdx: 1,
        explain: 'Hints preserve learning; full solutions short-circuit it.' },
      { kind: 'short-answer', id: 'q.stu.5',
        prompt: 'When in doubt about your school\'s AI policy for a given use, what should you do?',
        pattern: '(disclose|ask|check)',
        placeholder: 'one word',
        explain: 'Disclose / ask / check. Honesty before the fact beats an investigation after.' },
      { kind: 'mcq', id: 'q.stu.6',
        prompt: 'When is AI definitely NOT the move?',
        choices: [
          'When you\'re stuck after a real effort',
          'When you haven\'t read the material yet',
          'When you want to check your intro for clarity',
          'When you need more practice problems',
        ],
        answerIdx: 1,
        explain: 'AI can\'t study for you. Read first; use AI to deepen, not to skip.' },
    ],
  },

  // ==================== q.models-compared ====================
  {
    id: 'q.models-compared', topicId: 't.models-compared', title: 'Picking a model',
    questions: [
      { kind: 'mcq', id: 'q.mc.1',
        prompt: 'You want to summarise a 200-page PDF. All three big models can do it. What\'s the honest tiebreaker?',
        choices: [
          'The one with the best benchmark score',
          'The one you\'re already paying for or already have open',
          'The newest one',
          'The one with the biggest logo',
        ],
        answerIdx: 1,
        explain: 'Switching costs are low; use the one you\'ll actually open.' },
      { kind: 'mcq', id: 'q.mc.2',
        prompt: 'Which model is most often chosen for long-document analysis and careful writing?',
        choices: ['ChatGPT', 'Claude', 'Gemini', 'Grok'],
        answerIdx: 1,
        explain: 'Claude is generally preferred for long-form reading and writing.' },
      { kind: 'mcq', id: 'q.mc.3',
        prompt: 'Which model integrates most directly with Google Workspace (Docs, Gmail, Drive)?',
        choices: ['Claude', 'ChatGPT', 'Gemini', 'Mistral'],
        answerIdx: 2,
        explain: 'Gemini lives inside the Google suite.' },
      { kind: 'mcq', id: 'q.mc.4',
        prompt: 'Which is FALSE about free tiers in 2026?',
        choices: [
          'claude.ai offers free access with daily message limits',
          'ChatGPT offers a free tier with a daily cap',
          'Gemini offers a free web tier',
          'All frontier models require a paid account to use at all',
        ],
        answerIdx: 3,
        explain: 'Every major vendor has a free tier in 2026. "Paid required" is false.' },
      { kind: 'short-answer', id: 'q.mc.5',
        prompt: 'What should you ask FIRST when picking a model for daily use? (one-word answer suggesting habit)',
        pattern: '(ecosystem|workflow|tool|habit|already)',
        placeholder: 'one word',
        explain: 'The ecosystem/workflow you\'re already in — friction-free beats benchmark-chasing.' },
      { kind: 'mcq', id: 'q.mc.6',
        prompt: 'Honest take on benchmark-chasing between frontier models?',
        choices: [
          'Benchmarks are the best guide',
          'Most differences that mattered two years ago have narrowed; pick by fit, not score',
          'Only Claude matters',
          'Switch every week for the best available',
        ],
        answerIdx: 1,
        explain: 'Frontier models have converged for most tasks. Pick by fit; switching is cheap if you\'re wrong.' },
    ],
  },

  // ==================== q.tool-use ====================
  {
    id: 'q.tool-use', topicId: 't.tool-use', title: 'Tool use basics',
    questions: [
      { kind: 'mcq', id: 'q.tu.1',
        prompt: 'When the model wants to call a tool, what does it return?',
        choices: [
          'A plain text response',
          'A tool_use content block with a name and JSON input',
          'An error',
          'A tool_result block',
        ],
        answerIdx: 1,
        explain: 'The model emits a tool_use block; YOUR code runs it and returns a tool_result.' },
      { kind: 'mcq', id: 'q.tu.2',
        prompt: 'After running a tool, what do you send back?',
        choices: [
          'A new system prompt',
          'A tool_result block referencing the tool_use_id',
          'A tool_use block',
          'Nothing — the model sees it automatically',
        ],
        answerIdx: 1,
        explain: 'tool_result with tool_use_id closes the loop for that call.' },
      { kind: 'mcq', id: 'q.tu.3',
        prompt: 'Which is the weakest tool definition?',
        choices: [
          'get_weather(city) — returns temperature and conditions',
          'create_ticket(title, priority, assignee)',
          'do_stuff(params) — runs things',
          'search_docs(query, limit)',
        ],
        answerIdx: 2,
        explain: 'Vague names + vague descriptions leave the model guessing when to call.' },
      { kind: 'mcq', id: 'q.tu.4',
        prompt: 'Rough threshold where "too many tools" starts degrading model behavior?',
        choices: ['2–3', '15–20', '50–75', '200+'],
        answerIdx: 1,
        explain: 'Past ~15–20 tools, models increasingly hallucinate tool names or call the wrong one.' },
      { kind: 'mcq', id: 'q.tu.5',
        prompt: 'Agent making tool calls in a loop — what\'s your code\'s job?',
        choices: [
          'Trust the model to stop',
          'Enforce a max turn count; stop if exceeded',
          'Never intervene',
          'Only stop on errors',
        ],
        answerIdx: 1,
        explain: 'Set a hard max-turn budget. Models can and will loop.' },
      { kind: 'short-answer', id: 'q.tu.6',
        prompt: 'What fills the description field on a tool definition — docs for the model, or docs for a human?',
        pattern: 'model|both',
        placeholder: 'one word',
        explain: 'The model. The description is how the model decides when to call the tool.' },
    ],
  },

  // ==================== q.agents-intro ====================
  {
    id: 'q.agents-intro', topicId: 't.agents-intro', title: 'Agents introduction',
    questions: [
      { kind: 'ordered-steps', id: 'q.ag.1',
        prompt: 'Put the beats of an agent loop in canonical order.',
        steps: ['Plan', 'Act (tool call)', 'Observe (tool result)', 'Decide next step'],
        correctOrder: [0, 1, 2, 3],
        explain: 'Plan → Act → Observe → Decide (repeat). The defining loop.' },
      { kind: 'mcq', id: 'q.ag.2',
        prompt: 'A single step is 95% reliable. What\'s the rough reliability of a 10-step agent chain?',
        choices: ['~95%', '~77%', '~60%', '~20%'],
        answerIdx: 2,
        explain: '0.95^10 ≈ 0.60. Errors compound — a key reason long chains break.' },
      { kind: 'mcq', id: 'q.ag.3',
        prompt: 'Most effective mitigation when an agent keeps getting distracted by old context?',
        choices: [
          'Longer max_tokens',
          'Higher temperature',
          'Sub-agents with fresh, short conversations for each piece',
          'Give the model a bigger model',
        ],
        answerIdx: 2,
        explain: 'Sub-agents avoid context rot — each runs clean, hands back a result.' },
      { kind: 'mcq', id: 'q.ag.4',
        prompt: 'The agent wants to delete a set of files. Best default?',
        choices: [
          'Let the agent do it — that\'s automation',
          'Require human-in-the-loop for irreversible actions',
          'Ask the agent to confirm with itself',
          'Add a 5-second delay',
        ],
        answerIdx: 1,
        explain: 'Irreversible + high-consequence actions need a human approval step.' },
      { kind: 'mcq', id: 'q.ag.5',
        prompt: 'When should you NOT use an agent?',
        choices: [
          'A multi-step task with ambiguity',
          'A single API call you could make yourself',
          'A job that benefits from automation',
          'Something that requires mid-task decisions',
        ],
        answerIdx: 1,
        explain: 'A single call is just a call. Don\'t wrap it in an agent loop.' },
      { kind: 'short-answer', id: 'q.ag.6',
        prompt: 'What do you NEED to put on every agent as a non-negotiable guardrail? (two words — shortcut for a limit)',
        pattern: 'max.{0,3}turn|turn.{0,3}limit|max.{0,3}steps?|step.{0,3}limit',
        placeholder: 'two words',
        explain: 'Max turns / max steps / turn limit — a hard cap on iteration count.' },
    ],
  },

  // ==================== q.prompt-caching ====================
  {
    id: 'q.prompt-caching', topicId: 't.prompt-caching', title: 'Prompt caching',
    questions: [
      { kind: 'mcq', id: 'q.pc.1',
        prompt: 'The main benefit of prompt caching?',
        choices: [
          'Better output quality',
          'Lower cost and latency on repeated-context calls',
          'Longer context windows',
          'Cheaper output tokens',
        ],
        answerIdx: 1,
        explain: 'Input cost drops ~90% on cached tokens; latency drops too.' },
      { kind: 'mcq', id: 'q.pc.2',
        prompt: 'How does caching decide whether a call hits or misses?',
        choices: [
          'By a hash of the full prompt',
          'By exact byte-for-byte prefix match up to the cache point',
          'By approximate similarity',
          'By request timestamp',
        ],
        answerIdx: 1,
        explain: 'Caches are prefix-based and byte-exact.' },
      { kind: 'mcq', id: 'q.pc.3',
        prompt: 'Where should the STABLE content (system prompt, tools, big docs) live in your messages?',
        choices: [
          'At the end',
          'At the top — before the cache point',
          'Interspersed with dynamic content',
          'Wherever, order doesn\'t matter',
        ],
        answerIdx: 1,
        explain: 'Stable content up top; dynamic content after. Otherwise you invalidate the cache.' },
      { kind: 'mcq', id: 'q.pc.4',
        prompt: 'You\'re appending a request UUID to the system prompt. What happens?',
        choices: [
          'Nothing — caching still works',
          'Every request is unique; caches never hit',
          'The UUID is stripped before caching',
          'Caching speeds up',
        ],
        answerIdx: 1,
        explain: 'Any unique per-request content in the prefix invalidates every cache.' },
      { kind: 'mcq', id: 'q.pc.5',
        prompt: 'Default cache TTL on Anthropic\'s API?',
        choices: ['10 seconds', '5 minutes', '1 hour', '1 day'],
        answerIdx: 1,
        explain: '5 minutes by default. Extended TTL exists at higher cost.' },
      { kind: 'mcq', id: 'q.pc.6',
        prompt: 'When is caching NOT worth it?',
        choices: [
          'Long chat agents with big system prompts',
          'Doc-QA systems over the same docs',
          'One-shot calls with small prompts and no repeat',
          'Tool-heavy agents',
        ],
        answerIdx: 2,
        explain: 'Caching has a minimum size and assumes repeats. One-shot + small = no win.' },
      { kind: 'short-answer', id: 'q.pc.7',
        prompt: 'One word — what\'s the single most common cache-miss bug?',
        pattern: '(timestamp|uuid|id|dynamic|unique)',
        placeholder: 'one word',
        explain: 'Timestamp / UUID / request ID / anything dynamic baked into the cacheable prefix.' },
    ],
  },

  // ==================== q.claude-for-office ====================
  {
    id: 'q.claude-office', topicId: 't.claude-for-office', title: 'Claude as a coworker',
    questions: [
      { kind: 'mcq', id: 'q.co.1',
        prompt: 'The "coworker mindset" means…',
        choices: [
          'Claude is a search engine',
          'Claude needs the same context a new hire would need',
          'Claude works fully autonomously',
          'Claude replaces your judgment',
        ],
        answerIdx: 1,
        explain: 'Treat Claude like an eager new hire — give it context, delegate, review.' },
      { kind: 'mcq', id: 'q.co.2',
        prompt: 'What are "custom instructions" in claude.ai used for?',
        choices: [
          'One-time task instructions',
          'Short description of who you are and how you work — applied to every conversation',
          'Billing preferences',
          'Safety filters',
        ],
        answerIdx: 1,
        explain: 'Custom instructions persist across conversations, removing repeat explanations.' },
      { kind: 'mcq', id: 'q.co.3',
        prompt: 'Better Projects shape?',
        choices: [
          'One giant "Work" project with everything',
          'Five small, scoped projects ("Q2 Board Update", "Sales Enablement", etc.)',
          'One project per day',
          'No projects — just raw conversations',
        ],
        answerIdx: 1,
        explain: 'Specific + scoped beats a dumping ground.' },
      { kind: 'mcq', id: 'q.co.4',
        prompt: 'Claude is notably better as a ____ than as a first-drafter.',
        choices: ['Typist', 'Critic', 'Translator', 'Calendar'],
        answerIdx: 1,
        explain: 'Draft-then-critique is a higher-leverage pattern than first-draft generation.' },
      { kind: 'mcq', id: 'q.co.5',
        prompt: 'Breaks the "coworker illusion" fastest?',
        choices: [
          'Asking for things it can\'t verify (specific numbers, recent news, your personal details)',
          'Using it for tone feedback',
          'Asking for a summary',
          'Using it to translate a technical doc',
        ],
        answerIdx: 0,
        explain: 'Hallucinations of specifics shatter the illusion — and can get you in real trouble.' },
    ],
  },

  // ==================== q.docs-with-ai ====================
  {
    id: 'q.docs-ai', topicId: 't.docs-with-ai', title: 'Document work',
    questions: [
      { kind: 'ordered-steps', id: 'q.da.1',
        prompt: 'Prompt anatomy for "draft" — put the slots in the canonical order.',
        steps: ['Role', 'Artifact type', 'Audience', 'Tone / length / format'],
        correctOrder: [0, 1, 2, 3],
        explain: 'Role → artifact → audience → constraints (tone/length/format).' },
      { kind: 'mcq', id: 'q.da.2',
        prompt: 'Highest-ROI move in office writing?',
        choices: ['Drafting from scratch', 'Tone-shifting', 'Shortening', 'Summarising'],
        answerIdx: 2,
        explain: 'Shorter is almost always better, and easy to iterate.' },
      { kind: 'mcq', id: 'q.da.3',
        prompt: 'Better "shorten" prompt?',
        choices: [
          '"Make it shorter."',
          '"Cut to 150 words while preserving the action items."',
          '"Reduce it."',
          '"Delete the fluff."',
        ],
        answerIdx: 1,
        explain: 'Specific length + named must-preserve items.' },
      { kind: 'mcq', id: 'q.da.4',
        prompt: 'When tone-shifting, naming a concrete target (e.g., "voice of a peer Slack post") beats "more casual" because…',
        choices: [
          'Models can\'t understand "casual"',
          'Abstract directions over-shift; concrete targets land',
          'It\'s required by the API',
          'It makes output longer',
        ],
        answerIdx: 1,
        explain: '"More casual" often lands on "too casual for work." Concrete targets prevent over-shift.' },
      { kind: 'short-answer', id: 'q.da.5',
        prompt: 'One thing every doc-work prompt gets better from naming. (one word)',
        pattern: 'audience',
        placeholder: 'one word',
        explain: 'The audience. Fixes tone, length, and salience all at once.' },
      { kind: 'mcq', id: 'q.da.6',
        prompt: 'You\'re summarising a report for an exec. What do you spot-check?',
        choices: [
          'The tone',
          '2–3 specific claims (numbers, names, quotes) against the source',
          'Spelling',
          'The font',
        ],
        answerIdx: 1,
        explain: 'Summaries hallucinate specifics. Verify a sample before shipping.' },
    ],
  },

  // ==================== q.meetings-with-ai ====================
  {
    id: 'q.meetings-ai', topicId: 't.meetings-with-ai', title: 'Meetings with AI',
    questions: [
      { kind: 'ordered-steps', id: 'q.me.1',
        prompt: 'Put the three-phase meeting-AI workflow in order.',
        steps: ['Before — prep (goal + agenda + objections)', 'During — capture (transcription)', 'After — summarise + follow-ups'],
        correctOrder: [0, 1, 2],
        explain: 'Before / during / after. Each phase has a specific, low-effort prompt.' },
      { kind: 'mcq', id: 'q.me.2',
        prompt: 'Best "during the meeting" practice?',
        choices: [
          'Handwrite every word',
          'Use a transcription tool and let AI process later',
          'Skip notes; trust memory',
          'Have AI listen live and respond',
        ],
        answerIdx: 1,
        explain: 'Transcribe live, process later. Running the meeting is hard enough.' },
      { kind: 'mcq', id: 'q.me.3',
        prompt: 'The "ur-prompt" for every meeting summary is…',
        choices: [
          '"Summarise this."',
          '"Summarise in ~200 words: decisions, action items (owner + due), open questions."',
          '"What was said?"',
          '"Tell me everything."',
        ],
        answerIdx: 1,
        explain: 'Structured summaries with named sections beat vague ones.' },
      { kind: 'mcq', id: 'q.me.4',
        prompt: 'Prompt most prone to hallucination among these?',
        choices: [
          '"Summarise the action items."',
          '"List the decisions made."',
          '"What did people not say but probably think?"',
          '"Draft a follow-up email from this summary."',
        ],
        answerIdx: 2,
        explain: 'Speculation prompts are useful for brainstorm but dangerous to share as fact.' },
      { kind: 'mcq', id: 'q.me.5',
        prompt: 'The weekly rollup move asks AI to…',
        choices: [
          'Generate next week\'s meetings',
          'Identify top themes, blockers, and stale open decisions across the week',
          'Create individual employee reviews',
          'Write the team newsletter',
        ],
        answerIdx: 1,
        explain: '90 seconds; shape of your week. Drives next week\'s planning.' },
      { kind: 'short-answer', id: 'q.me.6',
        prompt: 'What must you check transcripts for before pasting into a public model?',
        pattern: 'pii|private|personal|confidential',
        placeholder: 'one word',
        explain: 'PII / confidential data. Transcripts collect it without asking.' },
    ],
  },

  // ==================== q.generative-media-101 ====================
  {
    id: 'q.gen-media-101', topicId: 't.generative-media-101', title: 'Generative media basics',
    questions: [
      { kind: 'mcq', id: 'q.gm.1',
        prompt: 'A generative image model, at its core, does what?',
        choices: [
          'Searches a database for similar images',
          'Samples a new image from a learned distribution guided by your prompt',
          'Edits a photo you upload',
          'Renders a 3D scene',
        ],
        answerIdx: 1,
        explain: 'Generative = sample from a learned space, not retrieve or edit.' },
      { kind: 'mcq', id: 'q.gm.2',
        prompt: 'Classic failure modes for generative image models include all EXCEPT…',
        choices: ['Hands with extra fingers', 'Gibberish text on signs', 'Incorrect physics in complex scenes', 'Miscounting the number of tokens in your prompt'],
        answerIdx: 3,
        explain: 'Hands, text, and physics are canonical failure modes. Token counting is a separate engine.' },
      { kind: 'mcq', id: 'q.gm.3',
        prompt: 'Prompting "in the style of [living artist]" is…',
        choices: [
          'Totally fine, legally',
          'Legally grey, ethically contested, platform-restricted — safer to avoid',
          'Explicitly illegal everywhere',
          'Encouraged',
        ],
        answerIdx: 1,
        explain: 'Grey on every axis. Best default: don\'t prompt in the name of a living artist.' },
      { kind: 'mcq', id: 'q.gm.4',
        prompt: 'Generating a real person\'s voice for a video. Required?',
        choices: [
          'Nothing — you made it, you own it',
          'Explicit consent from the person, plus disclosure',
          'A credit line at the end',
          'A paid platform subscription',
        ],
        answerIdx: 1,
        explain: 'Consent and disclosure. Voice cloning without consent is increasingly illegal.' },
      { kind: 'mcq', id: 'q.gm.5',
        prompt: 'Platform default for AI-generated or realistic-person content in 2026?',
        choices: [
          'Secret — don\'t tell anyone',
          'Required disclosure',
          'Always prohibited',
          'Always allowed',
        ],
        answerIdx: 1,
        explain: 'Major platforms (YouTube, TikTok, Meta) require disclosure and auto-label.' },
      { kind: 'short-answer', id: 'q.gm.6',
        prompt: 'The one thing you do NOT own about a generated image of a famous person? (one word)',
        pattern: 'likeness|rights',
        placeholder: 'one word',
        explain: 'Likeness rights belong to the person depicted, regardless of who generated the image.' },
    ],
  },

  // ==================== q.image-generation ====================
  {
    id: 'q.image-gen', topicId: 't.image-generation', title: 'Image generation',
    questions: [
      { kind: 'mcq', id: 'q.ig.1',
        prompt: 'Your project needs text ON an image (book cover, poster). Which model?',
        choices: ['Midjourney', 'Flux', 'Ideogram', 'DALL-E'],
        answerIdx: 2,
        explain: 'Ideogram specialises in legible in-image typography.' },
      { kind: 'mcq', id: 'q.ig.2',
        prompt: 'You have a reference photo and want a variant. Which model is known for that edit-and-iterate loop?',
        choices: ['Midjourney', 'Nano Banana', 'Flux', 'DALL-E'],
        answerIdx: 1,
        explain: 'Nano Banana (Google Gemini image) is best-in-class for reference-based edits.' },
      { kind: 'mcq', id: 'q.ig.3',
        prompt: 'The six prompt slots that carry most of the signal include all EXCEPT…',
        choices: ['Subject', 'Composition', 'Tokenizer', 'Lighting'],
        answerIdx: 2,
        explain: 'Subject, composition, style, lighting, mood, negatives. Tokenizer is a language-model concept.' },
      { kind: 'ordered-steps', id: 'q.ig.4',
        prompt: 'Put these image-gen iteration moves in a typical order.',
        steps: [
          'Generate 4 variants from one prompt',
          'Pick the closest; re-prompt with a refinement',
          'Lock a seed / composition, iterate on style',
          'Upscale the final',
        ],
        correctOrder: [0, 1, 2, 3],
        explain: 'Generate → refine → lock → upscale.' },
      { kind: 'mcq', id: 'q.ig.5',
        prompt: 'Realistic iteration count for a polished hero image?',
        choices: ['1', '2–3', '10–30', '500+'],
        answerIdx: 2,
        explain: 'First output is almost never the one. Plan to generate many.' },
      { kind: 'short-answer', id: 'q.ig.6',
        prompt: 'One feature that cuts iteration time dramatically by reusing a visual anchor across generations?',
        pattern: 'reference|seed|controlnet|anchor',
        placeholder: 'one word',
        explain: 'Reference images / seed locking / ControlNet — structural anchors cut time dramatically.' },
    ],
  },

  // ==================== q.video-generation ====================
  {
    id: 'q.video-gen', topicId: 't.video-generation', title: 'Video generation',
    questions: [
      { kind: 'mcq', id: 'q.vg.1',
        prompt: 'Natural unit of video generation from most current models?',
        choices: ['1 second', '5–10 seconds', '60–120 seconds', '10 minutes'],
        answerIdx: 1,
        explain: '~5–10 seconds per clip. Longer pieces are stitched.' },
      { kind: 'mcq', id: 'q.vg.2',
        prompt: 'Most-leverage craft tool in video generation?',
        choices: [
          'Higher temperature',
          'First-frame (and sometimes last-frame) conditioning',
          'Bigger prompt',
          'Stronger negative prompts',
        ],
        answerIdx: 1,
        explain: 'Anchoring both ends of a clip is the single biggest coherence win.' },
      { kind: 'mcq', id: 'q.vg.3',
        prompt: 'Common beginner mistake in video prompting?',
        choices: [
          'Over-specifying motion — many actions stuffed into one 10-second clip',
          'Under-specifying subject',
          'Not describing lighting',
          'Using the wrong model',
        ],
        answerIdx: 0,
        explain: 'One beat per clip. Many actions in one clip produces drift or incoherence.' },
      { kind: 'ordered-steps', id: 'q.vg.4',
        prompt: 'Order the stitching workflow.',
        steps: [
          'Storyboard the intended shots',
          'Generate a key frame per shot in your image model',
          'Animate each shot with first-frame conditioning',
          'Assemble in an editor, trim, add audio',
        ],
        correctOrder: [0, 1, 2, 3],
        explain: 'Storyboard → key frames → animate → assemble.' },
      { kind: 'mcq', id: 'q.vg.5',
        prompt: 'A polished 60-second generative-video piece typically takes…',
        choices: ['3–5 generations', '20–80 generations', '500+ generations', '1 generation if you prompt well'],
        answerIdx: 1,
        explain: 'Real work = many iterations of 8–12 shots. Plan budget accordingly.' },
      { kind: 'short-answer', id: 'q.vg.6',
        prompt: 'Which modern video model family natively generates synchronised audio alongside the video? (one word)',
        pattern: 'veo|sora',
        placeholder: 'model family',
        explain: 'Veo and Sora (newest versions) generate synchronised video + audio.' },
    ],
  },

  // ==================== q.voice-and-audio ====================
  {
    id: 'q.voice-audio', topicId: 't.voice-and-audio', title: 'Voice & audio',
    questions: [
      { kind: 'mcq', id: 'q.va.1',
        prompt: 'For real-time, sub-100ms voice in a live agent, which tool is purpose-built?',
        choices: ['ElevenLabs batch', 'Suno', 'Cartesia', 'Descript Overdub'],
        answerIdx: 2,
        explain: 'Cartesia is built for low-latency streaming.' },
      { kind: 'mcq', id: 'q.va.2',
        prompt: 'Cloning a specific person\'s voice requires…',
        choices: [
          'A long sample and a paid plan',
          'Written consent from that person — without it, you may be breaking the law',
          'A model watermark',
          'Nothing, as long as you disclose',
        ],
        answerIdx: 1,
        explain: 'Tennessee ELVIS Act and EU AI Act: cloning without consent is restricted. Consent is non-negotiable.' },
      { kind: 'mcq', id: 'q.va.3',
        prompt: 'When is generated voice the wrong choice?',
        choices: [
          'Localising content into 5 languages',
          'Anonymous narration for an explainer video',
          'When YOUR voice is the product (you as a creator or host)',
          'Consistent narration across audiobook chapters',
        ],
        answerIdx: 2,
        explain: 'If your voice IS the brand, record. Generated voice removes you from your own work.' },
      { kind: 'mcq', id: 'q.va.4',
        prompt: 'Writing text that will be read aloud — what generally lands better?',
        choices: [
          'Long, comma-heavy sentences',
          'Short sentences; commas pace breath; read aloud before generating',
          'Formal academic voice',
          'No punctuation to let the model decide',
        ],
        answerIdx: 1,
        explain: 'Writing for voice is different. If it reads awkward, it sounds awkward.' },
      { kind: 'mcq', id: 'q.va.5',
        prompt: 'Commercial use of Suno-generated music depends on…',
        choices: [
          'Nothing — all output is public domain',
          'The license terms of the specific tool + tier you\'re on',
          'Whether you\'re in the US',
          'How long the song is',
        ],
        answerIdx: 1,
        explain: 'License terms vary: some grant exclusive rights, some don\'t. Read the fine print.' },
      { kind: 'short-answer', id: 'q.va.6',
        prompt: 'What do you need in writing before cloning another person\'s voice?',
        pattern: 'consent|permission|release',
        placeholder: 'one word',
        explain: 'Consent / permission / release — required by law in multiple jurisdictions.' },
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
