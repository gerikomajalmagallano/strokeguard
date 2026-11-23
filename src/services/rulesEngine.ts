import { getExerciseDocumentationGaps } from '@/services/exerciseDocumentation'
import {
  assessmentQuestions,
  getAnswerLabel,
  type AssessmentActivity,
  type AssessmentAnswer,
  type AssessmentEvaluation,
  type AssessmentInput,
  type Exercise,
  type FunctionalArea,
  type Recommendation
} from '@/types'

const functionalAreaByActivity: Record<AssessmentActivity, FunctionalArea> = {
  legMovement: 'Leg movement',
  standing: 'Standing and balance',
  walking: 'Walking and gait',
  sittingToStanding: 'Sit-to-stand and functional strengthening'
}

interface AnswerRule {
  ifThen: string
  exerciseIds: number[]
  missingEvidence: string | null
}

type AnswerRules = Record<AssessmentActivity, Record<string, AnswerRule>>

const answerRules: AnswerRules = {
  legMovement: {
    leg_independent: {
      ifThen: 'IF the patient reports independent leg movement, THEN consider the documented active seated ankle-movement exercises.',
      exerciseIds: [1, 2],
      missingEvidence: null
    },
    leg_assistance: {
      ifThen: 'IF the patient reports needing assistance to move the leg, THEN consider documented assisted or supervised movement options with a helper or therapist guidance.',
      exerciseIds: [17],
      missingEvidence: null
    },
    leg_limited: {
      ifThen: 'IF the patient reports only limited leg movement, THEN consider lower-limb practice that supports a reduced or assisted range of motion.',
      exerciseIds: [17],
      missingEvidence: null
    },
    leg_unable: {
      ifThen: 'IF the patient reports no leg movement, THEN consider a documented assisted or passive movement alternative and therapist-guided preparation.',
      exerciseIds: [17],
      missingEvidence: null
    }
  },
  standing: {
    standing_independent: {
      ifThen: 'IF the patient reports standing independently, THEN consider the documented supported standing exercises.',
      exerciseIds: [4, 6, 11],
      missingEvidence: null
    },
    standing_support: {
      ifThen: 'IF the patient reports standing while holding stable support, THEN consider exercises whose starting position and instructions require stable support.',
      exerciseIds: [4, 6, 11],
      missingEvidence: null
    },
    standing_assistance: {
      ifThen: 'IF the patient reports needing another person to stand, THEN consider a supported or supervised standing exercise with helper assistance.',
      exerciseIds: [11, 20],
      missingEvidence: null
    },
    standing_unable: {
      ifThen: 'IF the patient reports being unable to stand even with assistance, THEN use documented seated or supported alternatives rather than standing drills.',
      exerciseIds: [18, 20],
      missingEvidence: null
    }
  },
  walking: {
    walking_independent: {
      ifThen: 'IF the patient reports walking independently, THEN consider the documented walking exercises, dual-task walking, and task-specific gait practice.',
      exerciseIds: [8, 9, 19],
      missingEvidence: null
    },
    walking_aid: {
      ifThen: 'IF the patient reports walking with an aid, THEN consider aid-supported walking practice, including the documented dual-task and task-specific gait exercises.',
      exerciseIds: [8, 9, 19],
      missingEvidence: null
    },
    walking_assistance: {
      ifThen: 'IF the patient reports needing another person when walking, THEN use supervised or helper-assisted walking options with documented safety support.',
      exerciseIds: [20],
      missingEvidence: null
    },
    walking_unable: {
      ifThen: 'IF the patient reports being unable to walk, THEN consider seated, supported, or preparatory alternatives that do not require walking.',
      exerciseIds: [10, 18, 20],
      missingEvidence: null
    }
  },
  sittingToStanding: {
    sit_to_stand_independent: {
      ifThen: 'IF the patient reports getting up independently without hands, THEN consider the documented chair sit-to-stand exercise.',
      exerciseIds: [5, 20],
      missingEvidence: null
    },
    sit_to_stand_supported: {
      ifThen: 'IF the patient reports getting up independently using hands or chair support, THEN consider the documented chair sit-to-stand exercise.',
      exerciseIds: [5, 20],
      missingEvidence: null
    },
    sit_to_stand_assistance: {
      ifThen: 'IF the patient reports needing another person to get up, THEN consider a supervised transfer or assisted sit-to-stand option.',
      exerciseIds: [20],
      missingEvidence: null
    },
    sit_to_stand_unable: {
      ifThen: 'IF the patient reports being unable to rise from a chair, THEN prefer seated lower-limb alternatives or supervised mobility practice instead of standing transfer drills.',
      exerciseIds: [20],
      missingEvidence: null
    }
  }
}

