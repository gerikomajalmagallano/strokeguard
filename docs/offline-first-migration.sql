-- Run this migration against the existing StrokeGuard Supabase project.
-- The function runs as the signed-in user; it does not bypass Row Level Security.

alter table public.patients enable row level security;
alter table public.assessments enable row level security;
alter table public.functional_assessments enable row level security;
alter table public.recommendations enable row level security;

drop policy if exists "Patients can read their own patient row" on public.patients;
create policy "Patients can read their own patient row" on public.patients
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Patients can create their own patient row" on public.patients;
create policy "Patients can create their own patient row" on public.patients
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Patients can update their own patient row" on public.patients;
create policy "Patients can update their own patient row" on public.patients
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

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

create or replace function public.save_assessment_offline(assessment jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  assessment_id uuid := (assessment ->> 'id')::uuid;
  patient_id uuid := (assessment ->> 'patientId')::uuid;
  assessment_input jsonb := assessment -> 'input';
  functional jsonb := assessment_input -> 'functional';
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to save an assessment.' using errcode = '42501';
  end if;

  -- Conflicts are ignored rather than overwritten. All inserts commit or roll back together.
  insert into public.assessments (
    id, patient_id, assessment_date, classification, classification_reason,
    facial_eye, facial_mouth, notes
  ) values (
    assessment_id,
    patient_id,
    (assessment ->> 'date')::timestamptz,
    assessment ->> 'severity',
    assessment ->> 'severityReason',
    assessment_input -> 'facial' ->> 'eyeAsymmetry',
    assessment_input -> 'facial' ->> 'mouthAsymmetry',
    coalesce(assessment_input ->> 'notes', '')
  ) on conflict (id) do nothing;

  insert into public.functional_assessments (
    assessment_id, upper_limb, lower_limb, balance, mobility, notes
  ) values (
    assessment_id,
    functional ->> 'upperLimb',
    functional ->> 'lowerLimb',
    functional ->> 'balance',
    functional ->> 'mobility',
    coalesce(assessment_input ->> 'notes', '')
  ) on conflict (assessment_id) do nothing;

  insert into public.recommendations (assessment_id, exercise_id, reason)
  select
    assessment_id,
    (recommendation -> 'exercise' ->> 'id')::integer,
    coalesce((
      select string_agg(reason, ' ')
      from jsonb_array_elements_text(recommendation -> 'reasons') as reasons(reason)
    ), '')
  from jsonb_array_elements(coalesce(assessment -> 'recommendations', '[]'::jsonb)) as recommendation
  on conflict (assessment_id, exercise_id) do nothing;
end;
$$;

revoke all on function public.save_assessment_offline(jsonb) from public, anon;
grant execute on function public.save_assessment_offline(jsonb) to authenticated;
