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
  difficulty text check (difficulty in ('Easy', 'Moderate', 'Advanced')),
  duration text,
  repetitions text,
  instructions text[] not null,
  purpose text not null,
  safety_notes text,
  description text,
  contraindications text,
  functional_areas text[] not null default '{}',
  eligibility_status text not null default 'review_required',
  eligibility_requirements jsonb,
  equipment_or_support text,
  assistance_requirements text,
  literature_reference text
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
  leg_movement text,
  standing text,
  walking text,
  sitting_to_standing text,
  additional_notes text not null default ''
);

alter table public.functional_assessments
  add column if not exists additional_notes text not null default '';
alter table public.exercises
  add column if not exists functional_areas text[] not null default '{}',
  add column if not exists eligibility_status text not null default 'review_required',
  add column if not exists eligibility_requirements jsonb,
  add column if not exists equipment_or_support text,
  add column if not exists assistance_requirements text,
  add column if not exists description text,
  add column if not exists contraindications text,
  add column if not exists literature_reference text;

alter table public.exercises
  alter column difficulty drop not null,
  alter column duration drop not null,
  alter column repetitions drop not null,
  alter column safety_notes drop not null;

do $$
declare
  v_column_name text;
begin
  foreach v_column_name in array array['classification', 'classification_reason', 'facial_eye', 'facial_mouth'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'assessments'
        and column_name = v_column_name and is_nullable = 'NO'
    ) then
      execute format('alter table public.assessments alter column %I drop not null', v_column_name);
    end if;
  end loop;

  foreach v_column_name in array array['lower_limb', 'upper_limb', 'balance', 'mobility'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'functional_assessments'
        and column_name = v_column_name and is_nullable = 'NO'
    ) then
      execute format('alter table public.functional_assessments alter column %I drop not null', v_column_name);
    end if;
  end loop;
end
$$;

do $$
declare
  v_constraint record;
  v_column_name text;
