-- Run this once in the Supabase SQL Editor if your project already exists.
-- Adds section (grouped, paginated) support for activities.
-- Safe to run more than once.

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  title text not null default '',
  intro_text text not null default '',
  position int not null default 0
);

create index if not exists sections_lesson_id_idx on sections (lesson_id);

alter table activities add column if not exists section_id uuid references sections(id) on delete set null;

alter table sections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'sections' and policyname = 'anon full access - sections'
  ) then
    create policy "anon full access - sections" on sections for all using (true) with check (true);
  end if;
end $$;
