import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  server: { middlewareMode: true }
})

after(async () => {
  await vite.close()
})

const [
  { evaluateAssessment },
  { groupRecommendationsByDay },
  { getExerciseDocumentationGaps },
  { assessmentQuestions }
] = await Promise.all([
  vite.ssrLoadModule('/src/services/rulesEngine.ts'),
  vite.ssrLoadModule('/src/services/recommendationGroups.ts'),
  vite.ssrLoadModule('/src/services/exerciseDocumentation.ts'),
  vite.ssrLoadModule('/src/types/index.ts')
])

const exerciseMigration = await readFile(
  new URL('../docs/migrations/20261113_migrate_exercises_to_supabase.sql', import.meta.url),
  'utf8'
)
const exercisePayload = exerciseMigration.match(/source_rows jsonb := \$exercise_data\$([\s\S]*?)\$exercise_data\$::jsonb/)
assert.ok(exercisePayload, 'the exercise migration must contain its reviewed source catalogue')
const exercises = JSON.parse(exercisePayload[1]).map(row => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category,
  functionalAreas: row.functional_areas,
  targetArea: row.target_area,
  startingPosition: row.starting_position,
  difficulty: row.difficulty,
  duration: row.duration,
  repetitions: row.repetitions,
  instructions: row.instructions,
  functionalGoal: row.purpose,
  safety: row.safety_notes,
  equipmentOrSupport: row.equipment_or_support,
  assistanceRequirements: row.assistance_requirements,
  contraindications: row.contraindications,
  eligibilityStatus: row.eligibility_status,
  eligibilityRequirements: row.eligibility_requirements,
  literatureReference: row.literature_reference,
  sourceUrl: row.source_url,
  strokePhaseApplicability: row.stroke_phase_applicability
}))

test('the Supabase migration catalogue contains 20 unique local exercise records', () => {
  assert.equal(exercises.length, 20)
  assert.equal(new Set(exercises.map(exercise => exercise.id)).size, 20)
  assert.equal(exercises.find(exercise => exercise.name === 'Aerobic Exercise Training')?.id, 21)
  assert.ok(exercises.every(exercise =>
    exercise.name &&
    exercise.category &&
    exercise.targetArea &&
    Array.isArray(exercise.instructions) &&
    exercise.functionalGoal
  ))
})

const answerValues = {
  legMovement: ['leg_independent', 'leg_assistance', 'leg_limited', 'leg_unable'],
  standing: ['standing_independent', 'standing_support', 'standing_assistance', 'standing_unable'],
  walking: ['walking_independent', 'walking_aid', 'walking_assistance', 'walking_unable'],
  sittingToStanding: ['sit_to_stand_independent', 'sit_to_stand_supported', 'sit_to_stand_assistance', 'sit_to_stand_unable']
}

const defaultFindings = {
  legMovement: 'leg_independent',
  standing: 'standing_independent',
  walking: 'walking_independent',
  sittingToStanding: 'sit_to_stand_independent'
}

const recommendationMatrix = JSON.parse(await readFile(
  new URL('./fixtures/recommendation-matrix.json', import.meta.url),
  'utf8'
))

const ruleExerciseIds = {
  legMovement: {
    leg_independent: [1, 2],
    leg_assistance: [17],
    leg_limited: [17],
    leg_unable: [17]
  },
  standing: {
    standing_independent: [4, 6, 11],
    standing_support: [4, 6, 11],
    standing_assistance: [11, 20],
    standing_unable: [18, 20]
  },
  walking: {
    walking_independent: [8, 9, 19],
    walking_aid: [8, 9, 19],
    walking_assistance: [20],
    walking_unable: [10, 18, 20]
  },
  sittingToStanding: {
    sit_to_stand_independent: [5, 20],
    sit_to_stand_supported: [5, 20],
    sit_to_stand_assistance: [20],
    sit_to_stand_unable: [20]
  }
}

const functionalAreaByActivity = {
  legMovement: 'Leg movement',
  standing: 'Standing and balance',
  walking: 'Walking and gait',
  sittingToStanding: 'Sit-to-stand and functional strengthening'
}

