export type LegMovementAnswer =
  | 'leg_independent'
  | 'leg_assistance'
  | 'leg_limited'
  | 'leg_unable'

export type StandingAnswer =
  | 'standing_independent'
  | 'standing_support'
  | 'standing_assistance'
  | 'standing_unable'

export type WalkingAnswer =
  | 'walking_independent'
  | 'walking_aid'
  | 'walking_assistance'
  | 'walking_unable'

export type SitToStandAnswer =
  | 'sit_to_stand_independent'
  | 'sit_to_stand_supported'
  | 'sit_to_stand_assistance'
  | 'sit_to_stand_unable'

export type AssessmentAnswer =
  | LegMovementAnswer
  | StandingAnswer
  | WalkingAnswer
  | SitToStandAnswer

export type AssessmentActivity = keyof AssessmentFindings
export type FunctionalArea =
  | 'Leg movement'
  | 'Standing and balance'
  | 'Walking and gait'
  | 'Sit-to-stand and functional strengthening'
export type Difficulty = 'Easy' | 'Moderate' | 'Advanced'
export type ExerciseCategory = 'Range of Motion' | 'Strength' | 'Mobility' | 'Balance' | 'Aerobic training'

export interface AssessmentFindings {
  legMovement: LegMovementAnswer | null
  standing: StandingAnswer | null
  walking: WalkingAnswer | null
  sittingToStanding: SitToStandAnswer | null
}

export interface AssessmentOption {
  value: AssessmentAnswer
  label: string
}

export interface AssessmentQuestion {
  key: AssessmentActivity
  label: string
  question: string
  options: AssessmentOption[]
}

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    key: 'legMovement',
    label: 'Leg movement',
    question: 'Can you move your affected leg while sitting or lying down?',
    options: [
      { value: 'leg_independent', label: 'I can move my leg independently.' },
      { value: 'leg_assistance', label: 'I can move my leg, but I need some assistance.' },
      { value: 'leg_limited', label: 'I can move my leg only a little.' },
      { value: 'leg_unable', label: 'I cannot move my leg.' }
    ]
  },
  {
    key: 'standing',
    label: 'Standing',
    question: 'Can you stand up and maintain a standing position?',
    options: [
      { value: 'standing_independent', label: 'I can stand independently without support.' },
      { value: 'standing_support', label: 'I can stand while holding a stable support.' },
      { value: 'standing_assistance', label: "I need another person's assistance to stand." },
      { value: 'standing_unable', label: 'I cannot stand, even with assistance.' }
    ]
  },
  {
    key: 'walking',
    label: 'Walking',
    question: 'How do you currently move when walking?',
    options: [
      { value: 'walking_independent', label: 'I can walk independently without assistance.' },
      { value: 'walking_aid', label: 'I can walk using a walking aid (e.g., cane or walker).' },
      { value: 'walking_assistance', label: "I need another person's assistance when walking." },
      { value: 'walking_unable', label: 'I cannot walk at the moment.' }
    ]
  },
  {
    key: 'sittingToStanding',
    label: 'Sit-to-stand',
    question: 'Can you get up from a chair into a standing position?',
    options: [
      { value: 'sit_to_stand_independent', label: 'I can get up independently without using my hands.' },
      { value: 'sit_to_stand_supported', label: 'I can get up independently but need to use my hands or chair for support.' },
      { value: 'sit_to_stand_assistance', label: "I need another person's assistance to get up." },
      { value: 'sit_to_stand_unable', label: 'I cannot get up from a chair.' }
    ]
  }
]

export const assessmentDisclaimer =
  'These questions collect self-reported functional information. They are not a clinically validated assessment instrument and do not establish a diagnosis or determine clinical safety.'

export function getAnswerLabel(activity: AssessmentActivity, answer: AssessmentAnswer | null): string {
  if (!answer) return 'Not available in this historical record'
  const question = assessmentQuestions.find(item => item.key === activity)
  return question?.options.find(option => option.value === answer)?.label
    ?? 'Not available in this historical record'
}

export function isAssessmentAnswer<Activity extends AssessmentActivity>(
  activity: Activity,
  value: unknown
): value is Exclude<AssessmentFindings[Activity], null> {
  const question = assessmentQuestions.find(item => item.key === activity)
  return typeof value === 'string' && !!question?.options.some(option => option.value === value)
}

export interface AssessmentInput {
  findings: AssessmentFindings
  additionalNotes?: string
}

export interface Exercise {
  id: number
  name: string
  description?: string | null
  category: ExerciseCategory
  functionalAreas: FunctionalArea[]
  targetArea: string
  startingPosition?: string | null
  difficulty: Difficulty | null
  duration: string | null
  repetitions: string | null
  instructions: string[]
  functionalGoal: string
  safety: string | null
  equipmentOrSupport: string | null
  assistanceRequirements: string | null
  contraindications?: string | null
  eligibilityStatus: 'review_required' | 'eligible'
  eligibilityRequirements: Partial<Record<AssessmentActivity, AssessmentAnswer[]>> | null
  literatureReference?: string
  sourceUrl?: string | null
  strokePhaseApplicability?: string | null
}

export interface RecommendationMatch {
  activity: AssessmentActivity
  label: string
  answer: AssessmentAnswer
}

export interface Recommendation {
  exercise: Exercise
  reasons: string[]
  matches: RecommendationMatch[]
}

export interface AssessmentEvaluation {
  recommendations: Recommendation[]
  missingAnswers: string[]
  identifiedAreas: Array<{
    activity: AssessmentActivity
    label: string
    answer: AssessmentAnswer
    answerLabel: string
  }>
  areaResults: Array<{
    activity: AssessmentActivity
    label: string
    answer: AssessmentAnswer
    reason: string
    matchedCount: number
    rule: string
    compatibilityConditions: string[]
    matchedExercises: Array<{
      id: number
      name: string
      documentationStatus: string
    }>
    excludedExercises: Array<{
      id: number
      name: string
      reason: string
      documentationStatus: string
    }>
    missingEvidence: string | null
  }>
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
