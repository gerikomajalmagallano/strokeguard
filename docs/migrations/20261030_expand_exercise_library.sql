-- Review this additive migration against the live Supabase schema and take a backup
-- before applying it. It does not delete or overwrite existing exercise records.
begin;

alter table public.exercises
  add column if not exists description text,
  add column if not exists contraindications text;

alter table public.exercises
  alter column difficulty drop not null,
  alter column duration drop not null,
  alter column repetitions drop not null,
  alter column safety_notes drop not null;

do $$
begin
  if exists (
    select 1
    from public.exercises
    where (id = 11 and name <> 'Supported Weight Shifting')
       or (id = 12 and name <> 'Side-Stepping Practice')
       or (id = 13 and name <> 'Stair Practice')
       or (id = 14 and name <> 'Treadmill Walking Training')
  ) then
    raise exception 'Exercise IDs 11-14 are already used by different records. Reconcile IDs before applying this migration.';
  end if;

  if exists (
    select 1
    from public.exercises
    where (lower(name) = lower('Supported Weight Shifting') and id <> 11)
       or (lower(name) = lower('Side-Stepping Practice') and id <> 12)
       or (lower(name) = lower('Stair Practice') and id <> 13)
       or (lower(name) = lower('Treadmill Walking Training') and id <> 14)
  ) then
    raise exception 'An exercise with one of the new names already exists under a different ID. Reconcile it before applying this migration.';
  end if;
end
$$;

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
   'NICE NG236, recommendation 1.13.22: consider treadmill training, with or without body-weight support, for people after stroke able to walk with or without assistance. https://www.nice.org.uk/guidance/ng236/chapter/Recommendations')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
commit;
