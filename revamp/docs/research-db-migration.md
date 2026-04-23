# DB migration — Supabase (Postgres + Auth + RLS + TOTP MFA)

> Single source of truth for executing the Dexie → Supabase cutover.
> Premises locked — do not re-debate. Execute top-down.

## 1. Executive summary

**From:** Dexie (IndexedDB), solo, local-only. Every user on every device is
isolated; the profile lives in `localStorage` via Zustand `persist`. No auth.
**To:** Supabase — Postgres for all data, Supabase Auth for identity (email +
password + TOTP MFA with a 7-day grace period), RLS for per-user isolation,
signup gated by an admin-seeded `signup_allowlist`.

**User-experience delta.** Users have been warned: migration is **fresh-start.**
Their IndexedDB is not imported. First visit after cutover lands on `/signin`;
after auth + handle pick, they see an empty Dashboard with starter packs + the
existing engagement-prompt plumbing doing the first-plan seeding. Existing
local data is left in place in IndexedDB (not wiped) so anyone who wants to
screenshot their old progress can do so from devtools; the app just doesn't
read it anymore.

**Value unlocked.**
- Multi-user from day one (~5 allowlisted accounts, RLS-isolated).
- Admin surfaces (`is_admin` gated): YouTube curation, authoring queue,
  live theme tweaker, dev debug panel. All previously blocked on "no DB yet".
- Freshness Pipeline line-of-sight: scraper → Claude drafts → admin review
  queue. None of this can start until there's a server-side place for drafts
  to live and an admin role to review them.
- Friend-view scaffolding in the schema without shipping UI — `visibility`
  column + `friendships` table exist so the later toggle is a UI change,
  not a migration.
- Server-authoritative mastery + progress. Mobile/desktop switching stops
  losing state.

**Scope boundary.** This doc covers the migration only. It does NOT cover:
Claude API integration (separate project), YouTube API integration
(post-migration), admin UI (post-migration), Freshness Pipeline
(post-admin-UI). Each is called out in §10.

---

## 2. Schema refinement — walk-through of `docs/supabase-schema.sql`

The current draft predates Chunks H, I, J, K, L, O. This section walks every
table, flags gaps, and emits concrete DDL additions. Treat every `alter table`
block below as a required amendment to the schema file before provisioning.

### 2.1 `user_profile` — needs 3 new columns, pathway enum expansion

Missing:
- **`pathway` enum is stale.** Current CHECK is `('all','student','office','dev')`.
  Chunk A expanded pathway to 5: `student | office | media | vibe | dev` (plus
  `all` as the "no filter" default). Must widen the check.
- **`prompt_dismissed_topic_ids text[]`.** Added in Chunk L — tracks topics
  where the user said "not now" to the add-to-plan prompt so we never re-ask.
  Lives in Zustand today; must move to DB to survive a device switch.
- **`updated_at` trigger.** Column exists but nothing touches it. Add a
  BEFORE UPDATE trigger so it's not a lie.
- **(Optional) `created_at_day date` generated column** — if we ever want
  streak/stats leaderboards friend-to-friend later. Deferred. Flag only.

```sql
-- Widen pathway enum
alter table public.user_profile
  drop constraint if exists user_profile_pathway_check;
alter table public.user_profile
  add constraint user_profile_pathway_check
  check (pathway in ('all','student','office','media','vibe','dev'));

-- Prompt-dismissed topic IDs (Chunk L)
alter table public.user_profile
  add column if not exists prompt_dismissed_topic_ids text[] not null default '{}';

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists user_profile_touch on public.user_profile;
create trigger user_profile_touch
  before update on public.user_profile
  for each row execute function public.touch_updated_at();
```

Apply `public.touch_updated_at` to every other table that has `updated_at`
(see each section below).

### 2.2 `tracks` — needs category + tags

Chunk H added both.

```sql
alter table public.tracks
  add column if not exists category_id text references public.categories(id) on delete set null,
  add column if not exists tags text[] not null default '{}';
create index if not exists tracks_category_id_idx on public.tracks(category_id);
```

Requires `categories` table to exist first — see §2.4 new tables.

### 2.3 `topics` — needs tags, related edges, objectives, updated_at

Chunks H + L.

```sql
alter table public.topics
  add column if not exists tags text[] not null default '{}',
  add column if not exists related_topic_ids text[] not null default '{}',
  add column if not exists related_library_ids text[] not null default '{}',
  add column if not exists objectives text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

-- GIN indexes for tag + related-id filters (library tag-facet query hits this)
create index if not exists topics_tags_gin on public.topics using gin (tags);
create index if not exists topics_related_topics_gin on public.topics using gin (related_topic_ids);
```