const compatibilityConditionsByActivity: Record<AssessmentActivity, string[]> = {
  legMovement: [
    'The complete four-response profile is retained; no standing, walking, or chair-rise response is used to infer leg movement ability.'
  ],
  standing: [
    'The complete four-response profile is retained; the standing answer must allow the exercise starting position and documented support.',
    'Exercise 18 is excluded when both standing and walking are reported as unable, because its documented starting position is standing or walking.'
  ],
  walking: [
    'The complete four-response profile is checked.',
    'Exercise 8 is mapped only to walking_independent and walking_aid and must also meet its standing eligibility requirement.',
    'The walking exercise starts in standing, so standing_unable excludes it.',
    'Standing_support is compatible with the documented stable support. Standing_assistance excludes the exercise because hands-on help to reach its standing start position is not documented.',
    'Exercise 18 is excluded when both standing and walking are reported as unable, because its documented starting position is standing or walking.'
  ],
  sittingToStanding: [
    'The complete four-response profile is checked.',
    'The chair-rise exercise is excluded when standing_unable conflicts with its standing end position.'
  ]
}

function documentationStatus(exercise: Exercise): string {
  const gaps = getExerciseDocumentationGaps(exercise)
  return gaps.length ? `Incomplete; missing ${gaps.join(', ')}.` : 'Complete.'
}

function getEligibilityConflict(exercise: Exercise, findings: AssessmentInput['findings']): string | null {
  for (const question of assessmentQuestions) {
    const requiredAnswers = exercise.eligibilityRequirements?.[question.key]
    const reportedAnswer = findings[question.key]
    if (requiredAnswers && reportedAnswer && !requiredAnswers.includes(reportedAnswer)) {
      return `The exercise requires ${question.label.toLowerCase()} response ${requiredAnswers.join(' or ')}, but the recorded response is ${reportedAnswer}.`
    }
  }
  return null
}

function getExclusionReason(
  activity: AssessmentActivity,
  answer: AssessmentAnswer,
  exercise: Exercise,
  findings: AssessmentInput['findings'],
  ruleExerciseIds: number[]
): string {
  if (activity === 'walking' && exercise.id === 9 && findings.standing === 'standing_unable') {
    return 'Excluded: this exercise starts in standing, while the reported standing response is inability to stand even with assistance.'
  }
  if (activity === 'walking' && exercise.id === 9 && findings.standing === 'standing_assistance') {
    return 'Excluded: the exercise starts in standing, but its record does not document another person assisting the patient into that position.'
  }
  if (activity === 'sittingToStanding' && exercise.id === 5 && findings.standing === 'standing_unable') {
    return 'Excluded: this exercise ends in standing, which conflicts with the reported inability to stand even with assistance.'
  }
  if (activity === 'legMovement' && [1, 2].includes(exercise.id) && answer === 'leg_assistance') {
    return 'Excluded: the exercise instructions require active ankle movement and do not document another person assisting the movement.'
  }
  if (activity === 'legMovement' && [1, 2].includes(exercise.id) && answer === 'leg_limited') {
    return 'Excluded: the exercise instructions do not define a low-range or graded movement option for limited active movement.'
  }
  if (activity === 'legMovement' && [1, 2, 3].includes(exercise.id) && answer === 'leg_unable') {
    return 'Excluded: the exercise instructions require active movement; no passive or helper-assisted protocol is documented.'
  }
  if (activity === 'standing' && [4, 6].includes(exercise.id) && answer === 'standing_assistance') {
    return 'Excluded: the exercise instructions require standing with stable support but do not document hands-on assistance to stand or exercise.'
  }
  if (activity === 'standing' && [4, 6].includes(exercise.id) && answer === 'standing_unable') {
    return 'Excluded: the exercise starting position requires standing, which conflicts with the reported inability to stand even with assistance.'
  }
  if (activity === 'walking' && exercise.id === 9 && answer === 'walking_assistance') {
    return 'Excluded: the record documents supervision or a walking aid, not hands-on assistance during walking.'
  }
  if (activity === 'walking' && exercise.id === 9 && answer === 'walking_unable') {
    return 'Excluded: the exercise requires walking; no seated or preparatory protocol is documented for this response.'
  }
  if (activity === 'walking' && exercise.id === 10) {
    const eligibilityConflict = getEligibilityConflict(exercise, findings)
    const mappedByRule = ruleExerciseIds.includes(exercise.id)
    if (!mappedByRule && eligibilityConflict) {
      return `Not selected by the walking IF–THEN rule; eligibility also excludes this exercise: ${eligibilityConflict}`
    }
    if (eligibilityConflict) return `Excluded: ${eligibilityConflict}`
    if (!mappedByRule) {
      return 'Not selected: the walking IF–THEN rule does not map this exercise to the recorded walking response.'
    }
  }
  if (
    exercise.id === 18 &&
    findings.standing === 'standing_unable' &&
    findings.walking === 'walking_unable'
  ) {
    return 'Excluded: the documented starting position requires standing or walking, while both responses report inability.'
  }
  if (activity === 'legMovement' && exercise.id === 3 && answer === 'leg_independent') {
    return 'Excluded: the resistance exercise requires professional clearance, and the catalogue has no supporting reference to evaluate suitability.'
  }
  if (activity === 'sittingToStanding' && exercise.id === 5 && answer === 'sit_to_stand_assistance') {
    return 'Excluded: the chair exercise mentions armrests or supervision but does not document another person physically assisting the transfer.'
  }
  if (activity === 'sittingToStanding' && exercise.id === 5 && answer === 'sit_to_stand_unable') {
    return 'Excluded: the exercise requires rising from a chair, which conflicts with the reported inability to rise.'
  }
  const eligibilityConflict = getEligibilityConflict(exercise, findings)
  if (eligibilityConflict) return `Excluded: ${eligibilityConflict}`
  if (!ruleExerciseIds.includes(exercise.id)) {
    return answerRules[activity][answer]?.missingEvidence
      ?? 'The current rule does not map this exercise to the reported response.'
  }
  if (!exercise.functionalAreas.includes(functionalAreaByActivity[activity])) {
    return `Excluded: the exercise is not documented for ${functionalAreaByActivity[activity].toLowerCase()}.`
  }
  return 'Excluded: the exercise requirements are incompatible with the complete reported response set.'
}

