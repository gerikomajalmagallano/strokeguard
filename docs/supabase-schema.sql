create extension if not exists pgcrypto;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  age integer not null check (age between 1 and 120),
  sex text not null check (sex in ('Female', 'Male', 'Prefer not to say')),
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id integer primary key,
  name text not null,
  category text not null,
  target_area text not null check (target_area in ('Upper Limb', 'Lower Limb', 'Balance', 'Mobility')),
  difficulty text not null check (difficulty in ('Easy', 'Moderate', 'Advanced')),
  duration text not null,
  repetitions text not null,
  instructions text[] not null,
  purpose text not null,
  safety_notes text not null
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  assessment_date timestamptz not null default now(),
  classification text not null check (classification in ('Normal', 'Mild', 'Moderate', 'Severe')),
  classification_reason text not null,
  facial_eye text not null check (facial_eye in ('Normal', 'Mild', 'Moderate', 'Severe')),
  facial_mouth text not null check (facial_mouth in ('Normal', 'Mild', 'Moderate', 'Severe')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.functional_assessments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments(id) on delete cascade,
  upper_limb text not null check (upper_limb in ('Normal', 'Mild', 'Moderate', 'Severe')),
  lower_limb text not null check (lower_limb in ('Normal', 'Mild', 'Moderate', 'Severe')),
  balance text not null check (balance in ('Normal', 'Mild', 'Moderate', 'Severe')),
  mobility text not null check (mobility in ('Independent', 'Needs assistance', 'Unable')),
  notes text not null default ''
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  exercise_id integer not null references public.exercises(id),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (assessment_id, exercise_id)
);

alter table public.patients enable row level security;
alter table public.exercises enable row level security;
alter table public.assessments enable row level security;
alter table public.functional_assessments enable row level security;
alter table public.recommendations enable row level security;

create policy "Patients can read their own patient row" on public.patients
  for select to authenticated using (user_id = auth.uid());
create policy "Patients can create their own patient row" on public.patients
  for insert to authenticated with check (user_id = auth.uid());
create policy "Patients can update their own patient row" on public.patients
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Authenticated users can read exercise catalogue" on public.exercises
  for select to authenticated using (true);

create policy "Patients can read their own assessments" on public.assessments
  for select to authenticated using (
    exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  );
create policy "Patients can create their own assessments" on public.assessments
  for insert to authenticated with check (
    exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  );

create policy "Patients can read their own functional assessments" on public.functional_assessments
  for select to authenticated using (
    exists (
      select 1 from public.assessments a
      join public.patients p on p.id = a.patient_id
      where a.id = assessment_id and p.user_id = auth.uid()
    )
  );
create policy "Patients can create their own functional assessments" on public.functional_assessments
  for insert to authenticated with check (
    exists (
      select 1 from public.assessments a
      join public.patients p on p.id = a.patient_id
      where a.id = assessment_id and p.user_id = auth.uid()
    )
  );

create policy "Patients can read their own recommendations" on public.recommendations
  for select to authenticated using (
    exists (
      select 1 from public.assessments a
      join public.patients p on p.id = a.patient_id
      where a.id = assessment_id and p.user_id = auth.uid()
    )
  );
create policy "Patients can create their own recommendations" on public.recommendations
  for insert to authenticated with check (
    exists (
      select 1 from public.assessments a
      join public.patients p on p.id = a.patient_id
      where a.id = assessment_id and p.user_id = auth.uid()
    )
  );