Note: `prereq_topic_ids`, `related_topic_ids`, `related_library_ids` stay as
`text[]` rather than join tables. Rationale: matches the Dexie shape exactly,
keeps `repo.setRelated` / `repo.getBacklinks` one-to-one, and GIN on array is
fine for our scale (< 1k topics). A later graph view can still compute edges
from these arrays. Revisit if we need edge metadata (weight, label).

### 2.4 NEW tables — `categories`, `user_pathway_items`, `project_events`, `quiz_reports`, `feedback`

None of these exist in the current draft.

```sql
-- Categories (Chunk H — the "bookshelf" above Tracks)
create table if not exists public.categories (
  id      text primary key,
  title   text not null,
  summary text not null,
  "order" int  not null,
  tags    text[] not null default '{}'
);

-- User pathway items (Chunk C)
create table if not exists public.user_pathway_items (
  -- id format in Dexie is `upi.<topicId>` — keep it for 1:1 seed portability.
  id         text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  topic_id   text not null references public.topics(id) on delete restrict,
  status     text not null default 'active'
    check (status in ('active','archived')),
  position   int  not null default 0,
  added_at   timestamptz not null default now(),
  source     text not null default 'manual'
    check (source in ('seed','manual','project')),
  primary key (user_id, id)
);
create unique index if not exists user_pathway_items_user_topic_uniq
  on public.user_pathway_items(user_id, topic_id);
create index if not exists user_pathway_items_user_status_position_idx
  on public.user_pathway_items(user_id, status, position);

-- Project events — DRAFT RENAMES REQUIRED.
-- Current draft: `user_project_events` with reserved-word columns "from" / "to".
-- Quoted identifiers compile but make every query fragile. Rename.
alter table if exists public.user_project_events rename to project_events;
alter table if exists public.project_events rename column "from" to from_value;
alter table if exists public.project_events rename column "to"   to to_value;
-- (If provisioning fresh, skip the renames and author the final shape directly.)

-- Quiz reports (shipped 2026-04-22)
create table if not exists public.quiz_reports (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  quiz_id      text not null references public.quizzes(id) on delete cascade,
  question_id  text,  -- null = whole-quiz report
  kind         text not null
    check (kind in ('incorrect','unclear','typo','other')),
  note         text not null default '',
  ts           timestamptz not null default now(),
  resolved     boolean not null default false
);
create index if not exists quiz_reports_quiz_idx on public.quiz_reports(quiz_id);
create index if not exists quiz_reports_user_ts_idx on public.quiz_reports(user_id, ts desc);

-- General feedback (Chunk O)
create table if not exists public.feedback (
  id        text primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  kind      text not null
    check (kind in ('bug','idea','content-issue','other')),
  message   text not null,
  path      text,
  ts        timestamptz not null default now(),
  resolved  boolean not null default false
);
create index if not exists feedback_user_ts_idx on public.feedback(user_id, ts desc);
```

### 2.5 `lessons` — needs `updated_at`

```sql
alter table public.lessons
  add column if not exists updated_at timestamptz not null default now();
```

### 2.6 `quizzes` — questions JSONB is fine, but lock the shape

Chunk B introduced discriminated-union question kinds (`mcq`, `ordered-steps`,
`code-typing`, `short-answer`). The draft's "Each element: `{ id, prompt,
choices[], answerIdx, explain? }`" comment is out of date.

Update the comment only — no DDL change. JSONB already accepts the union.

```sql
comment on column public.quizzes.questions is
  'QuizQuestion[] — discriminated union on `kind`. Legal kinds: '
  '`mcq` (default if missing; legacy rows), `ordered-steps`, `code-typing`, '
  '`short-answer`. See revamp/src/db/types.ts for exact shapes.';
```

Optional hardening for later: a JSONB CHECK constraint validating `kind`
values. Skip v1 — client-side grading in `src/lib/quizGrading.ts` is the
gate of truth.

### 2.7 `library_items` — needs tags-idx, related-edges, updated_at, savedForLater

`savedForLater` is PER-USER state (Chunk O bookmark), not item-level. Goes on
`user_library_state`, not here. Item-level needs:

```sql
alter table public.library_items
  add column if not exists related_topic_ids text[] not null default '{}',
  add column if not exists related_library_ids text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists library_items_tags_gin
  on public.library_items using gin (tags);
```

### 2.8 `user_library_state` — needs `saved_for_later`

```sql
alter table public.user_library_state
  add column if not exists saved_for_later boolean not null default false;
