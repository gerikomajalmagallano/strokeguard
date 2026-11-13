# StrokeGuard

StrokeGuard is a Vue 3 + TypeScript research prototype for four-question lower-limb functional assessment and rule-based exercise recommendations. It does not diagnose stroke, calculate stroke severity, or replace professional rehabilitation advice.

## Patient flow

Login → Dashboard → Four-Question Lower-Limb Assessment → Findings and Recommendations → Exercise Guide/Session → Assessment History

The four answers remain separate: leg movement, standing, walking, and sit-to-stand. The rules use explicit answer IDs and exercise IDs; they do not calculate severity or search exercise text. Functional matching uses those explicit rules and relevant recorded abilities (for example, supported heel raises also require a compatible standing response). There is no separate eligibility-approval stage in the recommendation flow: matching exercises are displayed with available safety information and references, which do not constitute clinical clearance. Day 1–Day 4 labels organize matches by area for display only; this is not a schedule or planner.

## Run locally

Configure the Supabase project as described below before using the app. Login and patient records require an internet connection; the app does not support local-only accounts or offline assessment saves.

```bash
npm install
npm run dev
```

## Configure Supabase

The Supabase JavaScript package is already installed. To enable Supabase Authentication and PostgreSQL:

1. Create a Supabase project.
2. For an existing StrokeGuard database, inspect the live schema, exercise IDs, and row-level security policies and take a backup before applying applicable migrations. The assessment and library migrations are [`docs/migrations/20261030_activity_based_assessment.sql`](docs/migrations/20261030_activity_based_assessment.sql), [`docs/migrations/20261030_expand_exercise_library.sql`](docs/migrations/20261030_expand_exercise_library.sql), and [`docs/migrations/20261031_expand_evidence_based_exercises.sql`](docs/migrations/20261031_expand_evidence_based_exercises.sql). For a database matching the inspected 17-row baseline, apply [`docs/migrations/20261113_migrate_exercises_to_supabase.sql`](docs/migrations/20261113_migrate_exercises_to_supabase.sql) in the Supabase SQL Editor. It preserves an existing ID 7 conflict, maps the local exercise to ID 21, and validates all 20 local records. The migration is baseline-guarded; do not rerun it after it has completed.
3. For a new database, run [`docs/supabase-schema.sql`](docs/supabase-schema.sql). It creates the current tables, row-level security policies, save function, and lower-limb exercise catalogue.
4. Enable Email in Authentication → Providers. For a thesis demonstration, either complete email verification during signup or disable email confirmation in the Supabase Auth settings.
5. Copy `.env.example` to `.env.local`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project's API settings.
6. Restart the Vite server. Never put a Supabase service-role key in this frontend project.

Signup/login use Supabase Auth. Patient information, assessments, exercise sessions, and the exercise catalogue are loaded from PostgreSQL. The exercise catalogue requires an authenticated session and its read policy is scoped to the `authenticated` role. Rule-matched recommendations are recalculated from each saved assessment using the catalogue retrieved from Supabase. RLS policies limit access to the authenticated patient's own records.
The older migrations dated 20261023 are superseded for the current app. Do not apply them after this migration. For the complete online-only setup and verification steps, see [`docs/online-only.md`](docs/online-only.md).

## Build

```bash
npm run build
npm test
```

## Main implementation files

- `src/services/rulesEngine.ts` — explicit answer-to-exercise matches and documented functional requirements
- `src/services/exerciseService.ts` — authenticated Supabase exercise catalogue access and database-field mapping
- `src/stores/exercises.ts` — shared catalogue loading, retry, and error state
- `docs/migrations/20261113_migrate_exercises_to_supabase.sql` — guarded exercise-library migration
- `src/services/storage.ts` — online, patient-scoped Supabase data access
- `src/stores/auth.ts` — authentication and patient information
- `src/views/AssessmentView.vue` — lower-limb assessment
- `src/views/ResultsView.vue` — four recorded answers and recommendations
- `src/views/RecommendationsView.vue` — reasons and lower-limb exercise
- `src/views/HistoryView.vue` — patient assessment history

The original `src/data/exercises.ts` file is retained as a backup/reference only; application views, stored-assessment hydration, and recommendation evaluation load the active catalogue from Supabase.

The four questions are self-reported information, not a validated instrument. The application does not establish diagnosis or clinical safety, and software tests do not establish clinical effectiveness or accuracy.
