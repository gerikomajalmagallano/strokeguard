# Online-only setup

StrokeGuard requires an internet connection and a configured Supabase project for sign-in, patient profiles, assessments, exercise history, and assessment history. It does not create local accounts, save assessments offline, cache patient records on the device, or synchronize pending records.

## Supabase setup

1. Create or open the Supabase project used by the app.
2. In the Supabase SQL Editor, run [`supabase-schema.sql`](./supabase-schema.sql). The script creates any missing tables, reapplies the patient-scoped row-level security policies, installs the atomic assessment-save function, seeds the exercise catalogue, and refreshes the API schema cache. It can be run again for an existing StrokeGuard database without deleting records.
3. Enable Email in Authentication → Providers. Complete email verification during signup, or disable email confirmation for a thesis demonstration.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` using the project's API settings. Restart the development server after changing environment variables.

Never put a Supabase service-role key, secret API key, or database password in a `VITE_*` variable or browser code. The browser uses only the publishable/anon key; row-level security remains the authorization boundary.

## Online data flow

- Sign-in and account creation use Supabase Auth.
- Patient profile changes, assessments, exercise sessions, and assessment history are read from and written to Supabase.
- Assessment rows and their functional findings and recommendations are saved together by the `save_assessment` database function.
- The app requires an active internet connection for patient data operations. If a request fails, it displays the Supabase or connection error; it does not queue the operation for later.

## Verification

1. Run `npm run build`.
2. Sign in while online, complete onboarding, then save an assessment.
3. Confirm the assessment, functional assessment, and recommendation rows appear in Supabase for that patient.
4. Refresh the app and confirm the assessment appears in dashboard/history.
5. Complete an exercise session and confirm it appears in Supabase and history.