```

Also add the updated_at trigger.

### 2.9 `user_progress` — spot checks

Current shape matches `Progress` type one-to-one. Two notes:
- `id` is the lesson-or-quiz ID, which is `text` and stable across users —
  keep it.
- `attempts` defaults to 0 but the client increments as `(prev?.attempts ??
  0) + 1` on every `recordQuiz`. Safe.

No changes.

### 2.10 `user_projects` — drop `inventory` reference, add `media_kind` + `stack_notes` + `tags` + related edges

Chunk E added `mediaKind` and `stackNotes`. Chunk H added `tags`,
`relatedTopicIds`, `relatedLibraryIds`.

```sql
alter table public.user_projects
  add column if not exists media_kind text
    check (media_kind is null
      or media_kind in ('image','video','youtube','voice','audio','multi')),
  add column if not exists stack_notes text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists related_topic_ids text[] not null default '{}',
  add column if not exists related_library_ids text[] not null default '{}';
```

### 2.11 `user_search_misses` — fine as-is

Matches `SearchMiss` type. No changes.

### 2.12 `friendships` — fine as-is (deferred)

Table + indexes ship with the migration so the later visibility toggle is UI
only. No RLS policies for cross-user SELECT until friend-view is actually
built.

### 2.13 Summary — amendment file

All of the above consolidates into a single `0002_schema_refinements.sql`
migration file (or folds into `0001_init.sql` if you're provisioning fresh —
recommended, since no existing production DB). See §8 step 2.

---

## 3. RLS policies

The draft has the right skeleton. Gaps:

1. No policies for the new tables (`categories`, `user_pathway_items`,
   `project_events`, `quiz_reports`, `feedback`).
2. No admin-bypass. `is_admin` is a column but nothing reads it.
3. Content tables allow ANY client, including anon, to SELECT — `using
   (true)`. That's fine for the app's read model, but admin writes need a
   path through RLS, not around it.
4. `user_profile` is owner-all — but the owner can set `is_admin = true` on
   themselves. Privilege escalation. Must split INSERT/UPDATE policies so
   `is_admin` is service-role-only.

### 3.1 Admin helper

```sql
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.user_profile where user_id = auth.uid()),
    false
  );
$$;
```

`stable` + `security definer` so RLS policies can call it cheaply without
each user needing SELECT on every other profile row.

### 3.2 Per-table policy matrix

Shared content = public read, admin-only write. User-scoped = owner-all.
Profile = owner-read + owner-update-non-admin-fields + admin-override for
admin column.

```sql
-- ---------- user_profile — split policies to prevent is_admin escalation ----------
drop policy if exists user_profile_owner_all on public.user_profile;

create policy user_profile_owner_read on public.user_profile
  for select using (user_id = auth.uid() or public.is_admin());

create policy user_profile_owner_insert on public.user_profile
  for insert with check (user_id = auth.uid() and is_admin = false);

-- UPDATE: owners can update their own row, BUT is_admin must not change.
-- Postgres RLS can't enforce "column X must stay the same" directly, so use
-- a BEFORE UPDATE trigger plus a policy that only allows owner updates when
-- the same column matches the old value.
create policy user_profile_owner_update on public.user_profile
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.protect_is_admin()
returns trigger language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin
     and not public.is_admin()  -- existing admins can flip others
     and current_user not in ('supabase_admin','service_role') then
    raise exception 'is_admin is not user-editable'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end; $$;

drop trigger if exists user_profile_protect_is_admin on public.user_profile;
create trigger user_profile_protect_is_admin
  before update on public.user_profile
  for each row execute function public.protect_is_admin();

-- Admin override: admins can see + edit any profile (for user-ops).
create policy user_profile_admin_all on public.user_profile
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- shared content: public read, admin write ----------
-- (Reads stay permissive — guests landing on /signin shouldn't need to auth to
-- see marketing/catalog. If we ever gate content fully, tighten here.)

create policy categories_read    on public.categories    for select using (true);
create policy categories_admin   on public.categories    for all
  using (public.is_admin()) with check (public.is_admin());

-- Do the same pattern for: tracks, topics, lessons, quizzes, library_items.
-- Draft already has the SELECT policies; add per-table admin policies:

create policy tracks_admin        on public.tracks        for all using (public.is_admin()) with check (public.is_admin());
create policy topics_admin        on public.topics        for all using (public.is_admin()) with check (public.is_admin());
create policy lessons_admin       on public.lessons       for all using (public.is_admin()) with check (public.is_admin());
create policy quizzes_admin       on public.quizzes       for all using (public.is_admin()) with check (public.is_admin());
create policy library_items_admin on public.library_items for all using (public.is_admin()) with check (public.is_admin());

-- ---------- new user-scoped tables ----------
alter table public.user_pathway_items enable row level security;
alter table public.quiz_reports       enable row level security;
alter table public.feedback           enable row level security;

create policy user_pathway_items_owner_all on public.user_pathway_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_pathway_items_admin_all on public.user_pathway_items
  for all using (public.is_admin()) with check (public.is_admin());

-- quiz_reports + feedback: users own rows, admins can triage.
create policy quiz_reports_owner_all on public.quiz_reports
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy quiz_reports_admin_all on public.quiz_reports
  for all using (public.is_admin()) with check (public.is_admin());

