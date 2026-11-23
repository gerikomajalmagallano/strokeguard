# Assessment Answer Coverage Report

**Status:** all 16 answer values have explicit IF–THEN rule outcomes. Rule matches are filtered by the complete-profile eligibility requirements and exercise-specific compatibility conditions below. A match does not establish personal suitability, professional clearance, clinical safety, diagnosis, or efficacy.

The four questions and their answer values remain defined in `src/types/index.ts` and validated by `docs/migrations/20261030_activity_based_assessment.sql`. Four questions with four answers each produce 256 complete response profiles.

## Per-answer rule and compatibility coverage

The exercise IDs below are the candidates mapped by each answer's rule. Final area matches are subject to the catalogue eligibility requirements and compatibility conditions. IDs are the application catalogue IDs, including the migrated catalogue's ID 21 for Aerobic Exercise Training.

| Question | Answer value | IF–THEN rule outcome / candidate exercise IDs and names | Compatibility conditions and exclusions |
|---|---|---|---|
| Leg movement | `leg_independent` | Map **1 Seated Ankle Pumps** and **2 Ankle Alphabet**. | Both require `leg_independent`; both match this answer. |
| Leg movement | `leg_assistance` | Map **17 Lower-Limb Mirror Therapy**. | ID 17 allows all four leg-movement responses; it matches. |
| Leg movement | `leg_limited` | Map **17 Lower-Limb Mirror Therapy**. | ID 17 allows all four leg-movement responses; it matches. |
| Leg movement | `leg_unable` | Map **17 Lower-Limb Mirror Therapy**. | ID 17 allows all four leg-movement responses; it matches. |
| Standing | `standing_independent` | Map **4 Supported Heel Raises**, **6 Supported Mini Squats**, and **11 Supported Weight Shifting**. | IDs 4 and 6 require independent or supported standing; ID 11 allows all four standing responses. |
| Standing | `standing_support` | Map **4 Supported Heel Raises**, **6 Supported Mini Squats**, and **11 Supported Weight Shifting**. | IDs 4 and 6 document stable support; ID 11 allows all four standing responses. |
| Standing | `standing_assistance` | Map **11 Supported Weight Shifting** and **20 Circuit Class Therapy for Mobility After Stroke**. | Both allow this standing answer. |
| Standing | `standing_unable` | Map **18 Aquatic Exercise for Balance and Mobility** and **20 Circuit Class Therapy for Mobility After Stroke**. | ID 18 is excluded when `walking_unable` is also reported because neither its documented standing nor walking starting mode is available. ID 20 remains mapped. |
| Walking | `walking_independent` | Map **8 Dual-Task Walking Exercise**, **9 Supported Over-Ground Walking**, and **19 Obstacle Negotiation Practice**. | IDs 8 and 19 require `standing_independent` or `standing_support`. ID 9 is excluded for `standing_assistance` or `standing_unable` because assistance to reach its standing start is not documented. |
| Walking | `walking_aid` | Map **8 Dual-Task Walking Exercise**, **9 Supported Over-Ground Walking**, and **19 Obstacle Negotiation Practice**. | Same standing requirements as for `walking_independent`. ID 8 retains its existing walking-aid eligibility. |
| Walking | `walking_assistance` | Map **20 Circuit Class Therapy for Mobility After Stroke**. | ID 8 is not mapped for this answer and its existing eligibility does not allow it. ID 20 remains available under the existing rule. |
| Walking | `walking_unable` | Map **10 Seated Leg Cycling**, **18 Aquatic Exercise for Balance and Mobility**, and **20 Circuit Class Therapy for Mobility After Stroke**. | ID 10 requires `leg_independent`. ID 18 is excluded if `standing_unable` is also reported. ID 20 remains mapped. |
| Sit-to-stand | `sit_to_stand_independent` | Map **5 Sit-to-Stand from Chair** and **20 Circuit Class Therapy for Mobility After Stroke**. | ID 5 requires this sit-to-stand answer and is excluded if `standing_unable` conflicts with its standing end position. |
| Sit-to-stand | `sit_to_stand_supported` | Map **5 Sit-to-Stand from Chair** and **20 Circuit Class Therapy for Mobility After Stroke**. | ID 5 requires this sit-to-stand answer and is excluded if `standing_unable` conflicts with its standing end position. |
| Sit-to-stand | `sit_to_stand_assistance` | Map **20 Circuit Class Therapy for Mobility After Stroke**. | ID 5 is not mapped for this answer; ID 20 allows it. |
| Sit-to-stand | `sit_to_stand_unable` | Map **20 Circuit Class Therapy for Mobility After Stroke**. | ID 5 is not mapped for this answer; ID 20 allows it. |

## Approved recommendation and compatibility behavior

- **Exercise 8:** mapped only for `walking_independent` and `walking_aid`. Its existing standing eligibility (`standing_independent` or `standing_support`) is unchanged. The `walking_assistance` rule continues to map Exercise 20.
- **Exercise 10:** remains mapped for `walking_unable` and retains its `leg_independent` eligibility requirement. `review_required` is not a global exclusion. When it is not selected by the walking rule, the exclusion report says it was not selected; when its leg eligibility is unmet, the report identifies that eligibility conflict. A match does not confirm professional clearance.
- **Exercise 18:** existing rules and eligibility requirements are unchanged. It is excluded only when both `standing_unable` and `walking_unable` are reported, as its documented starting position is standing or walking.
- **Exercise 5, 9, and 19:** their existing standing exclusions and walking/standing eligibility requirements remain in place.

Recommendation IDs are deduplicated across the four rule outcomes. All four responses are read before final recommendations are returned.

## Exhaustive profile verification

The test suite enumerates all 256 profiles in the existing nested answer order, labels them `RE-001` through `RE-256`, calculates expected IDs from an independent test-side rule table plus the catalogue eligibility requirements and approved compatibility conditions, and compares those IDs to `evaluateAssessment()` results. It also checks duplicate removal. No standalone expected-matrix file with pre-existing case IDs was present in the repository; the IDs are assigned deterministically in the test using that established enumeration order.

This is software consistency testing against the rule and catalogue specification. Passing the 256 profiles does not establish clinical accuracy, safety, suitability, professional clearance, or efficacy. The test catalogue is loaded from the reviewed Supabase migration fixture; it does not connect to a live Supabase project.

## Documentation limitations

Some catalogue records are marked `review_required`, and some lack exercise-specific documentation such as contraindications or stroke-phase applicability. This status is not automatically used as an exclusion. The rule engine reports matching and compatibility only; the user interface cautions that a rule match is not safety clearance. The day-grouping view organizes results and is not a prescribed rehabilitation schedule.
