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
  { assessmentQuestions },
  { exercises: localExercises }
] = await Promise.all([
  vite.ssrLoadModule('/src/services/rulesEngine.ts'),
  vite.ssrLoadModule('/src/services/recommendationGroups.ts'),
  vite.ssrLoadModule('/src/services/exerciseDocumentation.ts'),
  vite.ssrLoadModule('/src/types/index.ts'),
  vite.ssrLoadModule('/src/data/exercises.ts')
])

const exerciseMigration = await readFile(
  new URL('../docs/migrations/20261113_migrate_exercises_to_supabase.sql', import.meta.url),
  'utf8'
)
const exercisePayload = exerciseMigration.match(/source_rows jsonb := \$exercise_data\$([\s\S]*?)\$exercise_data\$::jsonb/)
assert.ok(exercisePayload, 'the exercise migration must contain its reviewed source catalogue')
const circuitEligibilityMigration = await readFile(
  new URL('../docs/migrations/20261128_restrict_circuit_class_eligibility.sql', import.meta.url),
  'utf8'
)
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

test('Exercise 20 eligibility agrees in both catalogues and the existing-database migration', () => {
  const expectedEligibility = {
    standing: ['standing_independent', 'standing_support'],
    walking: ['walking_independent', 'walking_aid'],
    sittingToStanding: ['sit_to_stand_independent', 'sit_to_stand_supported']
  }
  const storedEligibility = JSON.stringify(expectedEligibility)

  assert.deepEqual(exercises.find(exercise => exercise.id === 20).eligibilityRequirements, expectedEligibility)
  assert.deepEqual(localExercises.find(exercise => exercise.id === 20).eligibilityRequirements, expectedEligibility)
  assert.ok(circuitEligibilityMigration.includes(`set eligibility_requirements = '${storedEligibility}'::jsonb`))
  assert.match(circuitEligibilityMigration, /where id = 20\s+and name = 'Circuit Class Therapy for Mobility After Stroke'/i)
  assert.doesNotMatch(circuitEligibilityMigration, /\b(?:alter|create|drop)\s+table\b/i)
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
    standing_assistance: [11],
    standing_unable: [18]
  },
  walking: {
    walking_independent: [8, 9, 12, 19],
    walking_aid: [8, 9, 12, 19],
    walking_assistance: [],
    walking_unable: [10, 18]
  },
  sittingToStanding: {
    sit_to_stand_independent: [5, 20],
    sit_to_stand_supported: [5, 20],
    sit_to_stand_assistance: [],
    sit_to_stand_unable: []
  }
}

const ruleIds = {
  legMovement: {
    leg_independent: 'LEG-01',
    leg_assistance: 'LEG-02',
    leg_limited: 'LEG-03',
    leg_unable: 'LEG-04'
  },
  standing: {
    standing_independent: 'STAND-01',
    standing_support: 'STAND-02',
    standing_assistance: 'STAND-03',
    standing_unable: 'STAND-04'
  },
  walking: {
    walking_independent: 'WALK-01',
    walking_aid: 'WALK-02',
    walking_assistance: 'WALK-03',
    walking_unable: 'WALK-04'
  },
  sittingToStanding: {
    sit_to_stand_independent: 'STS-01',
    sit_to_stand_supported: 'STS-02',
    sit_to_stand_assistance: 'STS-03',
    sit_to_stand_unable: 'STS-04'
  }
}

const mappedExerciseIds = new Set(Object.values(ruleExerciseIds)
  .flatMap(ruleByAnswer => Object.values(ruleByAnswer).flat()))
const unmappedExerciseIds = new Set([3, 13, 14, 15, 16, 21])

