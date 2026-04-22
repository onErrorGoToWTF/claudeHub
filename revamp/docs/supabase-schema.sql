-- =====================================================================
-- aiUniversity — Supabase schema (draft)
--
-- Paste into the Supabase SQL editor, OR commit as
-- `supabase/migrations/0001_init.sql` once you install the Supabase CLI.
--
-- Conventions:
--   * snake_case in SQL. camelCase in TypeScript at the repo boundary.
--   * TEXT ids for domain rows ('t.tokens', 'p.abc'). UUID for users.
--   * TIMESTAMPTZ everywhere. Convert to ms in repo.ts if you want.
--   * Every user-scoped table has RLS on + policies tying rows to auth.uid().
--
-- Order of execution matters — parents before children.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- =====================================================================
-- 1. USER PROFILE
-- Stores per-user preferences (pathway, theme later) independent of auth.
-- Auto-populated by the on_auth_user_created trigger below.
-- =====================================================================

create table if not exists public.user_profile (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  -- handle: mutable display name. Used in friend-view URLs (/u/<handle>).
  -- Keeps auth.users.id out of URLs so you can rename yourself without
  -- breaking any relationship (all FKs are on user_id, never handle).
  handle     citext unique,
  -- is_admin: gates the admin-only surfaces (YouTube video pinning to
  -- topics/courses/tools, authoring queue, dev debug panel, theme
  -- tweaker, etc.). Set only via the Supabase dashboard / service role
  -- — user-editable RLS policies MUST never include this column.
  is_admin   boolean not null default false,
  pathway    text not null default 'all' check (pathway in ('all','student','office','dev')),
  -- work_styles: permissive tag set. Users can select multiple
  -- ('no_code', 'vibe_code', 'engineer', 'frontend', 'backend', 'fullstack',
  -- 'research', etc.). Values are a free-form convention, not a CHECK
  -- constraint, so new styles can land without a migration.
  work_styles      text[] not null default '{}',
  -- devices: 'mac' | 'windows' | 'linux' | 'iphone' | 'android' | 'ipad'
  devices          text[] not null default '{}',
  years_coding     int,  -- nullable, only meaningful when pathway='dev'
  -- known_topic_ids: topics the user has told us they already know.
  -- Learn can dim, collapse, or auto-complete these. Soft reference
  -- (no FK) so a content-side topic delete doesn't break the profile.
  known_topic_ids  text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Required for the citext type above. Cheap extension, no downside.

-- =====================================================================
-- 2. SHARED CONTENT
-- Read-only for users. Seeded from the repo (either from a SQL seed file
-- or by your existing src/db/seed.ts pushed via a one-shot admin script).
-- =====================================================================

create table if not exists public.tracks (
  id       text primary key,
  title    text not null,
  summary  text not null,
  "order"  int  not null,
  audience text[] not null default '{}'
);

create table if not exists public.topics (
  id               text primary key,
  -- RESTRICT, not CASCADE: deleting a track should NOT silently nuke every
  -- user's progress + mastery rows. Content authors must unlink topics first.
  track_id         text not null references public.tracks(id) on delete restrict,
  title            text not null,
  summary          text not null,
  "order"          int  not null,
  audience         text[] not null default '{}',
  prereq_topic_ids text[] not null default '{}'
);
create index if not exists topics_track_id_idx on public.topics(track_id);

create table if not exists public.lessons (
  id       text primary key,
  topic_id text not null references public.topics(id) on delete restrict,
  title    text not null,
  summary  text not null,
  minutes  int  not null default 0,
  body     text not null,
  "order"  int  not null
);
create index if not exists lessons_topic_id_idx on public.lessons(topic_id);

create table if not exists public.quizzes (
  id        text primary key,
  topic_id  text not null references public.topics(id) on delete cascade,
  title     text not null,
  -- questions: QuizQuestion[] JSON array. Each element:
  -- { id, prompt, choices[], answerIdx, explain? }
  questions jsonb not null default '[]'::jsonb
);
create index if not exists quizzes_topic_id_idx on public.quizzes(topic_id);

create table if not exists public.library_items (
  id             text primary key,
  kind           text not null check (kind in ('tool','doc','read','video')),
  title          text not null,
  summary        text,
  body           text,
  url            text,
  tags           text[] not null default '{}',
  added_at       timestamptz not null default now(),
  audience       text[] not null default '{}',
  tool_category  text check (tool_category is null
    or tool_category in ('model','ide','framework','service','tool')),
  cost           text check (cost is null or cost in ('free','paid','subscription'))
);
create index if not exists library_items_kind_idx on public.library_items(kind);

-- =====================================================================
-- 3. USER-SCOPED DATA
-- RLS-protected. Every row carries user_id; policies enforce ownership.
-- =====================================================================

create table if not exists public.user_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  id           text not null, -- matches lesson/quiz id
  kind         text not null check (kind in ('lesson','quiz')),
  topic_id     text not null references public.topics(id) on delete cascade,
  completed_at timestamptz,
  score        numeric, -- 0..1 for quizzes
  attempts     int not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, id, kind)
);
create index if not exists user_progress_user_updated_idx
  on public.user_progress(user_id, updated_at desc);