insert into public.exercises (id, name, category, target_area, difficulty, duration, repetitions, instructions, purpose, safety_notes) values
  (1, 'Seated Ankle Pumps', 'Range of Motion', 'Lower Limb', 'Easy', '2–3 minutes', '10–15 repetitions', array['Sit with both feet supported.', 'Point your toes away slowly.', 'Pull your toes back toward you.', 'Repeat with controlled movement.'], 'Encourages gentle ankle movement and circulation.', 'Move slowly and stay within a comfortable range. Stop if pain or unusual symptoms occur.'),
  (2, 'Ankle Alphabet', 'Range of Motion', 'Lower Limb', 'Easy', '2–4 minutes', '1 alphabet per side', array['Sit comfortably.', 'Lift one foot slightly.', 'Trace small letters in the air using your foot.', 'Repeat on the other side if appropriate.'], 'Promotes controlled ankle range of motion.', 'Keep the movement small and controlled. Use support if needed.'),
  (3, 'Resisted Dorsiflexion', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '8–10 repetitions', array['Sit with the leg supported.', 'Use appropriate light resistance if cleared.', 'Pull the foot upward slowly.', 'Return to the starting position with control.'], 'Targets muscles involved in lifting the foot.', 'Use only light resistance and follow professional guidance when resistance training is not yet appropriate.'),
  (4, 'Supported Heel Raises', 'Strength', 'Lower Limb', 'Easy', '3–5 minutes', '8–12 repetitions', array['Stand behind a stable support.', 'Hold the support with both hands.', 'Slowly raise your heels.', 'Lower your heels with control.'], 'Builds lower-leg strength used during standing and walking.', 'Keep a stable support nearby. Use supervision if balance is limited.'),
  (5, 'Sit-to-Stand from Chair', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '5–10 repetitions', array['Use a stable chair.', 'Place both feet firmly on the floor.', 'Lean forward slightly and stand.', 'Slowly sit back down with control.'], 'Practices a functional movement used in daily activities.', 'Use armrests or supervision when needed. Make sure the chair cannot slide.'),
  (6, 'Supported Mini Squats', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '8–12 repetitions', array['Stand while holding stable support.', 'Bend your hips and knees slightly.', 'Keep your heels down.', 'Return to standing slowly.'], 'Provides gentle lower-limb strengthening.', 'Use support throughout. Avoid deep bending if it causes pain or instability.'),
  (7, 'Static Standing Balance', 'Balance', 'Balance', 'Easy', '2–4 minutes', '20–30 seconds per bout', array['Stand near a stable support.', 'Keep your feet comfortable and your posture upright.', 'Hold the position for the planned time.', 'Rest before repeating.'], 'Practices controlled standing and postural stability.', 'Keep support available and have someone nearby when balance is limited.'),
  (8, 'Lateral Weight Shifts', 'Balance', 'Balance', 'Easy', '3–5 minutes', '10–20 shifts', array['Stand with stable support.', 'Shift your weight slowly toward one side.', 'Return to the center.', 'Repeat toward the other side.'], 'Practices controlled weight transfer needed for standing and stepping.', 'Use a stable support and stop if you feel unsafe or dizzy.'),
  (9, 'Supported Over-Ground Walking', 'Mobility', 'Mobility', 'Moderate', '5–10 minutes', 'Short, supervised bouts', array['Choose a clear and safe walking path.', 'Use the assistive device recommended by a professional if applicable.', 'Walk at a comfortable pace.', 'Rest as needed.'], 'Provides practice for walking tolerance and functional endurance.', 'Use supervision or an appropriate assistive device when needed. Avoid walking alone when fall risk is present.'),
  (10, 'Seated Leg Cycling', 'Mobility', 'Mobility', 'Advanced', '5–10 minutes', 'Short intervals', array['Use an appropriate seated cycle device.', 'Begin with low resistance.', 'Pedal at a comfortable pace.', 'Rest between intervals as needed.'], 'Provides low-impact lower-limb endurance practice.', 'Use only when appropriate for the person and cleared by a qualified professional, especially soon after stroke.'),
  (11, 'Seated Arm Raises', 'Range of Motion', 'Upper Limb', 'Easy', '2–3 minutes', '8 repetitions', array['Sit with your back supported.', 'Raise one arm only as far as comfortable.', 'Lower it slowly and repeat with the other arm.'], 'Practices comfortable shoulder movement while seated.', 'Keep the movement pain-free and ask a professional about any shoulder restrictions.'),
  (12, 'Supported Reach', 'Strength', 'Upper Limb', 'Moderate', '3–5 minutes', '6–8 reaches per side', array['Sit at a stable table with your forearm supported.', 'Reach toward a nearby object without leaning far.', 'Return to the starting position with control.'], 'Practices controlled reaching for everyday tasks.', 'Use a stable seat and keep objects within a comfortable reach.')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  target_area = excluded.target_area,
  difficulty = excluded.difficulty,
  duration = excluded.duration,
  repetitions = excluded.repetitions,
  instructions = excluded.instructions,
  purpose = excluded.purpose,
  safety_notes = excluded.safety_notes;