function expectedExerciseIds(findings) {
  const expectedIds = new Set()

  for (const [activity, ruleByAnswer] of Object.entries(ruleExerciseIds)) {
    for (const id of ruleByAnswer[findings[activity]]) {
      const exercise = exercises.find(item => item.id === id)
      assert.ok(exercise, `rule references missing exercise ${id}`)
      assert.ok(exercise.functionalAreas.includes(functionalAreaByActivity[activity]))

      const eligibilityConflict = Object.entries(exercise.eligibilityRequirements ?? {})
        .some(([question, allowedAnswers]) => !allowedAnswers.includes(findings[question]))
      if (eligibilityConflict) continue

      if (activity === 'walking' && id === 9 && ['standing_assistance', 'standing_unable'].includes(findings.standing)) continue
      if (activity === 'sittingToStanding' && id === 5 && findings.standing === 'standing_unable') continue
      if (id === 18 && findings.standing === 'standing_unable' && findings.walking === 'walking_unable') continue

      expectedIds.add(id)
    }
  }

  return [...expectedIds].sort((a, b) => a - b)
}

function evaluateFindings(findings) {
  return evaluateAssessment({ findings }, exercises)
}

function evaluateWith(activity, answer, overrides = {}) {
  return evaluateFindings({ ...defaultFindings, [activity]: answer, ...overrides })
}

test('assessment wording and answer values remain exact', () => {
  assert.deepEqual(assessmentQuestions.map(question => question.question), [
    'Can you move your affected leg while sitting or lying down?',
    'Can you stand up and maintain a standing position?',
    'How do you currently move when walking?',
    'Can you get up from a chair into a standing position?'
  ])

  assert.deepEqual(
    Object.fromEntries(assessmentQuestions.map(question => [
      question.key,
      question.options.map(option => option.value)
    ])),
    answerValues
  )
})

test('database validation accepts the same 16 answer values as the application', async () => {
  const migration = await readFile(
    new URL('../docs/migrations/20261030_activity_based_assessment.sql', import.meta.url),
    'utf8'
  )

  for (const answers of Object.values(answerValues)) {
    for (const answer of answers) {
      assert.ok(migration.includes(`'${answer}'`), `database validation must include ${answer}`)
    }
  }
})

test('the written coverage report includes all answer values and audit fields', async () => {
  const report = await readFile(
    new URL('../docs/assessment-answer-coverage.md', import.meta.url),
    'utf8'
  )

  for (const answers of Object.values(answerValues)) {
    for (const answer of answers) {
      assert.ok(report.includes(`\`${answer}\``), `coverage report must include ${answer}`)
    }
  }

  for (const field of ['IF–THEN rule outcome', 'Compatibility conditions and exclusions', 'Exhaustive profile verification']) {
    assert.ok(report.includes(field), `coverage report must include ${field}`)
  }

  assert.match(report, /256/)
})

test('each of the 16 answer values has an explicit, explainable rule outcome', () => {
  for (const [activity, answers] of Object.entries(answerValues)) {
    for (const answer of answers) {
      const evaluation = evaluateWith(activity, answer)
      const area = evaluation.areaResults.find(result => result.activity === activity)

      assert.ok(area, `${activity}: ${answer} must produce an area result`)
      assert.ok(area.rule.includes('IF '), `${activity}: ${answer} must have an explicit IF–THEN rule`)
      assert.ok(area.compatibilityConditions.length, `${activity}: ${answer} must report compatibility conditions`)
      assert.ok(area.excludedExercises.every(exercise => exercise.reason && exercise.documentationStatus))
      assert.ok(area.matchedExercises.length > 0 || area.missingEvidence, `${activity}: ${answer} must resolve to a match or an evidence gap`)
    }
  }
})

