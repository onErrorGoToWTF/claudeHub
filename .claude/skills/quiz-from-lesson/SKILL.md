---
name: quiz-from-lesson
description: Draft a Quiz for an existing lesson, covering every major concept. Invoke when the user says "write a quiz for lesson X" or "draft quiz for topic t.foo". Input is a topic ID that already has a lesson. The skill reads the lesson content, extracts key concepts, and emits a Quiz object ready to paste into `revamp/src/db/seed.ts`. The user reviews and commits.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# quiz-from-lesson

Quizzes in aiUniversity are the mastery signal. A quiz pass at ≥80% marks the topic as Mastered regardless of lesson progress, so **every critical concept in the lesson must be exercised by at least one quiz question.** Unquizzed content is invisible to mastery tracking.

This skill drafts that quiz. The user reviews it — the user is always the gate.

## When to invoke

User asks to draft a quiz for a specific topic / lesson. Examples:

- "Write a quiz for `t.streaming`."
- "Draft a quiz for the Writing Clear Prompts lesson."
- "Build the quiz for the new Slack overview course."

Only invoke when the **lesson already exists**. The user has stated the rule: no quiz without a lesson.

## Hard requirements

1. **Lesson must exist first.** Confirm by grepping for the topic ID in the lesson source.
2. **Coverage over length.** Every concept flagged as a key takeaway in the lesson body needs at least one question.
3. **4 choices per question, exactly one correct.** Matches existing shape in `revamp/src/db/seed.ts`.
4. **Every question has an `explain` field.** One sentence, reinforces *why* the correct answer is right.
5. **Use the `Quiz` type in `revamp/src/db/types.ts`** — don't invent fields.

## Steps

### 1. Read the lesson

- Find the topic: `Grep` for the topic ID (e.g., `t.streaming`) in `revamp/src/db/seed.ts` to confirm it exists.
- Read the lesson body. Lesson bodies live alongside the topic in `revamp/src/db/seed.ts` (find the `lessons` array) — read the matching entry.
- If the body is thin / missing, tell the user and stop. Don't invent content.

### 2. Extract key concepts

List the concepts the lesson teaches, in plain language. Each concept = one future question (minimum). Examples of a concept:

- A numeric rule of thumb ("1,000 tokens ≈ 750 English words").
- A cause/effect pair ("mid-sentence cutoff → max output tokens").
- A comparison / distinction ("lesson vs quiz: mastery is signal by quiz").
- A vocabulary term with its definition.

### 3. Draft questions

For each concept, write one question:

- **Prompt** — short, clear, no trick wording.
- **Choices** — 4 total. One correct. Distractors should be *plausible to someone who half-read the lesson* (not absurd). Avoid joke distractors except when the joke reinforces the point.
- **answerIdx** — 0-based index of the correct choice.
- **explain** — one sentence pointing at the right reason.

Question IDs follow the existing convention: `q.<topic-suffix>.<n>` starting at 1.

### 4. Assemble and hand off

Output the full `Quiz` object as TypeScript, ready to paste into the `quizzes` array in `revamp/src/db/seed.ts`. Example shape:

```typescript
{
  id: 'q.streaming', topicId: 't.streaming', title: 'Streaming check',
  questions: [
    { id: 'q.streaming.1',
      prompt: '...?',
      choices: ['...', '...', '...', '...'],
      answerIdx: 2,
      explain: '...' },
    // ...
  ],
},
```

Don't edit `seed.ts` yourself unless the user explicitly asks — let them review the draft first.

### 5. Print a coverage checklist

After the draft, output a short table mapping each key concept from the lesson to the question that exercises it. Makes review fast:

```
Concept                                  → Question
─────────────────────────────────────────────────
1,000 tokens ≈ 750 English words        → q.tokens.1
mid-sentence cutoff = max output tokens → q.tokens.4
...
```

If a concept has no question, add one before handing off. If a question has no matching concept, cut it.

## Don'ts

- Don't invent quiz content without reading the lesson.
- Don't add fields not present in the `Quiz` type.
- Don't commit or edit `seed.ts` without explicit approval.
- Don't ship a quiz shorter than the concept count — that's the only length floor.
