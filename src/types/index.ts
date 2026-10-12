export type Severity = 'Normal' | 'Mild' | 'Moderate' | 'Severe'
export type Difficulty = 'Easy' | 'Moderate' | 'Advanced'
export type ExerciseCategory = 'Range of Motion' | 'Strength' | 'Balance' | 'Mobility'
export type MobilityLevel = 'Independent' | 'Needs assistance' | 'Unable'

export interface FunctionalFindings {
  upperLimb: Severity
  lowerLimb: Severity
  balance: Severity
  mobility: MobilityLevel
}

export interface FacialFindings {
  eyeAsymmetry: Severity
  mouthAsymmetry: Severity
}

export interface AssessmentInput {
  facial: FacialFindings
  functional: FunctionalFindings
  notes?: string
}

export interface Exercise {
  id: number
  name: string
  category: ExerciseCategory
  targetArea: string
  difficulty: Difficulty
  duration: string
  repetitions: string
  instructions: string[]
  benefits: string
  safety: string
}

export interface Recommendation {
  exercise: Exercise
  reasons: string[]
  priority: 'High' | 'Medium' | 'Supportive'
}

export interface AssessmentResult {
  id: string
  patientId: string
  date: string
  input: AssessmentInput
  severity: Severity
  severityReason: string
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
