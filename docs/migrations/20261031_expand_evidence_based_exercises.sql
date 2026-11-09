-- Review this additive migration against the live Supabase schema and exercise IDs
-- and take a backup before applying. It preserves all existing records.
begin;

do $$
begin
  if exists (
    select 1
    from public.exercises
    where (id = 15 and name <> 'Progressive Resistance Exercise with Weights')
       or (id = 16 and name <> 'Stationary Cycle Resistance Exercise')
       or (id = 17 and name <> 'Lower-Limb Mirror Therapy')
       or (id = 18 and name <> 'Aquatic Exercise for Balance and Mobility')
  ) then
    raise exception 'Exercise IDs 15-18 are already used by different records. Reconcile IDs before applying this migration.';
  end if;

  if exists (
    select 1
    from public.exercises
    where (lower(name) = lower('Progressive Resistance Exercise with Weights') and id <> 15)
       or (lower(name) = lower('Stationary Cycle Resistance Exercise') and id <> 16)
       or (lower(name) = lower('Lower-Limb Mirror Therapy') and id <> 17)
       or (lower(name) = lower('Aquatic Exercise for Balance and Mobility') and id <> 18)
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

notify pgrst, 'reload schema';
commit;
