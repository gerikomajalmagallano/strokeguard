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
  target_area text not null check (target_area = 'Lower Limb'),
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
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.functional_assessments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments(id) on delete cascade,
  leg_movement text check (leg_movement in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')),
  standing text check (standing in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')),
  walking text check (walking in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')),
  sitting_to_standing text check (sitting_to_standing in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')),
  notes text not null default ''
);

alter table public.exercises drop constraint if exists exercises_target_area_check;
alter table public.exercises
  add constraint exercises_target_area_check check (target_area = 'Lower Limb') not valid;

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  exercise_id integer not null references public.exercises(id),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (assessment_id, exercise_id)
);

create table if not exists public.exercise_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  exercise_id integer not null references public.exercises(id),
  exercise_name text not null,
  completed_at timestamptz not null default now(),
  feedback text check (feedback is null or feedback in ('Comfortable', 'Slightly difficult', 'Difficult')),
  notes text
);

alter table public.patients enable row level security;
alter table public.exercises enable row level security;
alter table public.assessments enable row level security;
alter table public.functional_assessments enable row level security;
alter table public.recommendations enable row level security;
alter table public.exercise_sessions enable row level security;

drop policy if exists "Patients can read their own patient row" on public.patients;
create policy "Patients can read their own patient row" on public.patients
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Patients can create their own patient row" on public.patients;
create policy "Patients can create their own patient row" on public.patients
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Patients can update their own patient row" on public.patients;
create policy "Patients can update their own patient row" on public.patients
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Authenticated users can read exercise catalogue" on public.exercises;
create policy "Authenticated users can read exercise catalogue" on public.exercises
  for select to authenticated using (true);

drop policy if exists "Patients can read their own assessments" on public.assessments;
create policy "Patients can read their own assessments" on public.assessments
  for select to authenticated using (
    exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  );
drop policy if exists "Patients can create their own assessments" on public.assessments;
create policy "Patients can create their own assessments" on public.assessments
  for insert to authenticated with check (
    exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  );

drop policy if exists "Patients can read their own functional assessments" on public.functional_assessments;
create policy "Patients can read their own functional assessments" on public.functional_assessments
  for select to authenticated using (
    exists (
      select 1 from public.assessments a
      join public.patients p on p.id = a.patient_id
      where a.id = assessment_id and p.user_id = auth.uid()
    )
  );
drop policy if exists "Patients can create their own functional assessments" on public.functional_assessments;
create policy "Patients can create their own functional assessments" on public.functional_assessments
  for insert to authenticated with check (
    exists (
      select 1 from public.assessments a
      join public.patients p on p.id = a.patient_id
      where a.id = assessment_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Patients can read their own recommendations" on public.recommendations;
create policy "Patients can read their own recommendations" on public.recommendations
  for select to authenticated using (
    exists (
      select 1 from public.assessments a
      join public.patients p on p.id = a.patient_id
      where a.id = assessment_id and p.user_id = auth.uid()
    )
  );
drop policy if exists "Patients can create their own recommendations" on public.recommendations;
create policy "Patients can create their own recommendations" on public.recommendations
  for insert to authenticated with check (
    exists (
      select 1 from public.assessments a
      join public.patients p on p.id = a.patient_id
      where a.id = assessment_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Patients can read their own exercise sessions" on public.exercise_sessions;
create policy "Patients can read their own exercise sessions" on public.exercise_sessions
  for select to authenticated using (
    exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid())
  );
drop policy if exists "Patients can create their own exercise sessions" on public.exercise_sessions;
create policy "Patients can create their own exercise sessions" on public.exercise_sessions
  for insert to authenticated with check (
    exists (
      select 1 from public.patients p
      where p.id = exercise_sessions.patient_id and p.user_id = auth.uid()
    )
    and (
      exercise_sessions.assessment_id is null
      or exists (
        select 1 from public.assessments a
        where a.id = exercise_sessions.assessment_id
          and a.patient_id = exercise_sessions.patient_id
      )
    )
  );

delete from public.exercises exercise
where exercise.target_area <> 'Lower Limb'
  and not exists (
    select 1 from public.recommendations recommendation
    where recommendation.exercise_id = exercise.id
  )
  and not exists (
    select 1 from public.exercise_sessions session
    where session.exercise_id = exercise.id
  );

insert into public.exercises (id, name, category, target_area, difficulty, duration, repetitions, instructions, purpose, safety_notes) values
  (1, 'Seated Ankle Pumps', 'Range of Motion', 'Lower Limb', 'Easy', '2–3 minutes', '10–15 repetitions', array['Sit with both feet supported.', 'Point your toes away slowly.', 'Pull your toes back toward you.', 'Repeat with controlled movement.'], 'Encourages gentle ankle movement and circulation.', 'Move slowly and stay within a comfortable range. Stop if pain or unusual symptoms occur.'),
  (2, 'Ankle Alphabet', 'Range of Motion', 'Lower Limb', 'Easy', '2–4 minutes', '1 alphabet per side', array['Sit comfortably.', 'Lift one foot slightly.', 'Trace small letters in the air using your foot.', 'Repeat on the other side if appropriate.'], 'Promotes controlled ankle range of motion.', 'Keep the movement small and controlled. Use support if needed.'),
  (3, 'Resisted Dorsiflexion', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '8–10 repetitions', array['Sit with the leg supported.', 'Use appropriate light resistance if cleared.', 'Pull the foot upward slowly.', 'Return to the starting position with control.'], 'Targets muscles involved in lifting the foot.', 'Use only light resistance and follow professional guidance when resistance training is not yet appropriate.'),
  (4, 'Supported Heel Raises', 'Strength', 'Lower Limb', 'Easy', '3–5 minutes', '8–12 repetitions', array['Stand behind a stable support.', 'Hold the support with both hands.', 'Slowly raise your heels.', 'Lower your heels with control.'], 'Builds lower-leg strength used during standing and walking.', 'Keep a stable support nearby. Use supervision if balance is limited.'),
  (5, 'Sit-to-Stand from Chair', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '5–10 repetitions', array['Use a stable chair.', 'Place both feet firmly on the floor.', 'Lean forward slightly and stand.', 'Slowly sit back down with control.'], 'Practices a functional movement used in daily activities.', 'Use armrests or supervision when needed. Make sure the chair cannot slide.'),
  (6, 'Supported Mini Squats', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '8–12 repetitions', array['Stand while holding stable support.', 'Bend your hips and knees slightly.', 'Keep your heels down.', 'Return to standing slowly.'], 'Provides gentle lower-limb strengthening.', 'Use support throughout. Avoid deep bending if it causes pain or instability.'),
  (9, 'Supported Over-Ground Walking', 'Mobility', 'Lower Limb', 'Moderate', '5–10 minutes', 'Short, supervised bouts', array['Choose a clear and safe walking path.', 'Use the assistive device recommended by a professional if applicable.', 'Walk at a comfortable pace.', 'Rest as needed.'], 'Provides practice for walking tolerance and functional endurance.', 'Use supervision or an appropriate assistive device when needed. Avoid walking alone when fall risk is present.'),
  (10, 'Seated Leg Cycling', 'Mobility', 'Lower Limb', 'Advanced', '5–10 minutes', 'Short intervals', array['Use an appropriate seated cycle device.', 'Begin with low resistance.', 'Pedal at a comfortable pace.', 'Rest between intervals as needed.'], 'Provides low-impact lower-limb endurance practice.', 'Use only when appropriate for the person and cleared by a qualified professional, especially soon after stroke.')
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

create or replace function public.save_assessment(assessment jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_assessment_id uuid := (assessment ->> 'id')::uuid;
  v_patient_id uuid := (assessment ->> 'patientId')::uuid;
  v_assessment_input jsonb := assessment -> 'input';
  v_findings jsonb := v_assessment_input -> 'findings';
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to save an assessment.' using errcode = '42501';
  end if;

  if coalesce(v_findings ->> 'legMovement', '') not in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')
    or coalesce(v_findings ->> 'standing', '') not in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')
    or coalesce(v_findings ->> 'walking', '') not in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')
    or coalesce(v_findings ->> 'sittingToStanding', '') not in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty') then
    raise exception 'All four lower-limb assessment answers are required.' using errcode = '22023';
  end if;

  insert into public.assessments (
    id, patient_id, assessment_date, notes
  ) values (
    v_assessment_id,
    v_patient_id,
    (assessment ->> 'date')::timestamptz,
    coalesce(v_assessment_input ->> 'notes', '')
  ) on conflict (id) do nothing;

  insert into public.functional_assessments (
    assessment_id, leg_movement, standing, walking, sitting_to_standing, notes
  ) values (
    v_assessment_id,
    v_findings ->> 'legMovement',
    v_findings ->> 'standing',
    v_findings ->> 'walking',
    v_findings ->> 'sittingToStanding',
    coalesce(v_assessment_input ->> 'notes', '')
  ) on conflict (assessment_id) do nothing;

  insert into public.recommendations (assessment_id, exercise_id, reason)
  select
    v_assessment_id,
    (recommendation -> 'exercise' ->> 'id')::integer,
    coalesce((
      select string_agg(reason, ' ')
      from jsonb_array_elements_text(recommendation -> 'reasons') as reasons(reason)
    ), '')
  from jsonb_array_elements(coalesce(assessment -> 'recommendations', '[]'::jsonb)) as recommendation
  on conflict (assessment_id, exercise_id) do nothing;
end;
$$;

revoke all on function public.save_assessment(jsonb) from public, anon;
grant execute on function public.save_assessment(jsonb) to authenticated;

notify pgrst, 'reload schema';