create policy feedback_owner_all on public.feedback
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy feedback_admin_all on public.feedback
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- project_events — user owns their project's events ----------
-- (Draft had this but under old name.)
create policy project_events_owner_all on public.project_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy project_events_admin_all on public.project_events
  for all using (public.is_admin()) with check (public.is_admin());
```

### 3.3 Friend-view visibility — deferred, column present

`user_projects.visibility` is already in the draft. No policy for cross-user
reads. When friend-view lands, add:

```sql
-- FUTURE — do NOT add v1:
create policy user_projects_friends_read on public.user_projects
  for select using (
    user_id = auth.uid()
    or (visibility = 'public')
    or (visibility = 'friends' and exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid()
        and f.friend_id = user_projects.user_id
        and f.status = 'accepted'
    ))
  );
```

Keep commented out in the migration file so it's discoverable but inert.

### 3.4 MFA enforcement — 7-day grace

Grace-period strategy: don't enforce `aal2` in RLS v1. Enforce in the client
(require TOTP enrollment after 7 days or block sensitive routes) and add the
RLS teeth once everyone's past the grace window.

When it's time, replace the owner-all policies on sensitive tables with:

```sql
-- FUTURE — after grace period:
drop policy user_projects_owner_all on public.user_projects;
create policy user_projects_owner_aal2 on public.user_projects
  for all
  using (
    user_id = auth.uid()
    and (auth.jwt()->>'aal')::text = 'aal2'
  )
  with check (
    user_id = auth.uid()
    and (auth.jwt()->>'aal')::text = 'aal2'
  );
```

Read tables (progress, mastery) are lower-risk; leave at aal1. Write tables
(projects, feedback) ramp to aal2.

---

## 4. Auth flow

### 4.1 Supabase Auth config

Enable:
- **Email + password** provider.
- **MFA** → **TOTP** (Supabase dashboard → Auth → Providers → MFA).
- **Email confirmation** required on signup.
- **Site URL** = `https://onerrorgotowtf.github.io/claudeHub/`.
- **Redirect URLs** = `https://onerrorgotowtf.github.io/claudeHub/**`,
  `http://localhost:5173/**`.

Disable every OAuth provider — not in scope.

### 4.2 Signup gate

Already drafted. `public.signup_allowlist` + `enforce_signup_allowlist`
trigger on `auth.users` BEFORE INSERT. Seed the initial allowlist manually
before opening signups:

```sql
insert into public.signup_allowlist (email, note) values
  ('alanyoungjr@gmail.com', 'owner'),
  -- add the other 4 emails here before launch
  ;
```

No admin UI for the allowlist v1 — service-role-only (dashboard SQL editor).
A later admin surface can wrap it.

### 4.3 TOTP MFA — 7-day grace

Supabase Auth exposes MFA via `supabase.auth.mfa.*`. Flow:
1. Sign up → user is `aal1` (password only).
2. Client reads `created_at` from session. If `(now - created_at) < 7 days`,
   show a non-blocking banner: "Set up 2-factor (required in N days)" linking
   to `/settings/security`.
3. Past 7 days, block the app shell. Redirect to `/settings/security` until
   enrollment completes.
4. Enrollment = `supabase.auth.mfa.enroll({ factorType: 'totp' })` →
   QR + secret → `challenge()` → `verify()` with user-entered code →
   factor is confirmed, session upgrades to `aal2`.
5. Recovery codes: Supabase doesn't give them natively on TOTP — we generate
   our own on enrollment completion, store hashed in a `user_recovery_codes`
   table (out of scope for v1 — document as a known gap).

### 4.4 Session persistence (Vite SPA)

Use `@supabase/supabase-js` v2. One client instance in
`src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,        // localStorage token
      autoRefreshToken: true,
      detectSessionInUrl: true,    // handles email-confirm redirect
    },
  },
)
```

Env vars via Vite:
- `.env.local` for dev.
- `.env.production` committed? NO — Supabase URL is public, anon key is
  public (RLS is the security), but tradition says keep in GitHub Actions
  secrets and inject via the deploy workflow. Update
  `.github/workflows/deploy-pages.yml` to pass them through.

### 4.5 `/signin` — wire the preview UI

The preview states already drafted in `src/pages/SignIn.tsx` map to real
calls:

| Preview state       | Real action                                              |
|---------------------|----------------------------------------------------------|
| `signin`            | `supabase.auth.signInWithPassword({ email, password })`  |
| `signup`            | `supabase.auth.signUp({ email, password })`              |
| `sent`              | confirmation email sent (signup flow)                    |
| `totp-enroll`       | `supabase.auth.mfa.enroll({ factorType: 'totp' })`       |
| `totp-verify`       | `supabase.auth.mfa.challenge()` + `.verify()`            |
| `recovery-codes`    | show generated codes (not native — custom storage)       |
| `recovery-entry`    | post-MFA recovery-code consume flow                      |

