-- Lesson Studio schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ---------- lessons ----------

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  -- nullable for now: v1 is single-teacher. Once multi-user is added,
  -- populate this from auth.uid() and make it not-null.
  teacher_id uuid,
  title text not null default 'Untitled lesson',
  level text not null default 'B1',
  reading_text text not null default '',
  audio_url text,
  images jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  share_slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_status_idx on lessons (status);
create index if not exists lessons_share_slug_idx on lessons (share_slug);

-- ---------- sections ----------
-- Optional grouping of activities under a heading, e.g. "Comprehension" or
-- "Reasoning". Students see each section as its own page, with Next/Back
-- navigation. A lesson with no sections shows all its activities on one
-- page, unchanged from the original behaviour.

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  title text not null default '',
  intro_text text not null default '',
  position int not null default 0
);

create index if not exists sections_lesson_id_idx on sections (lesson_id);

-- ---------- activities ----------
-- One row per exercise item on a lesson. `config` is deliberately jsonb so the
-- four activity types (below) can each keep their own shape without needing a
-- schema migration every time a new question type is added.
--
--   gap_fill:        config = { accepted_answers: ["values"] }
--   multiple_choice: config = { options: ["...", "..."], correct_index: 0 }
--   short_answer:    config = {}                              -- teacher-graded
--   reasoning:       config = { subtype: "assumption" }        -- teacher-graded
--                     subtype is one of: claim | evidence | assumption | relationship

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  -- Which section (page) this activity belongs to. Null means "ungrouped" —
  -- shown on the single page, same as lessons created before sections existed.
  section_id uuid references sections(id) on delete set null,
  type text not null check (type in ('gap_fill', 'multiple_choice', 'short_answer', 'reasoning')),
  prompt text not null,
  config jsonb not null default '{}',
  points int not null default 1,
  position int not null default 0
);

create index if not exists activities_lesson_id_idx on activities (lesson_id);

-- ---------- vocabulary ----------

create table if not exists vocabulary (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  term text not null,
  definition text not null,
  example text default '',
  position int not null default 0
);

create index if not exists vocabulary_lesson_id_idx on vocabulary (lesson_id);

-- ---------- submissions ----------
-- v1 has no student accounts, so a submission is identified by whatever the
-- student typed in (name / student ID). Good enough for a single class; swap
-- for a real foreign key to a students/users table when this becomes multi-user.

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  student_identifier text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  max_auto_score numeric
);

create index if not exists submissions_lesson_id_idx on submissions (lesson_id);

-- ---------- responses ----------

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  response_text text not null default '',
  auto_correct boolean, -- null for teacher-graded types
  auto_score numeric,
  teacher_score numeric,
  teacher_feedback text
);

create index if not exists responses_submission_id_idx on responses (submission_id);

-- ---------- storage ----------

insert into storage.buckets (id, name, public)
values ('lesson-media', 'lesson-media', true)
on conflict (id) do nothing;

-- ---------- row level security ----------
-- v1 is a personal single-teacher tool with no login, so policies here are
-- deliberately permissive (anon key can read/write everything). Before this
-- becomes multi-user, replace these with policies scoped to auth.uid() =
-- teacher_id, and split "public can read published lessons" from
-- "only the owning teacher can write".

alter table lessons enable row level security;
alter table sections enable row level security;
alter table activities enable row level security;
alter table vocabulary enable row level security;
alter table submissions enable row level security;
alter table responses enable row level security;

create policy "anon full access - lessons" on lessons for all using (true) with check (true);
create policy "anon full access - sections" on sections for all using (true) with check (true);
create policy "anon full access - activities" on activities for all using (true) with check (true);
create policy "anon full access - vocabulary" on vocabulary for all using (true) with check (true);
create policy "anon full access - submissions" on submissions for all using (true) with check (true);
create policy "anon full access - responses" on responses for all using (true) with check (true);

create policy "anon read/write media" on storage.objects for all
  using (bucket_id = 'lesson-media') with check (bucket_id = 'lesson-media');
