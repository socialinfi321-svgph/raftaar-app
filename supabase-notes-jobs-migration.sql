-- Lecture Notes Server-Side Jobs, Shared Cache & Storage Schema
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

-- 1. Job orchestrator & resumable state table
create table if not exists lecture_jobs (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  mode_key text not null default 'auto',
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  phase text not null default 'queued',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  duration_sec integer not null default 600,
  video_title text not null default '',
  lease_until timestamptz,
  attempts integer not null default 0,
  outline jsonb,
  lang_profile jsonb,
  total_chunks integer not null default 0,
  completed_chunks integer not null default 0,
  total_chapters integer not null default 0,
  completed_chapters integer not null default 0,
  error_status integer,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id, mode_key)
);

create index if not exists idx_lecture_jobs_lookup on lecture_jobs(video_id, mode_key);
create index if not exists idx_lecture_jobs_status_lease on lecture_jobs(status, lease_until);

-- 2. Chunk digests table (persists each 10-min video digest immediately)
create table if not exists lecture_digests (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  mode_key text not null default 'auto',
  start_sec integer not null,
  end_sec integer not null,
  digest jsonb not null,
  source text not null default 'youtube_video',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id, mode_key, start_sec, end_sec)
);

create index if not exists idx_lecture_digests_lookup on lecture_digests(video_id, mode_key, start_sec);

-- 3. Chapters (student notes + mind map + MCQs stored as jsonb, never raw PDF)
create table if not exists lecture_chapters (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  mode_key text not null default 'auto',
  chapter_index integer not null,
  start_sec integer not null,
  end_sec integer not null,
  title text not null,
  notes jsonb not null,
  mcqs jsonb not null default '[]'::jsonb,
  board_visuals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id, mode_key, chapter_index)
);

create index if not exists idx_lecture_chapters_lookup on lecture_chapters(video_id, mode_key, chapter_index);

-- 4. Board visuals metadata (actual SVG/image stored in Supabase Storage; DB keeps only URL)
create table if not exists lecture_visuals (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  mode_key text not null default 'auto',
  visual_id text not null,
  status text not null default 'done' check (status in ('done', 'skipped')),
  kind text not null default 'svg' check (kind in ('svg', 'img', 'skip')),
  image_url text,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id, mode_key, visual_id)
);

create index if not exists idx_lecture_visuals_lookup on lecture_visuals(video_id, mode_key);

-- 5. Daily usage limits (per-user daily limit & app-wide daily budget)
create table if not exists lecture_usage_daily (
  usage_date date not null,
  scope text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (usage_date, scope)
);

-- 6. Storage bucket for board diagrams (public read for cached lecture notes, server write via service role)
insert into storage.buckets (id, name, public)
values ('lecture-visuals', 'lecture-visuals', true)
on conflict (id) do update set public = excluded.public;

-- 7. Row Level Security: authenticated read of shared notes cache, server-only writes
alter table lecture_jobs enable row level security;
alter table lecture_digests enable row level security;
alter table lecture_chapters enable row level security;
alter table lecture_visuals enable row level security;
alter table lecture_usage_daily enable row level security;

drop policy if exists "Authenticated read lecture_jobs" on lecture_jobs;
create policy "Authenticated read lecture_jobs"
  on lecture_jobs for select
  to authenticated
  using (true);

drop policy if exists "Authenticated read lecture_chapters" on lecture_chapters;
create policy "Authenticated read lecture_chapters"
  on lecture_chapters for select
  to authenticated
  using (true);

drop policy if exists "Authenticated read lecture_visuals" on lecture_visuals;
create policy "Authenticated read lecture_visuals"
  on lecture_visuals for select
  to authenticated
  using (true);
