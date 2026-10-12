# StrokeGuard

StrokeGuard is a Vue 3 + TypeScript thesis prototype for functional assessment, transparent classification, and rules-based exercise guidance. It is not a stroke diagnosis or a replacement for professional medical advice.

## Patient flow

Login → Dashboard → New Assessment → Functional Assessment → Classification → Recommendations → Exercise Guide/Session → Assessment History

Facial observations can contribute to the overall system classification. Exercise categories are selected only from functional findings such as upper limb, lower limb, balance, and mobility.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase credentials, the app uses browser-local prototype accounts and patient-scoped local storage. Data remains in that browser and is not suitable for production or shared deployment.

## Configure Supabase

The Supabase JavaScript package is already installed. To enable Supabase Authentication and PostgreSQL:

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`docs/supabase-schema.sql`](docs/supabase-schema.sql). It creates the patient, assessment, functional assessment, recommendation, and exercise tables, enables row-level security, and seeds the exercise catalogue.
3. Enable Email in Authentication → Providers. For a thesis demonstration, either complete email verification during signup or disable email confirmation in the Supabase Auth settings.
4. Copy `.env.example` to `.env.local`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project's API settings.
5. Restart the Vite server. Never put a Supabase service-role key in this frontend project.

When the two variables are present, signup/login use Supabase Auth, patient information is stored in `patients`, and assessments and recommendation links are stored in PostgreSQL. RLS policies limit reads and inserts to the authenticated patient's own records.

## Build

```bash
npm run build
```

## Main implementation files

- `src/services/rulesEngine.ts` — deterministic classification and area-matched exercise rules
- `src/data/exercises.ts` — exercise catalogue and instructions
- `src/services/storage.ts` — patient-scoped local and Supabase assessment storage
- `src/stores/auth.ts` — authentication and patient information
- `src/views/AssessmentView.vue` — step-by-step assessment
- `src/views/ResultsView.vue` — classification and functional findings
- `src/views/RecommendationsView.vue` — reasons and matching exercise categories
- `src/views/HistoryView.vue` — patient assessment history

Clinical thresholds, exercise safety parameters, and recommendation rules should be reviewed against the thesis literature and by a qualified rehabilitation professional before being presented as validated clinical guidance.
