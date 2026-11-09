import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  server: { middlewareMode: true }
})

after(async () => {
  await vite.close()
})

const [{ evaluateAssessment, validateAssessmentInput }, { exercises }, { groupRecommendationsByDay }, { getExerciseDocumentationGaps }] = await Promise.all([
  vite.ssrLoadModule('/src/services/rulesEngine.ts'),
  vite.ssrLoadModule('/src/data/exercises.ts'),
  vite.ssrLoadModule('/src/services/recommendationGroups.ts'),
  vite.ssrLoadModule('/src/services/exerciseDocumentation.ts')
])

const defaultFindings = {
  legMovement: 'leg_independent',
  standing: 'standing_independent',
  walking: 'walking_independent',
  sittingToStanding: 'sit_to_stand_independent'
}

function evaluateWith(activity, answer, overrides = {}) {
  return evaluateAssessment({
    findings: { ...defaultFindings, [activity]: answer, ...overrides }
  })
}

function matchedIds(evaluation, activity) {
  return evaluation.recommendations
    .filter(recommendation => recommendation.matches.some(match => match.activity === activity))
    .map(recommendation => recommendation.exercise.id)
    .sort((left, right) => left - right)
}

test('all 16 assessment answers have explicit, supported rule outcomes', () => {
  const expectedMatches = {
    legMovement: {
      leg_independent: [1, 2],
      leg_assistance: [],
      leg_limited: [],
      leg_unable: []
    },
    standing: {
      standing_independent: [4, 6],
      standing_support: [4, 6],
      standing_assistance: [],
      standing_unable: []
    },
    walking: {
      walking_independent: [4, 9, 14, 19],
      walking_aid: [4, 9, 14],
      walking_assistance: [14],
      walking_unable: []
    },
    sittingToStanding: {
      sit_to_stand_independent: [5],
      sit_to_stand_supported: [5],
      sit_to_stand_assistance: [],
      sit_to_stand_unable: []
    }
  }

  for (const [activity, answerRules] of Object.entries(expectedMatches)) {
    for (const [answer, expectedIds] of Object.entries(answerRules)) {
      const evaluation = evaluateWith(activity, answer)
      assert.deepEqual(matchedIds(evaluation, activity), expectedIds, `${activity}: ${answer}`)
      const area = evaluation.areaResults.find(result => result.activity === activity)
      assert.ok(area?.reason, `${activity}: ${answer} must have an explanation`)
      assert.equal(area.matchedCount, expectedIds.length, `${activity}: ${answer} matched count`)
      if (!expectedIds.length) assert.match(area.reason, /No |The /i)
    }
  }
})

test('all 256 full assessment answer combinations return only supported, unique matches', () => {
  const answerValues = {
    legMovement: ['leg_independent', 'leg_assistance', 'leg_limited', 'leg_unable'],
    standing: ['standing_independent', 'standing_support', 'standing_assistance', 'standing_unable'],
    walking: ['walking_independent', 'walking_aid', 'walking_assistance', 'walking_unable'],
    sittingToStanding: ['sit_to_stand_independent', 'sit_to_stand_supported', 'sit_to_stand_assistance', 'sit_to_stand_unable']
  }

  for (const legMovement of answerValues.legMovement) {
    for (const standing of answerValues.standing) {
      for (const walking of answerValues.walking) {
        for (const sittingToStanding of answerValues.sittingToStanding) {
          const evaluation = evaluateAssessment({
            findings: { legMovement, standing, walking, sittingToStanding }
          })
          const actualIds = evaluation.recommendations.map(item => item.exercise.id).sort((a, b) => a - b)
          const expectedIds = new Set()
          const canStandWithSupport = standing === 'standing_independent' || standing === 'standing_support'

          if (legMovement === 'leg_independent') [1, 2].forEach(id => expectedIds.add(id))
          if (canStandWithSupport) [4, 6].forEach(id => expectedIds.add(id))
          if (canStandWithSupport && walking === 'walking_independent') [4, 9, 14, 19].forEach(id => expectedIds.add(id))
          if (canStandWithSupport && walking === 'walking_aid') [4, 9, 14].forEach(id => expectedIds.add(id))
          if (standing !== 'standing_unable' && walking === 'walking_assistance') expectedIds.add(14)
          if (canStandWithSupport && (sittingToStanding === 'sit_to_stand_independent' || sittingToStanding === 'sit_to_stand_supported')) expectedIds.add(5)

          assert.deepEqual(actualIds, [...expectedIds].sort((a, b) => a - b))
          assert.equal(new Set(actualIds).size, actualIds.length)
          assert.equal(evaluation.areaResults.length, 4)
          assert.ok(evaluation.areaResults.every(result => result.reason.length > 0))
        }
      }
    }
  }
})