begin
  foreach v_column_name in array array['leg_movement', 'standing', 'walking', 'sitting_to_standing'] loop
    for v_constraint in
      select c.conname, c.oid
      from pg_constraint c
      where c.conrelid = 'public.functional_assessments'::regclass
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ilike '%' || v_column_name || '%'
        and (
          pg_get_constraintdef(c.oid) ilike '%Normal%'
          or
          pg_get_constraintdef(c.oid) ilike '%Mild difficulty%'
          or pg_get_constraintdef(c.oid) ilike '%Moderate difficulty%'
          or pg_get_constraintdef(c.oid) ilike '%No reported difficulty%'
          or pg_get_constraintdef(c.oid) ilike '%Severe difficulty%'
        )
    loop
      execute format('alter table public.functional_assessments drop constraint %I', v_constraint.conname);
    end loop;
  end loop;

  if not exists (select 1 from pg_constraint where conrelid = 'public.functional_assessments'::regclass and conname = 'functional_assessments_leg_movement_answer_check') then
    alter table public.functional_assessments
      add constraint functional_assessments_leg_movement_answer_check
      check (leg_movement is null or leg_movement in ('leg_independent', 'leg_assistance', 'leg_limited', 'leg_unable')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.functional_assessments'::regclass and conname = 'functional_assessments_standing_answer_check') then
    alter table public.functional_assessments
      add constraint functional_assessments_standing_answer_check
      check (standing is null or standing in ('standing_independent', 'standing_support', 'standing_assistance', 'standing_unable')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.functional_assessments'::regclass and conname = 'functional_assessments_walking_answer_check') then
    alter table public.functional_assessments
      add constraint functional_assessments_walking_answer_check
      check (walking is null or walking in ('walking_independent', 'walking_aid', 'walking_assistance', 'walking_unable')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.functional_assessments'::regclass and conname = 'functional_assessments_sitting_to_standing_answer_check') then
    alter table public.functional_assessments
      add constraint functional_assessments_sitting_to_standing_answer_check
      check (sitting_to_standing is null or sitting_to_standing in ('sit_to_stand_independent', 'sit_to_stand_supported', 'sit_to_stand_assistance', 'sit_to_stand_unable')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.exercises'::regclass and conname = 'exercises_eligibility_status_check') then
    alter table public.exercises
      add constraint exercises_eligibility_status_check
      check (eligibility_status in ('review_required', 'eligible')) not valid;
  end if;
end
$$;

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

insert into public.exercises (
  id, name, category, target_area, difficulty, duration, repetitions, instructions, purpose, safety_notes,
  functional_areas, eligibility_status, eligibility_requirements, equipment_or_support, assistance_requirements, literature_reference
) values
  (1, 'Seated Ankle Pumps', 'Range of Motion', 'Lower Limb', 'Easy', '2–3 minutes', '10–15 repetitions', array['Sit with both feet supported.', 'Point your toes away slowly.', 'Pull your toes back toward you.', 'Repeat with controlled movement.'], 'Encourages gentle ankle movement and circulation.', 'Move slowly and stay within a comfortable range. Stop if pain or unusual symptoms occur.', array['Leg movement'], 'review_required', null, 'Both feet supported during sitting.', null, null),
  (2, 'Ankle Alphabet', 'Range of Motion', 'Lower Limb', 'Easy', '2–4 minutes', '1 alphabet per side', array['Sit comfortably.', 'Lift one foot slightly.', 'Trace small letters in the air using your foot.', 'Repeat on the other side if appropriate.'], 'Promotes controlled ankle range of motion.', 'Keep the movement small and controlled. Use support if needed.', array['Leg movement'], 'review_required', null, null, null, null),
  (3, 'Resisted Dorsiflexion', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '8–10 repetitions', array['Sit with the leg supported.', 'Use appropriate light resistance if cleared.', 'Pull the foot upward slowly.', 'Return to the starting position with control.'], 'Targets muscles involved in lifting the foot.', 'Use only light resistance and follow professional guidance when resistance training is not yet appropriate.', array['Leg movement'], 'review_required', null, 'Light resistance if cleared.', null, null),
  (4, 'Supported Heel Raises', 'Strength', 'Lower Limb', 'Easy', '3–5 minutes', '8–12 repetitions', array['Stand behind a stable support.', 'Hold the support with both hands.', 'Slowly raise your heels.', 'Lower your heels with control.'], 'Builds lower-leg strength used during standing and walking.', 'Keep a stable support nearby. Use supervision if balance is limited.', array['Standing and balance', 'Walking and gait'], 'review_required', null, 'Stable support.', 'Use supervision if balance is limited.', null),
  (5, 'Sit-to-Stand from Chair', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '5–10 repetitions', array['Use a stable chair.', 'Place both feet firmly on the floor.', 'Lean forward slightly and stand.', 'Slowly sit back down with control.'], 'Practices a functional movement used in daily activities.', 'Use armrests or supervision when needed. Make sure the chair cannot slide.', array['Sit-to-stand and functional strengthening'], 'review_required', null, 'Stable chair.', 'Use armrests or supervision when needed.', null),
  (6, 'Supported Mini Squats', 'Strength', 'Lower Limb', 'Moderate', '3–5 minutes', '8–12 repetitions', array['Stand while holding stable support.', 'Bend your hips and knees slightly.', 'Keep your heels down.', 'Return to standing slowly.'], 'Provides gentle lower-limb strengthening.', 'Use support throughout. Avoid deep bending if it causes pain or instability.', array['Standing and balance'], 'review_required', null, 'Stable support.', null, null),
  (9, 'Supported Over-Ground Walking', 'Mobility', 'Lower Limb', 'Moderate', '5–10 minutes', 'Short, supervised bouts', array['Choose a clear and safe walking path.', 'Use the assistive device recommended by a professional if applicable.', 'Walk at a comfortable pace.', 'Rest as needed.'], 'Provides practice for walking tolerance and functional endurance.', 'Use supervision or an appropriate assistive device when needed. Avoid walking alone when fall risk is present.', array['Walking and gait'], 'review_required', null, 'Professionally recommended walking aid, if applicable.', 'Use supervision when needed.', null),
  (10, 'Seated Leg Cycling', 'Mobility', 'Lower Limb', 'Advanced', '5–10 minutes', 'Short intervals', array['Use an appropriate seated cycle device.', 'Begin with low resistance.', 'Pedal at a comfortable pace.', 'Rest between intervals as needed.'], 'Provides low-impact lower-limb endurance practice.', 'Use only when appropriate for the person and cleared by a qualified professional, especially soon after stroke.', array['Leg movement'], 'review_required', null, 'Appropriate seated cycle device.', null, null)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  target_area = excluded.target_area,
  difficulty = excluded.difficulty,
  duration = excluded.duration,
  repetitions = excluded.repetitions,
  instructions = excluded.instructions,
  purpose = excluded.purpose,
  safety_notes = excluded.safety_notes,
  functional_areas = excluded.functional_areas,
  eligibility_status = case
    when exercises.eligibility_status = 'eligible' then exercises.eligibility_status
    else excluded.eligibility_status
  end,
  eligibility_requirements = coalesce(exercises.eligibility_requirements, excluded.eligibility_requirements),
  equipment_or_support = coalesce(exercises.equipment_or_support, excluded.equipment_or_support),
  assistance_requirements = coalesce(exercises.assistance_requirements, excluded.assistance_requirements),
  literature_reference = coalesce(exercises.literature_reference, excluded.literature_reference);

insert into public.exercises (
  id, name, category, target_area, difficulty, duration, repetitions, instructions, purpose, safety_notes,
  description, functional_areas, eligibility_status, eligibility_requirements,
  equipment_or_support, assistance_requirements, contraindications, literature_reference
) values
  (11, 'Supported Weight Shifting', 'Balance', 'Lower Limb', null, null, null, array[]::text[],
   'Standing balance practice; individual goals and suitability require professional assessment.', null,
   'Standing balance practice involving weight shifts. The cited guideline supports physiotherapy for movement or balance difficulties but does not provide a protocol for this specific drill.',
   array['Standing and balance'], 'review_required', null, null, null, null,
   'NICE NG236, recommendation 1.13.1: physiotherapy for movement or balance difficulties after stroke. https://www.nice.org.uk/guidance/ng236/chapter/Recommendations'),
  (12, 'Side-Stepping Practice', 'Mobility', 'Lower Limb', null, null, null, array[]::text[],
   'Walking and stepping practice; individual goals and suitability require professional assessment.', null,
   'Task-specific lower-limb stepping practice. NICE recommends repetitive task training for lower-limb weakness but does not specify a lateral-stepping protocol.',
   array['Walking and gait'], 'review_required', null, null, null, null,
   'NICE NG236, recommendation 1.13.20: repetitive task training for lower-limb weakness, including walking. https://www.nice.org.uk/guidance/ng236/chapter/Recommendations'),
  (13, 'Stair Practice', 'Mobility', 'Lower Limb', null, null, null, array[]::text[],
   'Stair mobility practice; individual goals and suitability require professional assessment.', null,
   'Task-specific practice involving stairs. NICE includes using stairs among examples of repetitive task training for lower-limb weakness.',
   array['Walking and gait'], 'review_required', null, null, null, null,
   'NICE NG236, recommendation 1.13.20: repetitive task training for lower-limb weakness, including using stairs. https://www.nice.org.uk/guidance/ng236/chapter/Recommendations'),
  (14, 'Treadmill Walking Training', 'Mobility', 'Lower Limb', null, null, null, array[]::text[],
   'Walking practice; the guideline identifies treadmill training as an option, but does not establish individual suitability.', null,
   'Walking training using a treadmill, with or without body-weight support. NICE describes this as an option for people able to walk with or without assistance; individual selection remains a clinical decision.',
   array['Walking and gait'], 'review_required', null, null, null, null,
   'NICE NG236, recommendation 1.13.22: consider treadmill training, with or without body-weight support, for people after stroke able to walk with or without assistance. https://www.nice.org.uk/guidance/ng236/chapter/Recommendations'),
  (15, 'Progressive Resistance Exercise with Weights', 'Strength', 'Lower Limb', null, null, null, array[]::text[],
   'Strength-training modality for muscle weakness; exercise selection and progression require individual clinical assessment.', null,
   'Resistance exercise using weights is one example of strength training NICE says may be considered for people with muscle weakness after stroke. The specific exercise and progression are not defined by the guideline.',
   array['Leg movement'], 'review_required', null, 'Weights; type and load are not specified in the catalogue.', null, null,
   'NICE NG236, recommendation 1.13.4: consider strength training for people with muscle weakness after stroke; examples include weights and progressive resistance exercise. https://www.nice.org.uk/guidance/ng236/chapter/Recommendations'),
  (16, 'Stationary Cycle Resistance Exercise', 'Strength', 'Lower Limb', null, null, null, array[]::text[],
   'Strength-training modality using a stationary cycle; suitability and resistance require individual clinical assessment.', null,
   'NICE lists resistance exercise on machines such as stationary cycles as an example of strength training after stroke. This record denotes the resistance-training modality, not an individualized cycling prescription.',
   array['Leg movement'], 'review_required', null, 'Stationary cycle; setup and resistance are not specified in the catalogue.', null, null,
   'NICE NG236, recommendation 1.13.4: consider strength training for people with muscle weakness after stroke; an example is resistance exercise on machines such as stationary cycles. https://www.nice.org.uk/guidance/ng236/chapter/Recommendations'),
  (17, 'Lower-Limb Mirror Therapy', 'Range of Motion', 'Lower Limb', null, null, null, array[]::text[],
   'Adjunct rehabilitation approach for lower-limb muscle weakness; appropriateness requires individual clinical assessment.', null,
   'NICE says to consider mirror therapy as an adjunct to rehabilitation for people with muscle weakness in an upper or lower limb after stroke. The specific setup and protocol are not defined in this catalogue.',
   array['Leg movement'], 'review_required', null, 'Mirror-based therapy setup; detailed equipment requirements are not documented.', null, null,
   'NICE NG236, recommendations 1.13.30–1.13.31: consider mirror therapy for upper- or lower-limb muscle weakness after stroke; if provided, it should be supervised initially and, if necessary, for longer. https://www.nice.org.uk/guidance/ng236/chapter/Recommendations'),
  (18, 'Aquatic Exercise for Balance and Mobility', 'Mobility', 'Lower Limb', null, null, null, array[]::text[],
   'Aquatic exercise modality associated with balance and mobility outcomes; individual suitability and water-safety needs require clinical assessment.', null,
   'The Canadian Stroke Best Practice Recommendations describe aquatic exercise as effective for improving balance, walking speed, and mobility after stroke. The specific activity and participant suitability are not defined in this catalogue.',
   array['Standing and balance', 'Walking and gait'], 'review_required', null, 'Aquatic therapy setting; specific equipment and access requirements are not documented.', null, null,
   'Canadian Stroke Best Practice Recommendations, Rehabilitation, Recovery and Community Participation following Stroke, Part Two: Delivery of Stroke Rehabilitation to Optimize Functional Recovery (7th edition, 2025). https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery')
on conflict (id) do nothing;

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

  if coalesce(v_findings ->> 'legMovement', '') not in ('leg_independent', 'leg_assistance', 'leg_limited', 'leg_unable')
    or coalesce(v_findings ->> 'standing', '') not in ('standing_independent', 'standing_support', 'standing_assistance', 'standing_unable')
    or coalesce(v_findings ->> 'walking', '') not in ('walking_independent', 'walking_aid', 'walking_assistance', 'walking_unable')
    or coalesce(v_findings ->> 'sittingToStanding', '') not in ('sit_to_stand_independent', 'sit_to_stand_supported', 'sit_to_stand_assistance', 'sit_to_stand_unable') then
    raise exception 'All four lower-limb activity answers are required.' using errcode = '22023';
  end if;

  insert into public.assessments (
    id, patient_id, assessment_date, notes
  ) values (
    v_assessment_id,
    v_patient_id,
    (assessment ->> 'date')::timestamptz,
    coalesce(v_assessment_input ->> 'additionalNotes', '')
  ) on conflict (id) do nothing;

  insert into public.functional_assessments (
    assessment_id, leg_movement, standing, walking, sitting_to_standing, additional_notes
  ) values (
    v_assessment_id,
    v_findings ->> 'legMovement',
    v_findings ->> 'standing',
    v_findings ->> 'walking',
    v_findings ->> 'sittingToStanding',
    coalesce(v_assessment_input ->> 'additionalNotes', '')
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