After signin, check `user_profile.handle` — if null, redirect to a new
`/welcome` step that asks for a handle. Use citext uniqueness: try the
insert; on `unique_violation` (23505), show "handle taken".

### 4.6 Route guard

New `AuthGate` component in `src/app/AuthGate.tsx`:
- Subscribe to `supabase.auth.onAuthStateChange`.
- Redirect unauthenticated users to `/signin` (except for `/signin`
  itself and the public colophon).
- Once session exists, render children.
- Hydrate Zustand `userStore` from `user_profile` on session change (so
  the rest of the app reads through the existing selectors unchanged).

Wrap in `src/app/App.tsx` around the `<AppShell>` routes; leave `/signin`
outside the gate just like `/onboarding` was.

### 4.7 Handle setup (citext uniqueness)

```ts
async function setHandle(handle: string) {
  const clean = handle.trim().toLowerCase()
  if (!/^[a-z0-9_-]{2,32}$/.test(clean)) throw new Error('2–32 chars, a–z / 0–9 / _ / -')
  const { error } = await supabase
    .from('user_profile')
    .update({ handle: clean })
    .eq('user_id', (await supabase.auth.getUser()).data.user!.id)
  if (error) {
    if (error.code === '23505') throw new Error('handle taken')
    throw error
  }
}
```

---

## 5. Content seeding

Seed content (tracks, topics, lessons, quizzes, library items, tool bodies,
categories, tags, edges) must land in Postgres before first user signs in.

### 5.1 Options considered

**Option A — Hand-author a SQL seed file.** Slow, error-prone, diverges from
`src/db/seed.ts` the moment we edit anything.

**Option B — One-shot migration script.** Run once from Node against the
service-role key; imports the existing `src/db/seed.ts` + `seedLibraryNotes`
+ `toolBodies` + `pathwayTemplates` etc. and upserts into Postgres. Stays
in sync automatically — re-run any time seed changes.

**Recommended: Option B.** Concrete shape:

```
revamp/scripts/seed-supabase.ts  (new)
├── import { SEED_TRACKS, SEED_TOPICS, ... } from '../src/db/seed'
├── import { seedLibraryNotes } from '../src/db/seedLibraryNotes'
├── import { toolBodies } from '../src/db/toolBodies'
├── create supabase service-role client (SUPABASE_SERVICE_ROLE_KEY env)
├── upsert categories → tracks → topics → lessons → quizzes → library_items
│   (order matters for FKs)
├── apply topic/library `tags` + related-edges from TOPIC_TAGS / TOPIC_EDGES
└── exit
```

Run via `npx tsx revamp/scripts/seed-supabase.ts` with service-role key in
env. Idempotent via upsert on primary key. Re-run whenever seed changes in
the repo — this becomes the canonical "refresh content" operation until the
Freshness Pipeline's admin-review queue lands.

### 5.2 Authored lesson bodies

`Lesson.body` is markdown. Stays verbatim in the `lessons.body TEXT` column.
No markdown parsing server-side — client renders via existing
`src/ui/Markdown.tsx`.

### 5.3 Tool bodies

`toolBodies.ts` merges onto matching library entries at seed time in the
Dexie path. The seed script must do the same merge before the final
`library_items` upsert — one row per tool, body-and-all.

### 5.4 Seed templates vs user data

`PATHWAY_TEMPLATES` is STATIC content (not user data) — stays in the repo as
`src/lib/pathwayTemplates.ts`. The repo reads it to stamp rows into
`user_pathway_items`. Do NOT persist templates server-side; nothing good
comes from making them editable at runtime pre-admin-UI.

---

## 6. Client-side migration (Dexie → Supabase)

### 6.1 The contract — keep `repo.ts` async-compatible

Every function in the current `repo.ts` returns `Promise<T>`. Supabase calls
return promises too. Shape stays identical; implementations change.

### 6.2 Two-file split recommended

Instead of rewriting `repo.ts` in place, split:

```
src/db/
  types.ts            (unchanged)
  repo.ts             (re-exports — picks impl via env flag)
  repo.dexie.ts       (current impl, renamed from repo.ts)
  repo.supabase.ts    (new impl, Supabase-backed)
```

`repo.ts`:
```ts
import * as dexie from './repo.dexie'
import * as supa  from './repo.supabase'
const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true'
export const repo = useSupabase ? supa.repo : dexie.repo
```

Keeps the Dexie path alive during dev-local testing + gives a no-code-change
rollback (flip the flag). Once cutover is stable (~2 weeks in prod), delete
`repo.dexie.ts` and the flag, collapse re-exports back to one file.

### 6.3 Mapping patterns

Each Dexie call has a direct Supabase translation. Examples:

