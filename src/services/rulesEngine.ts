import { exercises } from '@/data/exercises'
import {
  assessmentQuestions,
  getAnswerLabel,
  type AssessmentFindings,
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

type AnswerRules = Record<AssessmentActivity, Partial<Record<AssessmentAnswer, number[]>>>

const exerciseIdsByAnswer: AnswerRules = {
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

const noMatchReasonByAnswer: Record<AssessmentActivity, Partial<Record<AssessmentAnswer, string>>> = {
  legMovement: {
    leg_independent: 'No matching leg-movement exercise is currently documented for this response.',
    leg_assistance: 'The catalogue has no documented assisted leg-movement protocol; the assessment does not identify which joint can move or how another person should assist.',
    leg_limited: 'The catalogue has no documented low-range protocol for a specific joint; this answer does not identify which part of the leg can move.',
    leg_unable: 'No passive or assisted movement protocol is documented for a person reporting no leg movement.'
  },
  standing: {
    standing_independent: 'No standing exercise is currently documented for this response.',
    standing_support: 'No standing exercise is currently documented for this response.',
    standing_assistance: 'The catalogue has no standing exercise with documented hands-on assistance requirements.',
    standing_unable: 'The available standing exercises require the ability to stand, including while holding stable support.'
  },
  walking: {
    walking_independent: 'No walking exercise is currently documented for this response.',
    walking_aid: 'No walking exercise with documented walking-aid requirements is currently matched to this response.',
    walking_assistance: 'No walking exercise with documented hands-on assistance requirements is currently matched to this response.',
    walking_unable: 'The catalogue has no non-walking exercise protocol mapped to a report of being unable to walk.'
  },
  sittingToStanding: {
    sit_to_stand_independent: 'No sit-to-stand exercise is currently documented for this response.',
    sit_to_stand_supported: 'No sit-to-stand exercise is currently documented for this response.',
    sit_to_stand_assistance: 'The existing chair-transfer protocol does not document another person physically helping the user to stand.',
    sit_to_stand_unable: 'No seated alternative is currently mapped; the existing chair-transfer protocol requires the ability to rise from the chair.'
  }
}

function supportsFunctionalRequirements(
  activity: AssessmentActivity,
  findings: AssessmentInput['findings'],
  answer: AssessmentAnswer
): boolean {
  if (activity === 'walking') {
    if (findings.standing === 'standing_unable') return false
    if (answer !== 'walking_assistance'
      && findings.standing !== 'standing_independent'
      && findings.standing !== 'standing_support') return false
  }
  if (activity === 'sittingToStanding'
    && (findings.standing === 'standing_assistance' || findings.standing === 'standing_unable')) return false
  return true
}

function getNoMatchReason(
  activity: AssessmentActivity,
  answer: AssessmentAnswer,
  hasRuleCandidates: boolean,
  findings: AssessmentInput['findings']
): string {
  if (activity === 'walking' && hasRuleCandidates && findings.standing === 'standing_unable') {
    return 'No walking exercise was recommended because the standing response reports inability to stand, which does not support the standing requirements of the walking exercises.'
  }
  if (activity === 'walking' && hasRuleCandidates
    && answer !== 'walking_assistance'
    && findings.standing === 'standing_assistance') {
    return 'No walking exercise was recommended because the standing response requires another person to stand; the matched walking records do not document that level of assistance.'
  }
  if (activity === 'sittingToStanding' && hasRuleCandidates
    && findings.standing === 'standing_unable') {
    return 'No sit-to-stand exercise was recommended because the standing response reports inability to stand.'
  }
  if (activity === 'sittingToStanding' && hasRuleCandidates
    && findings.standing === 'standing_assistance') {
    return 'No sit-to-stand exercise was recommended because the standing response requires another person to stand, while the existing chair-transfer protocol does not document that assistance.'
  }
  return noMatchReasonByAnswer[activity][answer]
    ?? `No documented exercise matches the recorded ${activity} response.`
}

export function validateAssessmentInput(input: AssessmentInput | null | undefined): string[] {
  return assessmentQuestions
    .filter(question => !question.options.some(option => option.value === input?.findings?.[question.key]))
    .map(question => question.question)
}

export function evaluateAssessment(input: AssessmentInput | null | undefined, exerciseCatalog: Exercise[] = exercises): AssessmentEvaluation {
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

    const ruleExerciseIds = exerciseIdsByAnswer[question.key][answer] ?? []
    const matches = exerciseCatalog.filter(exercise =>
      exercise.functionalAreas.includes(functionalAreaByActivity[question.key])
      && ruleExerciseIds.includes(exercise.id)
      && supportsFunctionalRequirements(question.key, input.findings, answer)
    )

    areaResults.push({
      activity: question.key,
      label: question.label,
      answer,
      reason: matches.length
        ? `${matches.length} exercise${matches.length === 1 ? '' : 's'} match the predefined ${question.label.toLowerCase()} rule.`
        : getNoMatchReason(question.key, answer, ruleExerciseIds.length > 0, input.findings),
      matchedCount: matches.length
    })

    for (const exercise of matches) {
      const recommendation = recommendationsById.get(exercise.id)
        ?? { exercise, reasons: [], matches: [] }
      const otherRequirements = question.key === 'walking'
        ? ' The standing response was also checked against the exercise requirements.'
        : ''
      recommendation.reasons.push(`The ${question.label.toLowerCase()} response "${answerLabel}" matches a predefined rule.${otherRequirements}`)
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
