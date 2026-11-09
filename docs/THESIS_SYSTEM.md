# StrokeGuard Thesis System

## Project description

StrokeGuard is a web-based lower-limb functional assessment and rule-based exercise recommendation system. It records self-reported responses in four separate areas: leg movement, standing, walking, and sit-to-stand. Predefined IF-THEN rules evaluate those responses against an exercise catalogue. The system does not diagnose stroke, calculate severity, or replace professional rehabilitation advice.

The questions collect self-reported functional information. They are not a clinically validated assessment instrument and do not establish a diagnosis or determine clinical safety.

## Patient flow

1. Login or create an account with email and password.
2. Save patient information: full name, age, and sex.
3. Complete the four-question lower-limb functional assessment and optionally add notes.
4. Review the four recorded answers and the functional areas considered by the rules.
5. View exercises that match the predefined functional rules, if any.
6. Review previous assessment responses in history.

Patient information does not repeat the functional assessment. There is no facial assessment, machine-learning model, severity classification, or predictive stroke diagnosis.

## IF-THEN recommendation rules

The engine uses explicit answer identifiers and exercise IDs, not keyword searches or severity scores. Every value of all four stored answers has an explicit rule, including values that map to no exercises. Multiple catalogue entries can match a response. Functional-area categories alone do not generate recommendations: an exercise must be explicitly mapped by an IF-THEN rule and meet any documented functional prerequisites. Supported Heel Raises can match a walking response only when the standing response also supports its standing instructions. Walking and sit-to-stand rules also require a compatible standing response. Rule matching is not a clinical safety clearance.

Matching exercises are displayed directly; the recommendation flow does not filter them through a separate eligibility approval status. Available safety information and references are shown without interpreting missing details as approval or clinical clearance. The system does not infer safety from exercise names, categories, or assistance answers.

Historical records with old difficulty-rating values are retained. The app does not interpret those values as the new categories or show old saved recommendation links as results from the new rules.

## Exercise catalogue

The 20-entry catalogue spans leg movement, lower-limb strengthening, standing and balance, walking and gait, and sit-to-stand or functional mobility. Existing IDs are preserved. Four new entries are Obstacle Negotiation Practice, Aerobic Exercise Training, Dual-Task Walking Exercise, and Circuit Class Therapy for Mobility After Stroke. Their sources support the intervention category or research topic, not a complete individual protocol; missing instructions, starting positions, dosage, assistance, safety, contraindications, and phase applicability are shown as undocumented rather than inferred. The obstacle task is mapped only to independent walking with an independently supported standing response. Aerobic, dual-task, and circuit-class records are not mapped because the four answers do not establish their specific prerequisites or suitability.

The catalogue is not yet a 25–40-entry set of fully specified exercise protocols. The sources reviewed often recommend intervention categories without prescribing individual steps or dosage; adding more detailed exercises without exercise-specific sources would require inventing clinical instructions. Documentation status is calculated separately from rule matching, and the legacy `eligibilityStatus` field does not filter results. A match is not a safety clearance. Day 1–Day 4 labels organize only matched exercises by the first functional area that matched; they are not scheduled days. Empty areas are omitted, and the application does not create a calendar or prescribe repetitions, duration, or intensity.

## Authentication and storage

The app uses Supabase Auth and PostgreSQL for patient profiles, assessments, exercise sessions, and history. Assessment responses are stored in the `functional_assessments` table using `leg_movement`, `standing`, `walking`, and `sitting_to_standing`. Optional notes are stored in `additional_notes`. Each assessment remains linked to its patient row and existing row-level security policies.

For an existing Supabase database, review the live schema and exercise IDs, take a backup, and apply [`migrations/20261030_activity_based_assessment.sql`](migrations/20261030_activity_based_assessment.sql), [`migrations/20261030_expand_exercise_library.sql`](migrations/20261030_expand_exercise_library.sql), then [`migrations/20261031_expand_evidence_based_exercises.sql`](migrations/20261031_expand_evidence_based_exercises.sql). The exercise-library migrations add metadata columns and insert new IDs only when they are not in conflict; they do not overwrite existing catalogue records. They are not applied remotely by the app. The assessment migration leaves obsolete facial/classification columns in place to preserve historical data; the frontend no longer reads them.

For a new database, run [`supabase-schema.sql`](supabase-schema.sql). Do not apply these SQL files until their assumptions have been checked against the target database. The app does not apply schema changes remotely.

The app requires an internet connection and the Supabase URL and publishable/anon key. Never expose a service-role key or database password in browser code.
