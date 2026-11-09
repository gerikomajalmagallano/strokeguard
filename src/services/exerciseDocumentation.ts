import type { Exercise } from '@/types'

export function getExerciseDocumentationGaps(exercise: Exercise): string[] {
  const fields: Array<[boolean, string]> = [
    [!exercise.description, 'description'],
    [!exercise.startingPosition, 'starting position'],
    [!exercise.instructions.length, 'step-by-step instructions'],
    [!exercise.functionalGoal, 'functional goal'],
    [!exercise.difficulty, 'difficulty'],
    [!exercise.duration, 'duration'],
    [!exercise.repetitions, 'repetitions'],
    [!exercise.equipmentOrSupport, 'equipment or support'],
    [!exercise.assistanceRequirements, 'assistance requirements'],
    [!exercise.safety, 'safety precautions'],
    [!exercise.contraindications, 'contraindications'],
    [!exercise.strokePhaseApplicability, 'stroke phase applicability'],
    [!exercise.literatureReference, 'literature reference'],
    [!exercise.sourceUrl, 'source URL']
  ]

  return fields.filter(([isMissing]) => isMissing).map(([, label]) => label)
}
