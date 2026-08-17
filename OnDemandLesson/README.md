# Lesson Studio — asynchronous EFL lesson authoring & delivery

A working prototype for creating and delivering asynchronous CEFR B1 EFL lessons
when a scheduled class can't run. It is a single-teacher tool for now, built so
it can grow into a multi-user platform later without a rebuild.

## What's in the box

```
lesson-app/
  src/
    lib/
      supabaseClient.js    Supabase client, reads env vars
      api.js                All database/storage calls (the only file that talks to Supabase)
      grading.js            Auto-marking logic, shared by builder preview and student submission
    pages/
      TeacherDashboard.jsx   "My Lessons" — list, create, duplicate, results
      LessonBuilder.jsx      Create/edit a lesson: text, audio, images, vocab, activities
      StudentLesson.jsx      Public lesson delivery page students open via a link
      LessonResults.jsx      Per-student results, CSV export, Google Sheets export
    components/
      AudioPlayer.jsx, ReadingText.jsx
      activity-editors/      Teacher-facing editors, one per activity type
      activity-players/      Student-facing renderers, one per activity type
  supabase/
    schema.sql               Tables, storage bucket, RLS policies
    seed.sql                 The "Government and Values" example lesson
    functions/export-to-sheets/index.ts   Optional edge function for Sheets export
  .env.example
```

## Why it's built this way

**Lessons are data, not code.** A lesson is a row in `lessons` plus rows in
`activities` and `vocabulary`. The builder UI is the only place JSON-shaped
config gets touched — you never hand-edit it. Adding a new activity type later
means adding a value to the `type` check constraint, an editor component, and
a player component; nothing else changes.

**Auto-marking lives in one place (`lib/grading.js`).** Fill-in-the-blank and
multiple-choice are objectively markable, so they're auto-scored. Short-answer
and reasoning questions are stored for you to read — the pedagogy here is
evidence-based reasoning, not string matching, so those are never auto-graded.
This mirrors the four cognitive levels in the brief (information, inference,
evaluation, reasoning): the first two are checkable by machine, the rest need
a reader.

**The database is the source of truth; Google Sheets is a mirror.** All
scoring and lesson content live in Postgres via Supabase. "Export CSV" always
works client-side, no setup. "Export to Google Sheets" is optional and goes
through an edge function using a Google service account, so you don't have to
do a Google OAuth login flow for a single-teacher tool.

**No accounts yet, on purpose.** `lessons.teacher_id` and RLS policies are
already shaped for a multi-teacher future (see comments in `schema.sql`), but
v1 uses permissive policies keyed on nothing but the anon key, because there's
one teacher: you. When you're ready for multiple teachers, you add Supabase
Auth, populate `teacher_id` from `auth.uid()`, and tighten the four "anon full
access" policies to be scoped by owner — the table shapes don't change.

**Students identify themselves with a name, not an account.** `submissions`
stores whatever the student types in `student_identifier`. That's enough for
a single class roster read against your gradebook by name. If this becomes
multi-user, that field becomes a foreign key to a real students table.

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, and note the
**Project URL** and **anon public key** from Project Settings → API.

### 2. Run the schema

Open the SQL editor in your Supabase dashboard and run, in order:

1. `supabase/schema.sql`
2. `supabase/seed.sql` (optional — loads the example "Government and Values" lesson)

This also creates a public storage bucket called `lesson-media` for audio and images.

**Already have a project running from before sections existed?** Run
`supabase/updates/2026-08-add-sections.sql` once in the SQL Editor — it adds
the `sections` table and links it to `activities` without touching anything
else. Safe to run more than once.

### 3. Configure the app

```bash
cd lesson-app
cp .env.example .env
# edit .env and paste in your Supabase URL and anon key
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). If you ran
`seed.sql`, the example lesson is already published — you can open it directly
at `http://localhost:5173/l/gov-values-demo`.

### 5. (Optional) Google Sheets export

This step is not required — CSV export always works. Only do this if you want
results pushed straight into a live Google Sheet.

1. In Google Cloud Console, create a service account and download its JSON key.
2. Enable the Google Sheets API for that project.
3. Create (or reuse) a Google Sheet, and share it with the service account's
   email address (found in the JSON as `client_email`) as an **Editor**.
4. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and link
   it to your project, then set secrets and deploy:

```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="...@....iam.gserviceaccount.com"
supabase secrets set GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
supabase secrets set GOOGLE_SHEET_ID="the spreadsheet ID from its URL"
supabase functions deploy export-to-sheets
```

The "Export to Google Sheets" button on the results page then writes one tab
per lesson into that spreadsheet.

## Using it

1. **Create a lesson** from the dashboard: title, level, reading text, audio,
   optional images.
2. **Add vocabulary** items (term, definition, example).
3. **Add activities**: fill-in-the-blank and multiple-choice for comprehension,
   short-answer for evidence-based response, reasoning for identifying claims,
   evidence, assumptions, or relationships between ideas. Mix and reorder
   freely — the builder doesn't force a fixed template.
3b. **(Optional) Add sections** to group activities under a heading with intro
   text. Each section becomes its own page for the student, with Next/Back
   between them. Assign any activity to a section from the "section" dropdown
   on its card. Lessons with no sections show everything on one page, as before.
4. **Publish**, then copy the student link shown on the builder page.
5. Students open the link, type their name, work through the lesson, and submit.
   On wide screens the reading text, audio, images, and vocabulary stay pinned
   in a left-hand column throughout — including on later section pages, not
   just the first — so students can check back against the source material
   while answering. On mobile they sit above the questions, with the reading
   text collapsible to save space.
6. **Results** page shows completion, auto-marked scores, and every response —
   including short-answer and reasoning answers for you to read and grade by eye.

## Known limits of this prototype (by design, not oversight)

- Single teacher, no login. Adding Supabase Auth is the natural next step.
- No edit-in-place for a student's submission once submitted.
- No partial-credit or fuzzy matching beyond an accepted-answers list for gap-fill.
- Reordering activities is up/down buttons, not drag-and-drop.
- The Sheets export writes a fresh snapshot per click rather than syncing live.

None of these require changing the data model to fix — they're UI and edge-function
work layered on top of the schema you already have.