| Dexie                                                   | Supabase                                                          |
|---------------------------------------------------------|-------------------------------------------------------------------|
| `db.topics.get(id)`                                     | `supabase.from('topics').select('*').eq('id', id).maybeSingle()`  |
| `db.topics.where('trackId').equals(trackId).toArray()`  | `.from('topics').select('*').eq('track_id', trackId)`             |
| `db.projects.put(p)`                                    | `.from('user_projects').upsert(projectToRow(p))`                  |
| `db.progress.get(quizId)`                               | `.from('user_progress').select('*').eq('id',quizId).eq('kind','quiz').maybeSingle()` |

Write a `src/db/mappers.ts` with `topicFromRow`, `topicToRow`, etc. —
camelCase ↔ snake_case, `timestamptz` ↔ ms-number (convert `Date` to
`Date.parse()` so UI code doesn't change).

Embed `user_id` automatically on writes — pull from
`supabase.auth.getUser()` once per session and hold in a module-level
closure; every writer stamps `user_id: currentUserId` before upsert.

### 6.4 RLS-safe query patterns

RLS makes `user_id` filters redundant on user-scoped tables (the row you
don't own isn't visible) — but still include `user_id = auth.uid()` WHERE
clauses where possible; makes policies easier to reason about and lets the
query planner use the composite indexes.

For batch operations (pathway reorder), use `supabase.rpc()` pointing at a
server-side PL/pgSQL function — one round-trip instead of N.

### 6.5 Realtime — skip v1

Postgres Changes / Supabase Realtime: **skip for launch.** 5 users, each
solo-editing their own data. Nothing to sync live. Revisit if/when
friend-view or collaborative projects land.

Cost of skipping: device-to-device sync for one user requires a refresh.
Acceptable given the audience.

### 6.6 First-render path

`AppShell` mount:
1. `supabase.auth.getSession()` — cached, sync after first fetch.
2. If session, start `hydrateUserProfile()` + `hydrateSeedStatus()` in
   parallel. Gate routes on completion.
3. If no session, redirect to `/signin`.

The existing "first-run seed" (pathway templates, known topics) moves from
"on pathway pick in onboarding" to "on `/welcome` finish" — see §7. The
`seedPathwayFromTemplate` logic itself is unchanged, just pointed at the
Supabase repo impl.

---

## 7. Fresh-start UX

### 7.1 What the user sees on first login

1. `/signin` → sign up with allowlisted email + password.
2. Confirmation email → link back to the app.
3. `/welcome` (new route) — asks for handle + optional pathway pick.
   (Onboarding was retired in Chunk K, so this is *handle-setup only*,
   not a multi-step questionnaire. Pathway can default to `all`.)
4. Dashboard loads empty. The Chunk J starter packs and Chunk L engagement
   prompts handle all first-plan creation.

### 7.2 First-run seed behavior

Currently, the Dexie `seedIfEmpty` function seeds pathway rows + library +
topics on a fresh DB. With Supabase:

- **Content seed (tracks / topics / lessons / quizzes / library / categories)**
  is done by `seed-supabase.ts` once, globally. The client doesn't seed.
- **Per-user seed (pathway items, etc.)** happens on `/welcome` finish.
  `seedPathwayFromTemplate(pathway)` still runs — but against
  `user_pathway_items` via Supabase — and respects the existing "don't
  stamp if any rows exist" guard.

No Dexie "is DB empty?" check anymore. The guards move to checking
`user_pathway_items` for the current user.

### 7.3 Known-topics + pathway-on-settings

Settings page still writes handle, pathway, work-styles, devices,
yearsCoding, knownTopicIds, promptDismissedTopicIds — all map to
`user_profile` columns. Zustand stays, but only as a local cache that's
rehydrated from `user_profile` on auth change and pushed back on every
setter. (Consider replacing Zustand with a thin `useUserProfile` hook that
reads+writes Supabase directly; optional refactor, not blocking.)

### 7.4 "Sign in required" copy

Add a one-line banner on `/signin` for returning users: "Your old local
progress stays on your old browser — this is a fresh start." No import
flow. Users were warned.

---

## 8. Step-by-step migration playbook

Execute in order. Each step is independently revertible.

### Step 1 — Provision Supabase project

- Create project at supabase.com (region: `us-east-1` — closest to GitHub
  Pages edge).
- Record `URL` + `anon key` + `service_role key`.
- Enable extensions: `pgcrypto`, `citext` (already in schema file).
- Configure Auth: email+password, email confirmation ON, TOTP MFA provider
  ON, redirect URLs set.

### Step 2 — Apply schema

- Open `revamp/docs/supabase-schema.sql` → apply §2 amendments → save as
  `revamp/supabase/migrations/0001_init.sql`.
- Paste into Supabase SQL Editor → run. (Or install Supabase CLI and
  `supabase db push`.)
- Spot-check every table exists, every index exists, every trigger fires
  (INSERT into `user_profile` manually with a dummy UUID and confirm
  `touch_updated_at` behavior).

### Step 3 — Apply RLS policies

- Paste §3 SQL into `0002_rls.sql` → run.
- Verify: impersonate anon, SELECT on `user_progress` returns 0 rows.
- Verify: as authenticated test user, INSERT into `user_profile` with
  `is_admin = true` fails.

### Step 4 — Seed the allowlist

```sql
insert into public.signup_allowlist (email, note) values
  ('alanyoungjr@gmail.com', 'owner'),
  ('<user 2>', '<role>'),
  ('<user 3>', '<role>'),
  ('<user 4>', '<role>'),
  ('<user 5>', '<role>');
```

Verify: attempt to sign up with a non-allowlisted email in the
dashboard's Auth → Users → "Invite user" flow — should fail with the
`insufficient_privilege` error.

### Step 5 — Seed content

- Write `revamp/scripts/seed-supabase.ts` per §5.1.
- Run against the service-role key: `npx tsx
  revamp/scripts/seed-supabase.ts`.
- Spot-check row counts match Dexie seed (tracks, topics, lessons,
  quizzes, library_items, categories).
- Manually grant `is_admin = true` to the owner's `user_profile` row
  (dashboard: Table editor → user_profile → edit).

### Step 6 — Wire Supabase client + Auth in Vite

- `npm i @supabase/supabase-js` in `revamp/`.
- Create `src/lib/supabase.ts` per §4.4.
- Add `.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_USE_SUPABASE=true`.
- Update `.github/workflows/deploy-pages.yml` to inject envs from GH
  Actions secrets.
- Build `src/app/AuthGate.tsx` per §4.6. Mount in `App.tsx`.

### Step 7 — Ship `/signin` as real auth

- Wire the preview states in `src/pages/SignIn.tsx` to real calls
  per §4.5.
- Build `/welcome` handle-setup page.
- Build `/settings/security` for MFA enrollment.
- Test end-to-end: signup → email confirm → welcome → handle set →
  dashboard → settings → enroll TOTP → verify → session becomes aal2.

### Step 8 — Swap `repo.ts` implementation

- Rename `src/db/repo.ts` → `src/db/repo.dexie.ts`.
- Write `src/db/repo.supabase.ts` — mirror every function one-to-one
  using the mappers from §6.3. Start with reads (low-risk), then writes.
- Add the re-export shim at `src/db/repo.ts` per §6.2.
- Flip `VITE_USE_SUPABASE=true` in dev. Fix the diffs.

### Step 9 — Remove Dexie code path

After ~2 weeks of stable Supabase in prod:
- Delete `repo.dexie.ts`, `schema.ts`, `seed.ts` (seed contents stay
  where they are since the `seed-supabase.ts` script imports from
  `src/db/seed.ts` — rename seed.ts to `seedData.ts` and refactor
  imports accordingly).
- Collapse `repo.ts` back to a single file (drop the shim).
- Remove `dexie` dep from `package.json`.
- Remove `VITE_USE_SUPABASE` flag everywhere.

### Step 10 — Cut over in production

- Merge to `main` with `VITE_USE_SUPABASE=true` in prod env.
- Announce to the 5 users: "Fresh start today. Old browser data stays
  put locally but the app doesn't read it anymore."
- Watch error rates in Supabase logs for 48 hours. Expect:
  - `23505` on handle collisions (normal — handle).
  - RLS 42501 (permission denied) is a RED FLAG — always a policy bug,
    never user error. Investigate immediately.

---

## 9. Rollback plan

Fresh-start model keeps rollback cheap — no user data at risk because
there IS no server-side user data pre-cutover, and post-cutover the
local IndexedDB is still intact (we don't wipe it).

### 9.1 Before cutover (step 10)

Flip `VITE_USE_SUPABASE=false`, rebuild, deploy. Zero data loss — users
go back to their IndexedDB state as it was.

### 9.2 After cutover

If a bug surfaces:

1. **Ship-stopping bug in Supabase path** — flip env to false, redeploy
   Dexie. Users lose any Supabase-only work since cutover (session
   progress, new projects). Acceptable for a small user base IF it's
   communicated. Window: first 1–2 weeks.
2. **Data-corruption in Supabase** — restore from Supabase's Point-in-
   Time Recovery (available on paid tiers; verify plan before cutover).
   Free tier gets daily backups only — acceptable for this scale.
3. **RLS catastrophe** — service-role-disable the table via
   `alter table ... disable row level security` from dashboard, fix
   the policy, re-enable. Never leave RLS off in prod for more than the
   debug window.

### 9.3 Post-week-2

Once Dexie path is deleted (step 9), rollback becomes: revert the commit
that deleted it. Keep git history clean enough for `git revert <sha>` to
work for at least a month.

---

## 10. Post-migration follow-ups

Gated on this migration landing. Order matters.

1. **Admin role UI** (first, ~1 week). Now that `is_admin` does something,
   ship the admin-only pages: `/admin` (gated route), allowlist management,
   YouTube video-pin form, authoring queue stub, live theme tweaker, dev
   debug panel. Feature flag = the `is_admin` column.
2. **YouTube API integration.** Interactive Google OAuth in admin-only
   flow. Admin searches YouTube, pins results into library_items with
   required target/tags/notes form. Wishlist path for "decide later".
3. **Freshness Pipeline piece 1 — scraper.** Revive the legacy-root
   `update-feed` pipeline, repointed at a `drafts` table in Supabase
   (new). Authoring queue from step 1 gains a "scraped drafts" lane.
4. **Claude API integration** — separate project. Adds drafts-from-
   scraper-output. Lands in the same admin queue; admin approves →
   drafts promote into `topics`/`library_items`/etc.
5. **AI-generated custom pathway** — depends on Claude API project.
6. **Friend-view UI** — flip `visibility` dropdown on projects, add the
   friend-read RLS policy from §3.3, build `/u/<handle>` public profile
   route.
7. **MFA enforcement at aal2** — once all 5 users have TOTP enrolled,
   swap owner-all policies for owner-aal2 per §3.4.

---

## 11. Estimated effort

Ranges assume one developer, focused, no surprises. Double if interrupted.

| Step                                           | Effort     |
|------------------------------------------------|------------|
| Supabase project + extensions + auth config    | 2 h        |
| Schema refinement + amendments from §2         | 4–6 h      |
| RLS policies + admin helper + tests            | 4–6 h      |
| Signup allowlist + trigger + seeding           | 1 h        |
| Content seed script                            | 6–8 h      |
| Supabase client wire + env + deploy workflow   | 2 h        |
| `/signin` real auth flow                       | 4 h        |
| `/welcome` + handle setup                      | 2 h        |
| `/settings/security` MFA enrollment            | 4 h        |
| AuthGate + session hydration                   | 3 h        |
| `repo.supabase.ts` (full parity)               | 12–20 h    |
| `mappers.ts` + type plumbing                   | 4 h        |
| End-to-end testing (all 5 users, all flows)    | 8 h        |
| Cutover + monitoring window                    | 4 h        |
| Dexie cleanup (step 9, week 3)                 | 2 h        |
| **Total**                                      | **60–80 h**|

Roughly 2 focused weeks. The `repo.supabase.ts` parity pass is the long
pole — every repo function needs a mapper + a mutation path + a
smoke test.

---

## 12. Open questions

Decisions NOT made yet. Flagging before the migration starts, not
inventing answers.

1. **Recovery codes.** Supabase TOTP doesn't ship native recovery codes.
   Options: (a) generate our own, store hashed in a new
   `user_recovery_codes` table; (b) rely on Supabase dashboard admin
   reset for lockouts; (c) require an authenticator-app backup on the
   user's side. No decision. Default if not answered: option (b) for v1
   because the user base is 5 people and admin is reachable.
2. **`.env.production` vs GH secrets.** The anon key is public, so
   `.env.production` committed is defensible. Tradition says secrets.
   No decision — `.env` template with GH secrets wiring is the safe
   default.
3. **Paid Supabase tier for PITR?** Free tier does daily backups.
   Fresh-start model lowers the stakes. Default to free tier; revisit
   if anyone has a week of work they'd miss.
4. **Realtime — skip forever or just v1?** Skipping v1 is locked.
   Open: do we want it for friend-view? Probably — but defer that
   decision to the friend-view build.
5. **Handle validation rules.** Draft regex `^[a-z0-9_-]{2,32}$` is a
   guess. Reserved words ("admin", "api", "settings")? Length bounds?
   No decision.
6. **Onboarding retirement vs `/welcome` step.** Chunk K retired
   onboarding entirely. `/welcome` post-auth is a new surface. Could be
   as minimal as "pick a handle, click continue". Open: does it also
   re-ask pathway, or default everyone to `all` and let starter packs do
   the work? Lean toward the latter.
7. **Category tables for tags/edges?** Current plan uses `text[]` +
   GIN. Alternative is a join table (`topic_tags(topic_id, tag)`). The
   join table wins on "rename tag everywhere" and "tag popularity
   queries"; `text[]` wins on simplicity + Dexie parity. No decision
   needed for launch — `text[]` is fine at 1k topics. Revisit if tag
   management becomes a surface.
8. **When to delete `repo.dexie.ts`.** Step 9 says "~2 weeks." Could be
   faster if everyone's on Supabase happily after 3 days. User call.

---

_Author: next-session AI agent, 2026-04-23. Assume stale if not updated
when Chunks P+ ship content schema changes._
