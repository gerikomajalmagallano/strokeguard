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

function evaluateWith(activity, answer, overrides = {}) {
  return evaluateAssessment({
    findings: { ...defaultFindings, [activity]: answer, ...overrides }
  }, exercises)
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

  for (const field of ['IF–THEN rule outcome', 'Compatibility conditions', 'Excluded exercises and reasons', 'Documentation status']) {
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

test('all 256 complete response combinations are checked against the full profile', () => {
  let testedProfiles = 0

  for (const legMovement of answerValues.legMovement) {
    for (const standing of answerValues.standing) {
      for (const walking of answerValues.walking) {
        for (const sittingToStanding of answerValues.sittingToStanding) {
          const evaluation = evaluateAssessment({
            findings: { legMovement, standing, walking, sittingToStanding }
          }, exercises)

          assert.equal(evaluation.areaResults.length, 4)
          assert.equal(new Set(evaluation.recommendations.map(item => item.exercise.id)).size, evaluation.recommendations.length)
          assert.ok(evaluation.summary.includes('Recorded functional responses'))
          testedProfiles += 1
        }
      }
    }
  }

  assert.equal(testedProfiles, 256)
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
