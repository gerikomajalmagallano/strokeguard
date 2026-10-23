begin;

do $$
declare
  v_column_name text;
begin
  foreach v_column_name in array array['classification', 'classification_reason', 'facial_eye', 'facial_mouth'] loop
    if exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'assessments'
        and c.column_name = v_column_name
    ) then
      execute format('alter table public.assessments alter column %I drop not null', v_column_name);
    end if;
  end loop;

  foreach v_column_name in array array['lower_limb', 'upper_limb', 'balance', 'mobility'] loop
    if exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'functional_assessments'
        and c.column_name = v_column_name
    ) then
      execute format('alter table public.functional_assessments alter column %I drop not null', v_column_name);
    end if;
  end loop;
end
$$;

alter table public.functional_assessments
  add column if not exists leg_movement text,
  add column if not exists standing text,
  add column if not exists walking text,
  add column if not exists sitting_to_standing text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'functional_assessments_leg_movement_answer_check') then
    alter table public.functional_assessments
      add constraint functional_assessments_leg_movement_answer_check
      check (leg_movement is null or leg_movement in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'functional_assessments_standing_answer_check') then
    alter table public.functional_assessments
      add constraint functional_assessments_standing_answer_check
      check (standing is null or standing in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'functional_assessments_walking_answer_check') then
    alter table public.functional_assessments
      add constraint functional_assessments_walking_answer_check
      check (walking is null or walking in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'functional_assessments_sitting_to_standing_answer_check') then
    alter table public.functional_assessments
      add constraint functional_assessments_sitting_to_standing_answer_check
      check (sitting_to_standing is null or sitting_to_standing in ('Normal', 'No reported difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty')) not valid;
  end if;
end
$$;

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
  v_notes text := coalesce(v_assessment_input ->> 'notes', '');
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

  insert into public.assessments (id, patient_id, assessment_date, notes)
  values (
    v_assessment_id,
    v_patient_id,
    (assessment ->> 'date')::timestamptz,
    v_notes
  ) on conflict (id) do nothing;

  insert into public.functional_assessments (
    assessment_id, leg_movement, standing, walking, sitting_to_standing, notes
  ) values (
    v_assessment_id,
    v_findings ->> 'legMovement',
    v_findings ->> 'standing',
    v_findings ->> 'walking',
    v_findings ->> 'sittingToStanding',
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
