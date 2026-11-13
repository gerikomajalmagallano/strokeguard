import { supabase, supabaseConfigured } from '@/services/supabase'
import {
  assessmentQuestions,
  isAssessmentAnswer,
  type AssessmentActivity,
  type AssessmentAnswer,
  type Difficulty,
  type Exercise,
  type ExerciseCategory,
  type FunctionalArea
} from '@/types'

const exerciseCategories: ExerciseCategory[] = [
  'Range of Motion',
  'Strength',
  'Mobility',
  'Balance',
  'Aerobic training'
]

const functionalAreas: FunctionalArea[] = [
  'Leg movement',
  'Standing and balance',
  'Walking and gait',
  'Sit-to-stand and functional strengthening'
]

const difficulties: Difficulty[] = ['Easy', 'Moderate', 'Advanced']

type ExerciseRow = Record<string, unknown>

function isExerciseCategory(value: string): value is ExerciseCategory {
  return exerciseCategories.some(category => category === value)
}

function isFunctionalArea(value: string): value is FunctionalArea {
  return functionalAreas.some(area => area === value)
}

function isDifficulty(value: string): value is Difficulty {
  return difficulties.some(difficulty => difficulty === value)
}

function isRecord(value: unknown): value is ExerciseRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(row: ExerciseRow, field: string): string {
  const value = row[field]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Exercise catalogue returned an invalid "${field}" value.`)
  }
  return value
}

function nullableString(row: ExerciseRow, field: string): string | null {
  const value = row[field]
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new Error(`Exercise catalogue returned an invalid "${field}" value.`)
  }
  return value
}

function stringArray(row: ExerciseRow, field: string): string[] {
  const value = row[field]
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error(`Exercise catalogue returned an invalid "${field}" value.`)
  }
  return value
}

function parseEligibilityRequirements(
  value: unknown
): Partial<Record<AssessmentActivity, AssessmentAnswer[]>> | null {
  if (value === null || value === undefined) return null
  if (!isRecord(value)) {
    throw new Error('Exercise catalogue returned invalid eligibility requirements.')
  }

  const requirements: Partial<Record<AssessmentActivity, AssessmentAnswer[]>> = {}
  for (const [key, answers] of Object.entries(value)) {
    const question = assessmentQuestions.find(item => item.key === key)
    if (!question || !Array.isArray(answers) || !answers.every(answer => isAssessmentAnswer(question.key, answer))) {
      throw new Error('Exercise catalogue returned invalid eligibility requirements.')
    }
    requirements[question.key] = answers
  }
  return requirements
}

function parseExercise(row: unknown): Exercise {
  if (!isRecord(row)) throw new Error('Exercise catalogue returned an invalid record.')

  const id = row.id
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    throw new Error('Exercise catalogue returned an invalid exercise ID.')
  }

  const category = requiredString(row, 'category')
  if (!isExerciseCategory(category)) {
    throw new Error(`Exercise ${id} has an unsupported category.`)
  }

  const rawFunctionalAreas = stringArray(row, 'functional_areas')
  const parsedFunctionalAreas = rawFunctionalAreas.map(area => {
    if (!isFunctionalArea(area)) throw new Error(`Exercise ${id} has an unsupported functional area.`)
    return area
  })

  const difficultyValue = nullableString(row, 'difficulty')
  if (difficultyValue !== null && !isDifficulty(difficultyValue)) {
    throw new Error(`Exercise ${id} has an unsupported difficulty value.`)
  }

  const eligibilityStatus = requiredString(row, 'eligibility_status')
  if (eligibilityStatus !== 'eligible' && eligibilityStatus !== 'review_required') {
    throw new Error(`Exercise ${id} has an unsupported eligibility status.`)
  }

  const instructions = stringArray(row, 'instructions')
  const safetyNotes = nullableString(row, 'safety_notes')

  return {
    id,
    name: requiredString(row, 'name'),
    description: nullableString(row, 'description'),
    category,
    functionalAreas: parsedFunctionalAreas,
    targetArea: requiredString(row, 'target_area'),
    startingPosition: nullableString(row, 'starting_position'),
    difficulty: difficultyValue,
    duration: nullableString(row, 'duration'),
    repetitions: nullableString(row, 'repetitions'),
    instructions,
    functionalGoal: requiredString(row, 'purpose'),
    safety: safetyNotes,
    equipmentOrSupport: nullableString(row, 'equipment_or_support'),
    assistanceRequirements: nullableString(row, 'assistance_requirements'),
    contraindications: nullableString(row, 'contraindications'),
    eligibilityStatus,
    eligibilityRequirements: parseEligibilityRequirements(row.eligibility_requirements),
    literatureReference: nullableString(row, 'literature_reference') ?? undefined,
    sourceUrl: nullableString(row, 'source_url'),
    strokePhaseApplicability: nullableString(row, 'stroke_phase_applicability')
  }
}

export async function fetchExerciseCatalog(): Promise<Exercise[]> {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable/anon key.')
  }
  if (!navigator.onLine) {
    throw new Error('An internet connection is required to load the exercise catalogue.')
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!sessionData.session) {
    throw new Error('Sign in to load the exercise catalogue.')
  }

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('id')
  if (error) throw error
  if (!Array.isArray(data)) {
    throw new Error('Supabase returned an invalid exercise catalogue response.')
  }

  return data.map(parseExercise)
}
