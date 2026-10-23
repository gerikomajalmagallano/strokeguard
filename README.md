# StrokeGuard

StrokeGuard is a Vue 3 + TypeScript research prototype for four-question lower-limb functional reporting and rules-based lower-limb exercise guidance. It does not diagnose stroke or replace professional medical advice.

## Patient flow

Login → Dashboard → Four-Question Lower-Limb Assessment → Findings and Recommendations → Exercise Guide/Session → Assessment History

The four answers remain separate; StrokeGuard does not combine them into a severity score. Normal/No reported difficulty answers do not trigger recommendations.
Recommendations are grouped by the reported activity that matched the exercise; they are not assigned to days because the exercise library has no cited schedule or frequency guidance. Existing exercise instructions, safety text, durations, and repetitions are shown as catalogue content. Exercise references are not currently recorded in the library.

## Run locally

Configure the Supabase project as described below before using the app. Login and patient records require an internet connection; the app does not support local-only accounts or offline assessment saves.

```bash
npm install
npm run dev
```

## Configure Supabase

The Supabase JavaScript package is already installed. To enable Supabase Authentication and PostgreSQL:

1. Create a Supabase project.
2. For an existing StrokeGuard database, first apply [`docs/migrations/20261023_four_question_lower_limb_assessment.sql`](docs/migrations/20261023_four_question_lower_limb_assessment.sql) in the Supabase SQL Editor. It retains historical columns and records, makes the obsolete facial/classification columns optional, adds the four answer fields, and updates the authenticated save function. New four-question records require all answers. This project cannot apply the migration remotely; verify it succeeds in Supabase before using the updated app.
   If saving still reports a `NOT NULL` error for `classification`, apply [`docs/migrations/20261023_fix_legacy_assessment_not_null.sql`](docs/migrations/20261023_fix_legacy_assessment_not_null.sql) in the same Supabase project. This repair only removes obsolete required-column constraints and preserves all existing values; it does not add a fabricated classification.
3. For a new database, run [`docs/supabase-schema.sql`](docs/supabase-schema.sql). It creates the current tables, row-level security policies, save function, and lower-limb exercise catalogue.
4. Enable Email in Authentication → Providers. For a thesis demonstration, either complete email verification during signup or disable email confirmation in the Supabase Auth settings.
5. Copy `.env.example` to `.env.local`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project's API settings.
6. Restart the Vite server. Never put a Supabase service-role key in this frontend project.

Signup/login use Supabase Auth. Patient information, assessments, exercise sessions, and recommendation links are stored in PostgreSQL. RLS policies limit access to the authenticated patient's own records.
For the complete online-only setup and verification steps, see [`docs/online-only.md`](docs/online-only.md).

## Build

```bash
npm run build
```

## Main implementation files

- `src/services/rulesEngine.ts` — deterministic activity-to-exercise matching rules
- `src/data/exercises.ts` — exercise catalogue and instructions
- `src/services/storage.ts` — online, patient-scoped Supabase data access
- `src/stores/auth.ts` — authentication and patient information
- `src/views/AssessmentView.vue` — lower-limb assessment
- `src/views/ResultsView.vue` — four recorded answers and recommendations
- `src/views/RecommendationsView.vue` — reasons and lower-limb exercise
- `src/views/HistoryView.vue` — patient assessment history

The four questions are proposed self-reported findings, not a validated instrument. Recommendations match the existing exercise names, instructions, and stated benefits; they are not clinically validated treatment guidance.
