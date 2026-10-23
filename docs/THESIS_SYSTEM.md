# StrokeGuard Thesis System

## Core purpose

StrokeGuard is a web-based research prototype for patient-owned functional assessment, deterministic classification, and transparent exercise decision support. It does not diagnose stroke or provide medical treatment.

## Patient flow

1. Login or create an account with email and password.
2. Save patient information: full name, age, and sex.
3. Start a lower-limb assessment.
4. Record separate answers for leg movement, standing, walking, and sitting to standing.
5. Review the answer-by-answer summary without a combined severity score.
6. Review matched lower-limb exercise recommendations and the answer(s) that triggered each.
7. Read exercise instructions, complete a simple session, and review assessment history.

## Rules engine

Rules normalize both `Normal` and `No reported difficulty` as no reported difficulty. For each other answer, the engine searches lower-limb exercise names, instructions, and stated benefits for activity-matching terms. Leg movement can match ankle pumps, ankle alphabet, dorsiflexion, and leg cycling; standing can match supported heel raises and mini squats; walking can match over-ground walking and heel raises whose stated benefit mentions walking; sitting to standing can match chair sit-to-stand. Duplicate exercises are merged and explain each triggering answer. The rules do not assign severity scores or use difficulty levels to infer a clinical progression. Missing answers prevent rule evaluation; unmatched findings are reported without inventing an exercise.

Recommendations are presented as one grouped list with the matching activity and answer shown for each exercise. The current exercise records contain no cited source or schedule/frequency guidance, so the interface does not assign exercises to days or represent repetition/duration catalogue fields as a personalized schedule. Add and review credible references with a qualified rehabilitation professional before considering a day-based schedule.

These proposed self-reported questions are not a clinically validated assessment instrument. The rules and sample exercise information are a research-prototype decision aid, not clinically validated treatment guidance.

## Authentication and storage

The app requires the Supabase URL and anon/publishable key and an internet connection. It uses Supabase Auth and PostgreSQL for patient profiles, assessments, exercise sessions, and recommendations. For an existing database, apply [`migrations/20261023_four_question_lower_limb_assessment.sql`](migrations/20261023_four_question_lower_limb_assessment.sql) in Supabase; it preserves historical data and keeps the existing ownership policies. For a new database, use [`supabase-schema.sql`](supabase-schema.sql). Each assessment belongs to a patient row linked to one Auth user. Assessment rows are inserted as new records and are not updated by the app. The app has no local-account or offline assessment mode.