test('all 256 profiles match expected exercise IDs from the rule and eligibility matrix', () => {
  assert.equal(recommendationMatrix.length, 256)
  let testedProfiles = 0

  for (const legMovement of answerValues.legMovement) {
    for (const standing of answerValues.standing) {
      for (const walking of answerValues.walking) {
        for (const sittingToStanding of answerValues.sittingToStanding) {
          const findings = { legMovement, standing, walking, sittingToStanding }
          const evaluation = evaluateFindings(findings)
          const caseId = `RE-${String(testedProfiles + 1).padStart(3, '0')}`
          const matrixCase = recommendationMatrix[testedProfiles]

          assert.equal(matrixCase.caseId, caseId)
          assert.deepEqual(matrixCase.findings, findings, `${caseId}: assessment answers must retain their matrix order`)
          assert.deepEqual(
            matrixCase.expectedExerciseIds,
            expectedExerciseIds(findings),
            `${caseId}: matrix expected IDs must agree with the independent rule/eligibility oracle`
          )
          assert.equal(evaluation.areaResults.length, 4)
          assert.equal(new Set(evaluation.recommendations.map(item => item.exercise.id)).size, evaluation.recommendations.length)
          assert.ok(evaluation.summary.includes('Recorded functional responses'))
          assert.deepEqual(
            evaluation.recommendations.map(item => item.exercise.id).sort((a, b) => a - b),
            matrixCase.expectedExerciseIds,
            `${caseId}: generated IDs must match the finalized expected matrix`
          )
          assert.ok(Array.isArray(matrixCase.applicableExclusionReasons), `${caseId}: matrix exclusions must be recorded`)
          for (const exclusion of matrixCase.applicableExclusionReasons) {
            const area = evaluation.areaResults.find(result => result.activity === exclusion.activity)
            const actualExclusion = area?.excludedExercises.find(item => item.id === exclusion.exerciseId)
            assert.equal(
              actualExclusion?.reason,
              exclusion.reason,
              `${caseId}: exclusion reason for exercise ${exclusion.exerciseId} must match`
            )
          }
          testedProfiles += 1
        }
      }
    }
  }

  assert.equal(testedProfiles, 256)
})

test('dual-task walking follows its existing walking and standing eligibility requirements', () => {
  const compatible = evaluateFindings({
    ...defaultFindings,
    walking: 'walking_independent',
    standing: 'standing_support'
  })
  const incompatibleWalking = evaluateFindings({
    ...defaultFindings,
    walking: 'walking_assistance',
    standing: 'standing_support'
  })
  const incompatibleStanding = evaluateFindings({
    ...defaultFindings,
    walking: 'walking_aid',
    standing: 'standing_assistance'
  })

  assert.ok(compatible.recommendations.some(item => item.exercise.id === 8))
  assert.ok(incompatibleWalking.recommendations.some(item => item.exercise.id === 20))
  assert.ok(!incompatibleWalking.recommendations.some(item => item.exercise.id === 8))
  assert.ok(!incompatibleStanding.recommendations.some(item => item.exercise.id === 8))
})

test('seated leg cycling follows its leg eligibility and distinguishes rule non-selection', () => {
  const eligible = evaluateFindings({
    ...defaultFindings,
    walking: 'walking_unable',
    legMovement: 'leg_independent'
  })
  const eligibilityExcluded = evaluateFindings({
    ...defaultFindings,
    walking: 'walking_unable',
    legMovement: 'leg_assistance'
  })
  const notSelectedByRule = evaluateFindings({
    ...defaultFindings,
    walking: 'walking_independent',
    legMovement: 'leg_independent'
  })
  const notSelectedAndEligibilityExcluded = evaluateFindings({
    ...defaultFindings,
    walking: 'walking_independent',
    legMovement: 'leg_assistance'
  })

  assert.ok(eligible.recommendations.some(item => item.exercise.id === 10))
  assert.ok(!eligibilityExcluded.recommendations.some(item => item.exercise.id === 10))
  assert.match(
    eligibilityExcluded.areaResults.find(area => area.activity === 'walking').excludedExercises.find(item => item.id === 10).reason,
    /Excluded: The exercise requires leg movement response leg_independent/
  )
  assert.match(
    notSelectedByRule.areaResults.find(area => area.activity === 'walking').excludedExercises.find(item => item.id === 10).reason,
    /^Not selected:/
  )
  assert.match(
    notSelectedAndEligibilityExcluded.areaResults.find(area => area.activity === 'walking').excludedExercises.find(item => item.id === 10).reason,
    /^Not selected by the walking IF–THEN rule; eligibility also excludes this exercise:/
  )
})

