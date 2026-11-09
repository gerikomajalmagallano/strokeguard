-- Review this migration against the live Supabase schema and take a backup
-- before applying it. It preserves existing rows and legacy columns.
begin;

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

alter table public.functional_assessments
  add column if not exists additional_notes text not null default '';

alter table public.exercises
  add column if not exists functional_areas text[] not null default '{}',
  add column if not exists eligibility_status text not null default 'review_required',
  add column if not exists eligibility_requirements jsonb,
  add column if not exists equipment_or_support text,
  add column if not exists assistance_requirements text,
  add column if not exists literature_reference text;

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
          or pg_get_constraintdef(c.oid) ilike '%Mild difficulty%'
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

update public.exercises
set functional_areas = case
      when cardinality(functional_areas) > 0 then functional_areas
      else case id
        when 1 then array['Leg movement']
        when 2 then array['Leg movement']
        when 3 then array['Leg movement']
        when 4 then array['Standing and balance', 'Walking and gait']
        when 5 then array['Sit-to-stand and functional strengthening']
        when 6 then array['Standing and balance']
        when 9 then array['Walking and gait']
        when 10 then array['Leg movement']
        else functional_areas
      end
    end,
    equipment_or_support = coalesce(equipment_or_support, case id
      when 1 then 'Both feet supported during sitting.'
      when 3 then 'Light resistance if cleared.'
      when 4 then 'Stable support.'
      when 5 then 'Stable chair.'
      when 6 then 'Stable support.'
      when 9 then 'Professionally recommended walking aid, if applicable.'
      when 10 then 'Appropriate seated cycle device.'
      else null
    end),
    assistance_requirements = coalesce(assistance_requirements, case id
      when 4 then 'Use supervision if balance is limited.'
      when 5 then 'Use armrests or supervision when needed.'
      when 9 then 'Use supervision when needed.'
      else null
    end)
where (id = 1 and name = 'Seated Ankle Pumps')
   or (id = 2 and name = 'Ankle Alphabet')
   or (id = 3 and name = 'Resisted Dorsiflexion')
   or (id = 4 and name = 'Supported Heel Raises')
   or (id = 5 and name = 'Sit-to-Stand from Chair')
   or (id = 6 and name = 'Supported Mini Squats')
   or (id = 9 and name = 'Supported Over-Ground Walking')
   or (id = 10 and name = 'Seated Leg Cycling');

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
  v_notes text := coalesce(v_assessment_input ->> 'additionalNotes', '');
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

  insert into public.assessments (id, patient_id, assessment_date, notes)
  values (
    v_assessment_id,
    v_patient_id,
    (assessment ->> 'date')::timestamptz,
    v_notes
  ) on conflict (id) do nothing;

  insert into public.functional_assessments (
    assessment_id, leg_movement, standing, walking, sitting_to_standing, notes, additional_notes
  ) values (
    v_assessment_id,
    v_findings ->> 'legMovement',
    v_findings ->> 'standing',
    v_findings ->> 'walking',
    v_findings ->> 'sittingToStanding',
    v_notes,
    v_notes
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

commit;
