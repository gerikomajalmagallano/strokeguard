import { exercises } from '@/data/exercises'
import type { AssessmentEvaluation, AssessmentFindings, AssessmentInput, FindingAnswer, Recommendation } from '@/types'

const activities: Array<{ key: keyof AssessmentFindings; label: string; question: string }> = [
  { key: 'legMovement', label: 'Leg movement', question: 'How would you describe the difficulty moving the affected leg?' },
  { key: 'standing', label: 'Standing', question: 'How would you describe the difficulty maintaining a standing position?' },
  { key: 'walking', label: 'Walking', question: 'How would you describe the difficulty walking?' },
  { key: 'sittingToStanding', label: 'Sitting to standing', question: 'How would you describe the difficulty rising from a chair?' }
]

const acceptedAnswers: FindingAnswer[] = [
  'Normal',
  'No reported difficulty',
  'Mild difficulty',
  'Moderate difficulty',
  'Severe difficulty'
]

const activityTerms: Record<keyof AssessmentFindings, string[]> = {
  legMovement: ['ankle', 'dorsiflexion', 'leg cycling'],
  standing: ['stand'],
  walking: ['walk'],
  sittingToStanding: ['sit-to-stand', 'rising from a chair']
}

function exerciseText(exercise: Recommendation['exercise']): string {
  return [exercise.name, exercise.benefits, ...exercise.instructions].join(' ').toLowerCase()
}

function matchesActivity(exercise: Recommendation['exercise'], activity: keyof AssessmentFindings): boolean {
  if (exercise.targetArea !== 'Lower Limb') return false

  const text = exerciseText(exercise)
  if (activity === 'standing' && /sit.to.stand/.test(exercise.name.toLowerCase())) return false
  return activityTerms[activity].some(term => text.includes(term))
}

function isNoDifficulty(answer: FindingAnswer): boolean {
  return answer === 'Normal' || answer === 'No reported difficulty'
}

export function validateAssessmentInput(input: AssessmentInput | null | undefined): string[] {
  return activities
    .filter(activity => !acceptedAnswers.includes(input?.findings?.[activity.key] as FindingAnswer))
    .map(activity => activity.question)
}

export function evaluateAssessment(input: AssessmentInput | null | undefined, exerciseCatalog = exercises): AssessmentEvaluation {
  const missingAnswers = validateAssessmentInput(input)
  if (missingAnswers.length) {
    return {
      recommendations: [],
      missingAnswers,
      unmatchedFindings: [],
      noDifficultyReported: false,
      summary: 'Complete all four required answers to summarize findings and evaluate exercise rules.'
    }
  }

  const recommendationsById = new Map<number, Recommendation>()
  const unmatchedFindings: AssessmentEvaluation['unmatchedFindings'] = []

  for (const activity of activities) {
    const answer = input?.findings?.[activity.key] as FindingAnswer
    if (isNoDifficulty(answer)) continue

    const matches = exerciseCatalog.filter(exercise => matchesActivity(exercise, activity.key))
    if (!matches.length) {
      unmatchedFindings.push({ activity: activity.label, answer })
      continue
    }

    for (const exercise of matches) {
      const recommendation = recommendationsById.get(exercise.id) ?? { exercise, reasons: [], matches: [] }
      recommendation.reasons.push(`Matches the ${activity.label.toLowerCase()} finding (${answer}) because the exercise's name, instructions, or stated benefit refers to this activity.`)
      recommendation.matches.push({ activity: activity.key, label: activity.label, answer })
      recommendationsById.set(exercise.id, recommendation)
    }
  }

  const recommendations = [...recommendationsById.values()]
  const reported = activities.flatMap(activity => {
    const answer = input?.findings?.[activity.key] as FindingAnswer
    return isNoDifficulty(answer) ? [] : [`${activity.label}: ${answer}`]
  })
  const noDifficultyReported = reported.length === 0

  return {
    recommendations,
    missingAnswers,
    unmatchedFindings,
    noDifficultyReported,
    summary: noDifficultyReported
      ? 'No difficulty was reported for any of the four lower-limb activities.'
      : `Reported difficulties: ${reported.join('; ')}.`
  }
}
