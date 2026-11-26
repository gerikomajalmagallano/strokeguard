# Assessment Answer Coverage Report

**Status:** all 16 answer values have explicit IF–THEN rule outcomes. Rule matches are filtered by the complete-profile eligibility requirements and exercise-specific compatibility conditions below. A match does not establish personal suitability, professional clearance, clinical safety, diagnosis, or efficacy.

The four questions and their answer values remain defined in `src/types/index.ts` and validated by `docs/migrations/20261030_activity_based_assessment.sql`. Four questions with four answers each produce 256 complete response profiles.

## Per-answer rule and compatibility coverage

The rule IDs below are stable identifiers for the four outcomes in each assessment category. The exercise IDs below are candidates mapped by each rule; final matches are subject to all catalogue eligibility requirements and compatibility conditions. Local catalogue exercise #7 is runtime database ID 21 because the migration preserves an unrelated legacy row at ID 7.

| Question | Answer value | Rule ID | IF–THEN rule outcome / candidate exercise IDs and names | Compatibility conditions and exclusions |
|---|---|---|---|
| Leg movement | `leg_independent` | `LEG-01` | Map **1 Seated Ankle Pumps** and **2 Ankle Alphabet**. | Both require `leg_independent`; both match this answer. |
| Leg movement | `leg_assistance` | `LEG-02` | Map **17 Lower-Limb Mirror Therapy**. | ID 17 allows all four leg-movement responses; it matches. |
| Leg movement | `leg_limited` | `LEG-03` | Map **17 Lower-Limb Mirror Therapy**. | ID 17 allows all four leg-movement responses; it matches. |
| Leg movement | `leg_unable` | `LEG-04` | Map **17 Lower-Limb Mirror Therapy**. | ID 17 allows all four leg-movement responses; it matches. |
| Standing | `standing_independent` | `STAND-01` | Map **4 Supported Heel Raises**, **6 Supported Mini Squats**, and **11 Supported Weight Shifting**. | IDs 4 and 6 require independent or supported standing; ID 11 allows all four standing responses. |
| Standing | `standing_support` | `STAND-02` | Map **4 Supported Heel Raises**, **6 Supported Mini Squats**, and **11 Supported Weight Shifting**. | IDs 4 and 6 document stable support; ID 11 allows all four standing responses. |
| Standing | `standing_assistance` | `STAND-03` | Map **11 Supported Weight Shifting** and **20 Circuit Class Therapy for Mobility After Stroke**. | Both allow this standing answer. |
| Standing | `standing_unable` | `STAND-04` | Map **18 Aquatic Exercise for Balance and Mobility** and **20 Circuit Class Therapy for Mobility After Stroke**. | ID 18 is excluded when `walking_unable` is also reported because neither its documented standing nor walking starting mode is available. ID 20 remains mapped. |
| Walking | `walking_independent` | `WALK-01` | Map **8 Dual-Task Walking Exercise**, **9 Supported Over-Ground Walking**, **12 Side-Stepping Practice**, and **19 Obstacle Negotiation Practice**. | IDs 8, 12, and 19 require `standing_independent` or `standing_support`; ID 9 is excluded for `standing_assistance` or `standing_unable` because assistance to reach its standing start is not documented. ID 12's safe space/support requirements remain visible and are not confirmed by the answers. |
| Walking | `walking_aid` | `WALK-02` | Map **8 Dual-Task Walking Exercise**, **9 Supported Over-Ground Walking**, **12 Side-Stepping Practice**, and **19 Obstacle Negotiation Practice**. | Same standing requirements as for `walking_independent`. ID 8 retains its existing walking-aid eligibility. ID 12 does not establish equipment availability, supervision, or clinical clearance. |
| Walking | `walking_assistance` | `WALK-03` | Map **20 Circuit Class Therapy for Mobility After Stroke**. | ID 8 and ID 12 are not mapped for this answer; their eligibility requirements do not allow it. ID 20 remains available under the existing rule. |
| Walking | `walking_unable` | `WALK-04` | Map **10 Seated Leg Cycling**, **18 Aquatic Exercise for Balance and Mobility**, and **20 Circuit Class Therapy for Mobility After Stroke**. | ID 10 requires `leg_independent`. ID 18 is excluded if `standing_unable` is also reported. ID 20 remains mapped. |
| Sit-to-stand | `sit_to_stand_independent` | `STS-01` | Map **5 Sit-to-Stand from Chair** and **20 Circuit Class Therapy for Mobility After Stroke**. | ID 5 requires this sit-to-stand answer and is excluded if `standing_unable` conflicts with its standing end position. |
| Sit-to-stand | `sit_to_stand_supported` | `STS-02` | Map **5 Sit-to-Stand from Chair** and **20 Circuit Class Therapy for Mobility After Stroke**. | ID 5 requires this sit-to-stand answer and is excluded if `standing_unable` conflicts with its standing end position. |
| Sit-to-stand | `sit_to_stand_assistance` | `STS-03` | Map **20 Circuit Class Therapy for Mobility After Stroke**. | ID 5 is not mapped for this answer; ID 20 allows it. |
| Sit-to-stand | `sit_to_stand_unable` | `STS-04` | Map **20 Circuit Class Therapy for Mobility After Stroke**. | ID 5 is not mapped for this answer; ID 20 allows it. |