test('walking rules require a compatible standing response', () => {
  const cannotStand = evaluateWith('walking', 'walking_independent', { standing: 'standing_unable' })
  assert.deepEqual(matchedIds(cannotStand, 'walking'), [])
  assert.match(cannotStand.areaResults.find(result => result.activity === 'walking').reason, /standing response reports inability to stand/)

  const needsHelpToStand = evaluateWith('walking', 'walking_independent', { standing: 'standing_assistance' })
  assert.deepEqual(matchedIds(needsHelpToStand, 'walking'), [])
  assert.match(needsHelpToStand.areaResults.find(result => result.activity === 'walking').reason, /requires another person to stand/)

  const assistedWalkingWithAssistedStanding = evaluateWith('walking', 'walking_assistance', { standing: 'standing_assistance' })
  assert.deepEqual(matchedIds(assistedWalkingWithAssistedStanding, 'walking'), [14])

  const assistedWalkingWithNoStanding = evaluateWith('walking', 'walking_assistance', { standing: 'standing_unable' })
  assert.deepEqual(matchedIds(assistedWalkingWithNoStanding, 'walking'), [])

  const supportedWalking = evaluateWith('walking', 'walking_aid', { standing: 'standing_support' })
  const heelRaises = supportedWalking.recommendations.filter(item => item.exercise.id === 4)
  assert.equal(heelRaises.length, 1)
  assert.deepEqual(heelRaises[0].matches.map(match => match.activity), ['standing', 'walking'])
  assert.equal(heelRaises[0].reasons.length, 2)
})

test('limited movement and inability to rise do not produce unsupported advanced exercises', () => {
  const limitedMovement = evaluateWith('legMovement', 'leg_limited')
  assert.deepEqual(matchedIds(limitedMovement, 'legMovement'), [])
  assert.ok(!limitedMovement.recommendations.some(item => item.exercise.id === 10))

  const unableToRise = evaluateWith('sittingToStanding', 'sit_to_stand_unable')
  assert.deepEqual(matchedIds(unableToRise, 'sittingToStanding'), [])
  assert.ok(!unableToRise.recommendations.some(item => item.exercise.id === 5))

  const sitToStandDespiteUnableStanding = evaluateWith('sittingToStanding', 'sit_to_stand_supported', { standing: 'standing_unable' })
  assert.deepEqual(matchedIds(sitToStandDespiteUnableStanding, 'sittingToStanding'), [])
  assert.match(sitToStandDespiteUnableStanding.areaResults.find(result => result.activity === 'sittingToStanding').reason, /standing response reports inability/)
})

test('missing answers are validated and do not produce recommendations', () => {
  const incompleteInput = { findings: { ...defaultFindings, walking: null } }
  assert.deepEqual(validateAssessmentInput(incompleteInput), ['How do you currently move when walking?'])
  const evaluation = evaluateAssessment(incompleteInput)
  assert.equal(evaluation.recommendations.length, 0)
  assert.equal(evaluation.areaResults.length, 0)
})

test('review-required records still appear when an explicit rule matches', () => {
  const evaluation = evaluateWith('standing', 'standing_support')
  const matched = evaluation.recommendations.filter(item => item.matches.some(match => match.activity === 'standing'))
  assert.deepEqual(matched.map(item => item.exercise.id).sort((a, b) => a - b), [4, 6])
  assert.ok(matched.every(item => item.exercise.eligibilityStatus === 'review_required'))
})

test('recommendation grouping shows actual exercises once and omits empty days', () => {
  const evaluation = evaluateAssessment({
    findings: {
      legMovement: 'leg_independent',
      standing: 'standing_support',
      walking: 'walking_assistance',
      sittingToStanding: 'sit_to_stand_supported'
    }
  })
  const groups = groupRecommendationsByDay([...evaluation.recommendations, ...evaluation.recommendations])
  const displayedIds = groups.flatMap(group => group.items.map(item => item.exercise.id))

  assert.deepEqual(groups.map(group => group.day), [1, 2, 3, 4])
  assert.equal(new Set(displayedIds).size, displayedIds.length)
  assert.deepEqual([...displayedIds].sort((a, b) => a - b), [1, 2, 4, 5, 6, 14])
  assert.deepEqual(groupRecommendationsByDay([]), [])
})

test('catalogue reports missing documentation independently of rule matching', () => {
  assert.equal(exercises.length, 20)
  assert.equal(new Set(exercises.map(exercise => exercise.id)).size, exercises.length)
  assert.deepEqual(exercises.slice(-4).map(exercise => exercise.id), [19, 20, 21, 22])
  assert.equal(exercises.filter(exercise => getExerciseDocumentationGaps(exercise).length > 0).length, 20)

  const incompleteExercise = exercises.find(exercise => exercise.id === 19)
  assert.ok(incompleteExercise)
  const gaps = getExerciseDocumentationGaps(incompleteExercise)
  assert.ok(gaps.includes('step-by-step instructions'))
  assert.ok(gaps.includes('safety precautions'))
  assert.ok(gaps.includes('contraindications'))
  assert.ok(gaps.includes('stroke phase applicability'))
})