test('aquatic exercise is excluded only when both documented starting modes are reported unable', () => {
  const neitherStartMode = evaluateFindings({
    ...defaultFindings,
    standing: 'standing_unable',
    walking: 'walking_unable'
  })
  const walkingStartMode = evaluateFindings({
    ...defaultFindings,
    standing: 'standing_unable',
    walking: 'walking_independent'
  })
  const standingStartMode = evaluateFindings({
    ...defaultFindings,
    standing: 'standing_support',
    walking: 'walking_unable'
  })

  assert.ok(!neitherStartMode.recommendations.some(item => item.exercise.id === 18))
  assert.ok(walkingStartMode.recommendations.some(item => item.exercise.id === 18))
  assert.ok(standingStartMode.recommendations.some(item => item.exercise.id === 18))
  assert.ok(
    neitherStartMode.areaResults
      .flatMap(area => area.excludedExercises)
      .some(item => item.id === 18 && item.reason.includes('both responses report inability'))
  )
})

test('walking-aid results are retained with documented standing support', () => {
  const evaluation = evaluateAssessment({
    findings: {
      legMovement: 'leg_independent',
      standing: 'standing_support',
      walking: 'walking_aid',
      sittingToStanding: 'sit_to_stand_supported'
    }
  }, exercises)

  assert.ok(evaluation.recommendations.some(recommendation => recommendation.exercise.id === 9))
})

test('documented exercise requirements are checked against the complete response profile', () => {
  const evaluation = evaluateAssessment({
    findings: {
      legMovement: 'leg_independent',
      standing: 'standing_unable',
      walking: 'walking_independent',
      sittingToStanding: 'sit_to_stand_independent'
    }
  }, exercises)

  assert.ok(evaluation.areaResults.every(area => area.excludedExercises.some(exercise => exercise.reason.includes('Excluded')) || area.missingEvidence || area.matchedCount > 0))
})

test('full assessment report names matches, rules, conditions, exclusions, and documentation gaps', () => {
  const evaluation = evaluateAssessment({
    findings: {
      legMovement: 'leg_independent',
      standing: 'standing_support',
      walking: 'walking_independent',
      sittingToStanding: 'sit_to_stand_independent'
    }
  }, exercises)

  assert.equal(evaluation.areaResults.length, 4)
  assert.ok(evaluation.areaResults.every(area => area.reason.length > 0))
  assert.ok(evaluation.areaResults.every(area => area.rule.includes('IF ')))
  assert.ok(evaluation.areaResults.every(area => area.compatibilityConditions.length > 0))
  assert.ok(evaluation.areaResults.every(area => area.excludedExercises.every(exercise => exercise.reason && exercise.documentationStatus)))
  assert.ok(evaluation.summary.includes('Recorded functional responses'))
})

test('missing answers are validated and do not produce recommendations or a partial report', () => {
  const evaluation = evaluateAssessment({
    findings: {
      legMovement: 'leg_independent',
      standing: 'standing_independent',
      walking: null,
      sittingToStanding: 'sit_to_stand_independent'
    }
  }, exercises)

  assert.deepEqual(evaluation.recommendations, [])
  assert.deepEqual(evaluation.missingAnswers, ['How do you currently move when walking?'])
  assert.deepEqual(evaluation.areaResults, [])
})

test('day grouping shows each matched exercise once and omits empty days', () => {
  const evaluation = evaluateAssessment({
    findings: {
      legMovement: 'leg_independent',
      standing: 'standing_support',
      walking: 'walking_aid',
      sittingToStanding: 'sit_to_stand_supported'
    }
  }, exercises)
  const groups = groupRecommendationsByDay(evaluation.recommendations)

  assert.ok(groups.length > 0)
  assert.deepEqual(groups.map(group => group.day), [...new Set(groups.map(group => group.day))])
  assert.ok(groups.every(group => group.items.length > 0))
})

test('exercise documentation gaps are reported independently of rule matches', () => {
  const exercise = exercises.find(item => item.id === 11)
  assert.ok(exercise)
  assert.ok(Array.isArray(getExerciseDocumentationGaps(exercise)))
  assert.equal(getExerciseDocumentationGaps(exercise).length, 0)
})