export function validateAssessmentInput(input: AssessmentInput | null | undefined): string[] {
  return assessmentQuestions
    .filter(question => !question.options.some(option => option.value === input?.findings?.[question.key]))
    .map(question => question.question)
}

export function evaluateAssessment(input: AssessmentInput | null | undefined, exerciseCatalog: Exercise[]): AssessmentEvaluation {
  const missingAnswers = validateAssessmentInput(input)
  if (missingAnswers.length || !input) {
    return {
      recommendations: [],
      missingAnswers,
      identifiedAreas: [],
      areaResults: [],
      summary: 'Complete all four required answers to evaluate the exercise rules.'
    }
  }

  const recommendationsById = new Map<number, Recommendation>()
  const identifiedAreas: AssessmentEvaluation['identifiedAreas'] = []
  const areaResults: AssessmentEvaluation['areaResults'] = []

  for (const question of assessmentQuestions) {
    const answer = input.findings[question.key]
    if (!answer) continue

    const answerLabel = getAnswerLabel(question.key, answer)
    identifiedAreas.push({ activity: question.key, label: question.label, answer, answerLabel })

    const rule = answerRules[question.key][answer]
    if (!rule) throw new Error(`Missing exercise rule for ${question.key}: ${answer}`)
    const ruleExerciseIds = rule.exerciseIds
    const areaExercises = exerciseCatalog.filter(exercise =>
      exercise.functionalAreas.includes(functionalAreaByActivity[question.key])
    )
    const compatibleExercises = areaExercises.filter(exercise => {
      if (!ruleExerciseIds.includes(exercise.id)) return false
      if (question.key === 'walking' && exercise.id === 9 && input.findings.standing === 'standing_unable') return false
      if (question.key === 'walking' && exercise.id === 9 && input.findings.standing === 'standing_assistance') return false
      if (question.key === 'sittingToStanding' && exercise.id === 5 && input.findings.standing === 'standing_unable') return false
      if (
        exercise.id === 18 &&
        input.findings.standing === 'standing_unable' &&
        input.findings.walking === 'walking_unable'
      ) return false
      return !getEligibilityConflict(exercise, input.findings)
    })
    const matchedIds = new Set(compatibleExercises.map(exercise => exercise.id))
    const excludedExercises = areaExercises
      .filter(exercise => !matchedIds.has(exercise.id))
      .map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        reason: getExclusionReason(question.key, answer, exercise, input.findings, ruleExerciseIds),
        documentationStatus: documentationStatus(exercise)
      }))
    const unavailableRuleIds = ruleExerciseIds.filter(id =>
      !exerciseCatalog.some(exercise =>
        exercise.id === id && exercise.functionalAreas.includes(functionalAreaByActivity[question.key])
      )
    )
    const missingEvidence = unavailableRuleIds.length
      ? `Mapped exercise records are unavailable in the application catalogue: ${unavailableRuleIds.join(', ')}.`
      : rule.missingEvidence
    const matchedExercises = compatibleExercises.map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      documentationStatus: documentationStatus(exercise)
    }))

    areaResults.push({
      activity: question.key,
      label: question.label,
      answer,
      reason: matchedExercises.length
        ? `${matchedExercises.length} exercise${matchedExercises.length === 1 ? '' : 's'} match the predefined rule, subject to the compatibility conditions below.`
        : missingEvidence ?? 'No exercise is compatible with the complete reported response set.',
      matchedCount: matchedExercises.length,
      rule: rule.ifThen,
      compatibilityConditions: compatibilityConditionsByActivity[question.key],
      matchedExercises,
      excludedExercises,
      missingEvidence
    })

    for (const exercise of compatibleExercises) {
      const recommendation = recommendationsById.get(exercise.id)
        ?? { exercise, reasons: [], matches: [] }
      recommendation.reasons.push(`The ${question.label.toLowerCase()} response "${answerLabel}" matches a predefined rule.`)
      recommendation.matches.push({ activity: question.key, label: question.label, answer })
      recommendationsById.set(exercise.id, recommendation)
    }
  }

  const reported = identifiedAreas.map(area => `${area.label}: ${area.answerLabel}`)
  return {
    recommendations: [...recommendationsById.values()],
    missingAnswers,
    identifiedAreas,
    areaResults,
    summary: `Recorded functional responses: ${reported.join('; ')}.`
  }
}