create table if not exists public.user_mastery (
  user_id    uuid not null references auth.users(id) on delete cascade,
  topic_id   text not null references public.topics(id) on delete cascade,
  score      numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table if not exists public.user_projects (
  -- ID strategy: keep TEXT so existing 'p.xxx' IDs from IndexedDB migrate
  -- as-is, but NEW project IDs minted by the app should be UUIDs
  -- (gen_random_uuid()::text) to avoid millisecond-collision risk once
  -- two users mint projects at the same moment.
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- visibility: private today, 'friends' / 'public' once friend-view lands.
  -- Carried now so RLS policies + future friendship joins don't need a
  -- column migration on a populated table.
  visibility      text not null default 'private'
    check (visibility in ('private','friends','public')),
  title           text not null,
  summary         text not null,
  status          text not null default 'backlog'
    check (status in ('backlog','planned','in_progress','completed','canceled')),
  health          text check (health is null
    or health in ('on_track','at_risk','off_track')),
  route           text not null
    check (route in ('easiest','cheapest','best')),
  stack           text[] not null default '{}',
  gap_topic_ids   text[] not null default '{}',
  checklist       jsonb  not null default '[]'::jsonb, -- ProjectChecklistItem[]
  live_url        text,
  repo_url        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists user_projects_user_updated_idx
  on public.user_projects(user_id, updated_at desc);

create table if not exists public.user_project_events (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.user_projects(id) on delete cascade,
  ts         timestamptz not null default now(),
  kind       text not null check (kind in ('created','status_changed','health_changed')),
  "from"     text,
  "to"       text
);
create index if not exists user_project_events_project_ts_idx
  on public.user_project_events(project_id, ts desc);

create table if not exists public.user_library_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.library_items(id) on delete cascade,
  pinned  boolean not null default false,
  owned   boolean not null default false,
  notes   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.user_search_misses (
  user_id  uuid not null references auth.users(id) on delete cascade,
  id       text not null, -- normalized (lowercased, trimmed) query
  query    text not null, -- the original typed query, last value
  count    int  not null default 1,
  first_at timestamptz not null default now(),
  last_at  timestamptz not null default now(),
  resolved boolean not null default false,
  primary key (user_id, id)
);

-- =====================================================================
-- 3b. FRIENDSHIPS (scaffolded for friend-view, unused in v1)
-- Symmetric relationship: we store both (A -> B) and (B -> A) rows on
-- accept, so every "are these two connected?" query is a single point
-- read by PK. Status lifecycle: 'pending' -> 'accepted' | 'blocked'.
-- =====================================================================

create table if not exists public.friendships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending'
    check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friendships_friend_idx on public.friendships(friend_id);

-- =====================================================================
-- 4. ROW-LEVEL SECURITY
-- Turn RLS on for every table, then write policies.
-- Shared content = read-only-to-everyone; no public write policies.
-- User-scoped = row owner can do everything.
-- =====================================================================

alter table public.user_profile         enable row level security;
alter table public.tracks               enable row level security;
alter table public.topics               enable row level security;
alter table public.lessons              enable row level security;
alter table public.quizzes              enable row level security;
alter table public.library_items        enable row level security;
alter table public.user_progress        enable row level security;
alter table public.user_mastery         enable row level security;
alter table public.user_projects        enable row level security;
alter table public.user_project_events  enable row level security;
alter table public.user_library_state   enable row level security;
alter table public.user_search_misses   enable row level security;
alter table public.friendships          enable row level security;

-- ---- shared content: anyone signed in can read, nobody can write via RLS
create policy tracks_read          on public.tracks          for select using (true);
create policy topics_read          on public.topics          for select using (true);
create policy lessons_read         on public.lessons         for select using (true);
create policy quizzes_read         on public.quizzes         for select using (true);
create policy library_items_read   on public.library_items   for select using (true);

-- ---- profile: owner-only
create policy user_profile_owner_all on public.user_profile
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- user-scoped: owner-only (SELECT / INSERT / UPDATE / DELETE)
create policy user_progress_owner_all        on public.user_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_mastery_owner_all         on public.user_mastery
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_projects_owner_all        on public.user_projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_project_events_owner_all  on public.user_project_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_library_state_owner_all   on public.user_library_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_search_misses_owner_all   on public.user_search_misses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy friendships_involved_all        on public.friendships
  for all using (user_id = auth.uid() or friend_id = auth.uid())
  with check (user_id = auth.uid());

-- =====================================================================
-- 4b. SIGNUP ALLOWLIST
-- Gate who can create an account. Separate concern from MFA (MFA gates
-- ongoing access; this gates the door). Hardcode permitted emails by
-- inserting rows into signup_allowlist from the Supabase dashboard.
-- =====================================================================

create table if not exists public.signup_allowlist (
  email     citext primary key,
  added_at  timestamptz not null default now(),
  note      text  -- optional: who they are, why they're in
);

-- Not RLS-protected for writes — only the service role (dashboard / CLI)
-- ever touches this table. We still enable RLS so the anon + authenticated
-- roles get zero access by default.
alter table public.signup_allowlist enable row level security;
-- (no policies — fully private to service_role)

create or replace function public.enforce_signup_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.signup_allowlist where email = new.email
  ) then
    raise exception 'signup not permitted for %', new.email
      using errcode = 'insufficient_privilege',
            hint    = 'ask the owner to add this email to signup_allowlist';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_allowlist on auth.users;
create trigger enforce_signup_allowlist
  before insert on auth.users
  for each row execute function public.enforce_signup_allowlist();

-- =====================================================================
-- 5. AUTH TRIGGER — seed a profile row on signup
-- Without this, a user exists in auth.users but has no user_profile row,
-- so pathway preference would fall back to 'all' every time.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profile (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 6. (LATER) MFA ENFORCEMENT
-- After the grace period ends, we can require aal2 (TOTP) on sensitive
-- tables by replacing the policies above. Example — not enabled by v1:
--
--   create policy user_projects_owner_mfa on public.user_projects
--     for all using (
--       user_id = auth.uid()
--       and (auth.jwt()->>'aal')::text = 'aal2'
--     );
-- =====================================================================
