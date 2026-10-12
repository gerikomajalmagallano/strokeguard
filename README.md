# StrokeGuard

StrokeGuard is a Vue 3 + TypeScript thesis prototype for functional assessment, transparent classification, and rules-based exercise guidance. It is not a stroke diagnosis or a replacement for professional medical advice.

## Patient flow

Login → Dashboard → New Assessment → Functional Assessment → Classification → Recommendations → Exercise Guide/Session → Assessment History

Facial observations can contribute to the overall system classification. Exercise categories are selected only from functional findings such as upper limb, lower limb, balance, and mobility.

## Run locally

Configure the Supabase project as described below before using the app. Login and patient records require an internet connection; the app does not support local-only accounts or offline assessment saves.

```bash
npm install
npm run dev
```

## Configure Supabase

The Supabase JavaScript package is already installed. To enable Supabase Authentication and PostgreSQL:

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`docs/supabase-schema.sql`](docs/supabase-schema.sql). It creates missing tables, reapplies row-level security policies, installs the atomic assessment-save function, and seeds the exercise catalogue. It can be rerun on an existing StrokeGuard database without deleting its records.
3. Enable Email in Authentication → Providers. For a thesis demonstration, either complete email verification during signup or disable email confirmation in the Supabase Auth settings.
4. Copy `.env.example` to `.env.local`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project's API settings.
5. Restart the Vite server. Never put a Supabase service-role key in this frontend project.

Signup/login use Supabase Auth. Patient information, assessments, exercise sessions, and recommendation links are stored in PostgreSQL. RLS policies limit access to the authenticated patient's own records.
For the complete online-only setup and verification steps, see [`docs/online-only.md`](docs/online-only.md).

## Build

```bash
npm run build
```

## Main implementation files

- `src/services/rulesEngine.ts` — deterministic classification and area-matched exercise rules
- `src/data/exercises.ts` — exercise catalogue and instructions
- `src/services/storage.ts` — online, patient-scoped Supabase data access
- `src/stores/auth.ts` — authentication and patient information
- `src/views/AssessmentView.vue` — step-by-step assessment
- `src/views/ResultsView.vue` — classification and functional findings
- `src/views/RecommendationsView.vue` — reasons and matching exercise categories
- `src/views/HistoryView.vue` — patient assessment history

Clinical thresholds, exercise safety parameters, and recommendation rules should be reviewed against the thesis literature and by a qualified rehabilitation professional before being presented as validated clinical guidance.
