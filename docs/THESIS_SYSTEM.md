# StrokeGuard Thesis System

## Core purpose

StrokeGuard is a web-based research prototype for patient-owned functional assessment, deterministic classification, and transparent exercise decision support. It does not diagnose stroke or provide medical treatment.

## Patient flow

1. Login or create an account with email and password.
2. Save patient information: full name, age, and sex.
3. Start a new assessment.
4. Record structured facial observations and functional findings.
5. Review the overall system classification.
6. Review exercise recommendations and the functional findings that triggered them.
7. Read exercise instructions, complete a simple session, and review assessment history.

## Rules engine

Eye and mouth observations contribute to the highest-severity overall classification, but never select exercise categories. Exercise rules read upper limb, lower limb, balance, and mobility findings independently, match a non-normal area to the same exercise target area, and prefer an exercise difficulty suitable for the finding. Each generated recommendation states its reason.

The rules and sample exercise information are a prototype decision aid, not clinically validated treatment guidance. Thresholds and safety information require thesis literature review and qualified professional review.

## Authentication and storage

The app requires the Supabase URL and anon/publishable key and an internet connection. It uses Supabase Auth and PostgreSQL for patient profiles, assessments, exercise sessions, and recommendations. Apply [`supabase-schema.sql`](supabase-schema.sql) to create or update the tables, atomic assessment-save function, sample exercises, and row-level security policies. Each assessment belongs to a patient row linked to one Auth user. Assessment rows are inserted as new records and are not updated by the app. The app has no local-account or offline assessment mode.