## Catalogue mapping audit

| Catalogue exercise | Assessment category | Rule IDs | Mapping status |
|---|---|---|---|
| 1 Seated Ankle Pumps | Leg movement | `LEG-01` | Mapped |
| 2 Ankle Alphabet | Leg movement | `LEG-01` | Mapped |
| 3 Resisted Dorsiflexion | Leg movement | — | Unmapped: ankle-specific movement, resistance equipment, and professional clearance are not established. The current engine already excludes it for missing clearance evidence. |
| 4 Supported Heel Raises | Standing | `STAND-01`, `STAND-02` | Mapped |
| 5 Sit-to-Stand from Chair | Sit-to-stand | `STS-01`, `STS-02` | Mapped |
| 6 Supported Mini Squats | Standing | `STAND-01`, `STAND-02` | Mapped |
| 7 Aerobic Exercise Training (runtime ID 21) | Walking | — | Unmapped: cardiovascular suitability/tolerance, clearance, supervision, and mode/equipment are not established. |
| 8 Dual-Task Walking Exercise | Walking | `WALK-01`, `WALK-02` | Mapped |
| 9 Supported Over-Ground Walking | Walking | `WALK-01`, `WALK-02` | Mapped |
| 10 Seated Leg Cycling | Walking | `WALK-04` | Mapped; retains its existing `leg_independent` requirement. |
| 11 Supported Weight Shifting | Standing | `STAND-01`, `STAND-02`, `STAND-03` | Mapped |
| 12 Side-Stepping Practice | Walking | `WALK-01`, `WALK-02` | Mapped only for independent/aid walking and independent/supported standing. |
| 13 Stair Practice | Walking | — | Unmapped: stair-specific ability, safe stairs/handrail, and close supervision are not established. |
| 14 Treadmill Walking Training | Walking | — | Unmapped: treadmill/harness availability, treadmill-specific safety, and trained supervision/setup are not established. |
| 15 Progressive Resistance Exercise with Weights | Leg movement | — | Unmapped: clearance, prescribed resistance/progression, suitable equipment, and professional supervision are not established. |
| 16 Stationary Cycle Resistance Exercise | Leg movement | — | Unmapped: cycling posture/suitability, cycle availability, clearance, and professional setup/supervision are not established. |
| 17 Lower-Limb Mirror Therapy | Leg movement | `LEG-02`, `LEG-03`, `LEG-04` | Mapped |
| 18 Aquatic Exercise for Balance and Mobility | Standing; Walking | `STAND-04`, `WALK-04` | Mapped under existing rules; required aquatic setting and supervision are shown but not confirmed by assessment. |
| 19 Obstacle Negotiation Practice | Walking | `WALK-01`, `WALK-02` | Mapped |
| 20 Circuit Class Therapy for Mobility After Stroke | Standing; Walking; Sit-to-stand | `STAND-03`, `STAND-04`, `WALK-03`, `WALK-04`, `STS-01`–`STS-04` | Mapped under existing rules; required staff/setup are shown but not confirmed by assessment. |