test('every catalogue record is rule-mapped or explicitly documented as unmapped', () => {
  assert.deepEqual(
    [...new Set([...mappedExerciseIds, ...unmappedExerciseIds])].sort((a, b) => a - b),
    exercises.map(exercise => exercise.id).sort((a, b) => a - b),
    'every catalogue record must be rule-mapped or explicitly documented as unmapped'
  )
  assert.ok([...mappedExerciseIds].every(id => !unmappedExerciseIds.has(id)))
})

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

  assert.ok(report.includes('Catalogue mapping audit'))
  for (const exercise of exercises) {
    assert.ok(report.includes(exercise.name), `coverage report must audit ${exercise.name}`)
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
  const reachableExerciseIds = new Set()

  for (const legMovement of answerValues.legMovement) {
    for (const standing of answerValues.standing) {
      for (const walking of answerValues.walking) {
        for (const sittingToStanding of answerValues.sittingToStanding) {
          const findings = { legMovement, standing, walking, sittingToStanding }
          const evaluation = evaluateFindings(findings)
          const caseId = `RE-${String(testedProfiles + 1).padStart(3, '0')}`
          const matrixCase = recommendationMatrix[testedProfiles]
          const recommendationIds = evaluation.recommendations.map(item => item.exercise.id)

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
            recommendationIds.sort((a, b) => a - b),
            matrixCase.expectedExerciseIds,
            `${caseId}: generated IDs must match the finalized expected matrix`
          )
          assert.ok(recommendationIds.every(id => exercises.some(exercise => exercise.id === id)), `${caseId}: recommendations must reference catalogue IDs`)
          assert.ok(recommendationIds.every(id => mappedExerciseIds.has(id)), `${caseId}: recommendations must reference rule-mapped IDs`)
          assert.ok([...unmappedExerciseIds].every(id => !recommendationIds.includes(id)), `${caseId}: unmapped exercises must not be recommended`)
          for (const area of evaluation.areaResults) {
            const matchedIds = area.matchedExercises.map(exercise => exercise.id)
            const excludedIds = area.excludedExercises.map(exercise => exercise.id)
            assert.ok(matchedIds.every(id => !excludedIds.includes(id)), `${caseId}: matched exercises cannot also be excluded`)
            assert.ok(matchedIds.every(id =>
              ruleExerciseIds[area.activity][area.answer].includes(id) &&
              exercises.find(exercise => exercise.id === id).functionalAreas.includes(functionalAreaByActivity[area.activity]) &&
              Object.entries(exercises.find(exercise => exercise.id === id).eligibilityRequirements ?? {})
                .every(([question, allowedAnswers]) => allowedAnswers.includes(findings[question]))
            ), `${caseId}: every matched exercise must satisfy its rule, functional area, and complete-profile eligibility`)
          }
          for (const [activity, answer] of Object.entries(findings)) {
            const area = evaluation.areaResults.find(result => result.activity === activity)
            assert.equal(area?.ruleId, ruleIds[activity][answer], `${caseId}: each response must select its stable rule ID`)
          }
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
          for (const id of recommendationIds) reachableExerciseIds.add(id)
        }
      }
    }
  }

  assert.equal(testedProfiles, 256)
  assert.deepEqual([...reachableExerciseIds].sort((a, b) => a - b), [...mappedExerciseIds].sort((a, b) => a - b))
})

test('side-stepping is reachable only when both recorded catalogue prerequisites are met', () => {
  const eligibleWalkingAnswers = new Set(['walking_independent', 'walking_aid'])
  const eligibleStandingAnswers = new Set(['standing_independent', 'standing_support'])

  for (const walking of answerValues.walking) {
    for (const standing of answerValues.standing) {
      const evaluation = evaluateFindings({ ...defaultFindings, walking, standing })
      const isEligible = eligibleWalkingAnswers.has(walking) && eligibleStandingAnswers.has(standing)
      const isRecommended = evaluation.recommendations.some(item => item.exercise.id === 12)

      assert.equal(isRecommended, isEligible, `${walking} with ${standing}`)
    }
  }
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
  assert.ok(!incompatibleWalking.recommendations.some(item => item.exercise.id === 20))
  assert.ok(!incompatibleWalking.recommendations.some(item => item.exercise.id === 8))
  assert.ok(!incompatibleStanding.recommendations.some(item => item.exercise.id === 8))
})

