# Online-only setup

StrokeGuard requires an internet connection and a configured Supabase project for sign-in, patient profiles, assessments, exercise history, and assessment history. It does not create local accounts, save assessments offline, cache patient records on the device, or synchronize pending records.

## Supabase setup

1. Create or open the Supabase project used by the app.
2. If this is an existing StrokeGuard database, inspect its live tables, constraints, foreign keys, and row-level security policies, take a backup, and apply [`migrations/20261030_activity_based_assessment.sql`](./migrations/20261030_activity_based_assessment.sql). The migration preserves records and legacy columns, and relaxes obsolete required-column constraints so new assessment writes need no fabricated values. It does not apply itself remotely.
3. If this is a new database, run [`supabase-schema.sql`](./supabase-schema.sql) to create the tables, policies, save function, and exercise catalogue.
4. Enable Email in Authentication → Providers. Complete email verification during signup, or disable email confirmation for a thesis demonstration.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` using the project's API settings. Restart the development server after changing environment variables.

Never put a Supabase service-role key, secret API key, or database password in a `VITE_*` variable or browser code. The browser uses only the publishable/anon key; row-level security remains the authorization boundary.

## Online data flow

- Sign-in and account creation use Supabase Auth.
- Patient profile changes, assessments, exercise sessions, and assessment history are read from and written to Supabase.
- Assessment rows and their four functional responses and optional notes are saved together by the `save_assessment` database function.
- The app requires an active internet connection for patient data operations. If a request fails, it displays the Supabase or connection error; it does not queue the operation for later.

## Verification

1. Run `npm run build`.
2. Sign in while online, complete onboarding, then save an assessment.
3. Confirm the assessment and functional assessment rows appear in Supabase for that patient. Rule-matched recommendations are recalculated from the saved responses when results are loaded; matching does not imply clinical safety clearance.
4. Refresh the app and confirm the assessment appears in dashboard/history.
5. Complete an exercise session and confirm it appears in Supabase and history.