The six unmapped records are retained for reference and historical/session integrity, but are not candidates in any IF–THEN rule until the missing prerequisites can be verified without inventing assessment responses. A rule match remains a functional match only, not confirmation of a safe environment, available equipment, supervision, clinical clearance, or personal suitability.

## Approved recommendation and compatibility behavior

- **Exercise 8:** mapped only for `walking_independent` and `walking_aid`. Its existing standing eligibility (`standing_independent` or `standing_support`) is unchanged. The `walking_assistance` rule continues to map Exercise 20.
- **Exercise 12:** mapped for `walking_independent` and `walking_aid` only when its existing standing eligibility (`standing_independent` or `standing_support`) also matches. Its safe-space/support requirements are not inferred from the assessment.
- **Exercise 10:** remains mapped for `walking_unable` and retains its `leg_independent` eligibility requirement. `review_required` is not a global exclusion. When it is not selected by the walking rule, the exclusion report says it was not selected; when its leg eligibility is unmet, the report identifies that eligibility conflict. A match does not confirm professional clearance.
- **Exercise 18:** existing rules and eligibility requirements are unchanged. It is excluded only when both `standing_unable` and `walking_unable` are reported, as its documented starting position is standing or walking.
- **Exercise 5, 9, and 19:** their existing standing exclusions and walking/standing eligibility requirements remain in place.

Recommendation IDs are deduplicated across the four rule outcomes. All four responses are read before final recommendations are returned.

## Exhaustive profile verification

The test suite enumerates all 256 profiles in the existing nested answer order, labels them `RE-001` through `RE-256`, calculates expected IDs from an independent test-side rule table plus the catalogue eligibility requirements and approved compatibility conditions, and compares those IDs to `evaluateAssessment()` results. It also checks duplicate removal and verifies that every returned ID exists in the catalogue. The current run passed all 256 profiles. No standalone expected-matrix file with pre-existing case IDs was present in the repository; the IDs are assigned deterministically in the test using that established enumeration order.

This is software consistency testing against the rule and catalogue specification. Passing the 256 profiles does not establish clinical accuracy, safety, suitability, professional clearance, or efficacy. The test catalogue is loaded from the reviewed Supabase migration fixture; it does not connect to a live Supabase project.

## Thesis manuscript sections to update

- **Chapter 3 — Methodology / System Design:** update the rule-based recommendation algorithm and IF–THEN rule table with stable rule IDs, the Side-Stepping Practice (`WALK-01`/`WALK-02`) conditions, catalogue eligibility filtering, and the six intentionally unmapped records. In the exercise-catalogue subsection, document runtime ID 21 for local exercise #7 and distinguish functional matching from clearance or equipment verification.
- **Chapter 3 — Testing and Validation:** describe the exhaustive 4 × 4 × 4 × 4 response-profile test, the independent expected-ID oracle, eligibility/exclusion checks, duplicate/invalid-ID checks, and catalogue reachability audit.
- **Chapter 4 — Results:** update the recommendation coverage/results table for all 20 catalogue entries, report that 14 are reachable and six are intentionally unmapped, and report the verified 256/256 software-consistency test result.
- **Chapter 4 — Discussion / Limitations:** explain that the four self-reported questions cannot verify medical clearance, cardiovascular suitability, task-specific stair/treadmill safety, equipment, safe environment, or professional supervision; therefore a match is not a prescription or safety clearance.

## Documentation limitations

Some catalogue records are marked `review_required`, and some lack exercise-specific documentation such as contraindications or stroke-phase applicability. This status is not automatically used as an exclusion. The rule engine reports matching and compatibility only; the user interface cautions that a rule match is not safety clearance. The day-grouping view organizes results and is not a prescribed rehabilitation schedule.
