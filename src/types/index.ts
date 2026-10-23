export type FindingAnswer = 'Normal' | 'No reported difficulty' | 'Mild difficulty' | 'Moderate difficulty' | 'Severe difficulty'
export type Difficulty = 'Easy' | 'Moderate' | 'Advanced'
export type ExerciseCategory = 'Range of Motion' | 'Strength' | 'Mobility'

export interface AssessmentFindings {
  legMovement: FindingAnswer | null
  standing: FindingAnswer | null
  walking: FindingAnswer | null
  sittingToStanding: FindingAnswer | null
}

export interface AssessmentInput {
  findings: AssessmentFindings
  notes?: string
}

export interface Exercise {
  id: number
  name: string
  category: ExerciseCategory
  targetArea: 'Lower Limb'
  difficulty: Difficulty
  duration: string
  repetitions: string
  instructions: string[]
  benefits: string
  safety: string
  source?: string
}

export interface RecommendationMatch {
  activity: keyof AssessmentFindings
  label: string
  answer: FindingAnswer
}

export interface Recommendation {
  exercise: Exercise
  reasons: string[]
  matches: RecommendationMatch[]
}

export interface AssessmentEvaluation {
  recommendations: Recommendation[]
  missingAnswers: string[]
  unmatchedFindings: Array<{ activity: string; answer: FindingAnswer }>
  noDifficultyReported: boolean
  summary: string
}

export interface AssessmentResult {
  id: string
  patientId: string
  date: string
  input: AssessmentInput
  recommendations: Recommendation[]
}

export interface ExerciseSession {
  id: string
  patientId: string
  assessmentId: string
  exerciseId: number
  exerciseName: string
  completedAt: string
  feedback?: 'Comfortable' | 'Slightly difficult' | 'Difficult'
  notes?: string
}
