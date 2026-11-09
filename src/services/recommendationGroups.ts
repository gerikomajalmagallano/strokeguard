import type { AssessmentActivity, Recommendation } from '@/types'

const dayAreas: Array<{ activity: AssessmentActivity; area: string }> = [
  { activity: 'legMovement', area: 'Leg Movement' },
  { activity: 'standing', area: 'Standing and Balance' },
  { activity: 'walking', area: 'Walking and Mobility' },
  { activity: 'sittingToStanding', area: 'Sit-to-Stand' }
]

export interface RecommendationGroup {
  day: number
  area: string
  items: Recommendation[]
}

export function groupRecommendationsByDay(recommendations: Recommendation[]): RecommendationGroup[] {
  const recommendationsByDay = new Map<number, RecommendationGroup>()
  const seenExerciseIds = new Set<number>()

  for (const recommendation of recommendations) {
    if (seenExerciseIds.has(recommendation.exercise.id)) continue
    const firstMatch = recommendation.matches[0]
    if (!firstMatch) continue

    const dayIndex = dayAreas.findIndex(({ activity }) => activity === firstMatch.activity)
    if (dayIndex < 0) continue

    const dayArea = dayAreas[dayIndex]
    if (!dayArea) continue

    const day = dayIndex + 1
    const group = recommendationsByDay.get(day) ?? {
      day,
      area: dayArea.area,
      items: []
    }
    group.items.push(recommendation)
    recommendationsByDay.set(day, group)
    seenExerciseIds.add(recommendation.exercise.id)
  }

  return [...recommendationsByDay.values()]
}
