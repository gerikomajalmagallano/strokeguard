-- Restricts Circuit Class Therapy to assessment abilities documented by its catalogue entry.
-- This updates one exercise record and does not change the database schema.
begin;

do $$
begin
  update public.exercises
  set eligibility_requirements = '{"standing":["standing_independent","standing_support"],"walking":["walking_independent","walking_aid"],"sittingToStanding":["sit_to_stand_independent","sit_to_stand_supported"]}'::jsonb
  where id = 20
    and name = 'Circuit Class Therapy for Mobility After Stroke';

  if not found then
    raise exception 'Expected Exercise 20 (Circuit Class Therapy for Mobility After Stroke) was not found. No changes applied.';
  end if;
end
$$;

commit;