test('RE-001 keeps Exercise 8 under independent walking and does not map it to walking assistance', () => {
  const allIndependent = evaluateFindings(defaultFindings)
  const walkingAssistance = evaluateWith('walking', 'walking_assistance')
  const walkingRule = allIndependent.areaResults.find(area => area.activity === 'walking')

  assert.ok(allIndependent.recommendations.some(item => item.exercise.id === 8))
  assert.ok(walkingRule.matchedExercises.some(item => item.id === 8))
  assert.ok(!walkingAssistance.recommendations.some(item => item.exercise.id === 8))
  assert.ok(!ruleExerciseIds.walking.walking_assistance.includes(8))
})

test('Circuit Class Therapy requires documented standing, walking, and chair-rise ability', () => {
  const circuit = exercises.find(exercise => exercise.id === 20)
  assert.ok(circuit)
  assert.deepEqual(circuit.eligibilityRequirements, {
    standing: ['standing_independent', 'standing_support'],
    walking: ['walking_independent', 'walking_aid'],
    sittingToStanding: ['sit_to_stand_independent', 'sit_to_stand_supported']
  })

  const incompatibleProfiles = [
    { activity: 'standing', answer: 'standing_assistance' },
    { activity: 'standing', answer: 'standing_unable' },
    { activity: 'walking', answer: 'walking_assistance' },
    { activity: 'walking', answer: 'walking_unable' },
    { activity: 'sittingToStanding', answer: 'sit_to_stand_assistance' },
    { activity: 'sittingToStanding', answer: 'sit_to_stand_unable' }
  ]

  for (const { activity, answer } of incompatibleProfiles) {
    const evaluation = evaluateWith(activity, answer)
    const area = evaluation.areaResults.find(result => result.activity === activity)
    const exclusion = area.excludedExercises.find(exercise => exercise.id === 20)

    assert.ok(!evaluation.recommendations.some(item => item.exercise.id === 20), `${activity}: ${answer}`)
    assert.match(exclusion.reason, /^Excluded: The exercise requires/)
  }

  assert.ok(evaluateFindings(defaultFindings).recommendations.some(item => item.exercise.id === 20))
  assert.deepEqual(ruleExerciseIds.walking.walking_assistance, [])
  assert.deepEqual(ruleExerciseIds.sittingToStanding.sit_to_stand_assistance, [])
  assert.deepEqual(ruleExerciseIds.sittingToStanding.sit_to_stand_unable, [])
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

test('Exercise 10 recommendations and walking exclusions agree for every walking response', () => {
  for (const legMovement of answerValues.legMovement) {
    for (const walking of answerValues.walking) {
      const evaluation = evaluateFindings({ ...defaultFindings, legMovement, walking })
      const isEligibleAndMapped = legMovement === 'leg_independent' && walking === 'walking_unable'
      const isRecommended = evaluation.recommendations.some(item => item.exercise.id === 10)
      const walkingArea = evaluation.areaResults.find(area => area.activity === 'walking')
      const exclusion = walkingArea.excludedExercises.find(item => item.id === 10)

      assert.equal(isRecommended, isEligibleAndMapped, `${legMovement} with ${walking}`)
      assert.equal(walkingArea.matchedExercises.some(item => item.id === 10), isRecommended)
      assert.equal(!!exclusion, !isRecommended)
      if (exclusion) {
        assert.match(exclusion.reason, /^(Not selected:|Not selected by the walking IF–THEN rule; eligibility also excludes|Excluded:)/)
        assert.doesNotMatch(exclusion.reason, /matches a predefined rule/)
      }
    }
  }
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

test('no exercise is forced when the supplied catalogue has no compatible records', () => {
  const evaluation = evaluateAssessment({ findings: defaultFindings }, [])

  assert.deepEqual(evaluation.recommendations, [])
  assert.ok(evaluation.areaResults.every(area => area.matchedCount === 0))
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

test('all 20 exercise records are checked for documentation gaps independently of rule matches', () => {
  const documentationResults = exercises.map(exercise => ({
    id: exercise.id,
    name: exercise.name,
    gaps: getExerciseDocumentationGaps(exercise)
  }))

  assert.equal(documentationResults.length, 20)

  for (const result of documentationResults) {
    assert.ok(
      Array.isArray(result.gaps),
      `Exercise ${result.id} must return a documentation gap report`
    )
  }
})