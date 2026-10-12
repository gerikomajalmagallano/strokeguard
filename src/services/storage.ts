import type { AssessmentResult, ExerciseSession } from '@/types'
import type { UserProfile } from '@/types/auth'
import { exercises } from '@/data/exercises'
import { supabase, supabaseConfigured } from '@/services/supabase'

function requireOnlineSupabase() {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable/anon key.')
  }
  if (!navigator.onLine) {
    throw new Error('An internet connection is required to load or save patient records.')
  }
  return supabase
}

function fromDatabaseRow(row: any): AssessmentResult {
  const functional = Array.isArray(row.functional_assessments) ? row.functional_assessments[0] : row.functional_assessments
  const recommendations = (row.recommendations ?? []).flatMap((item: any) => {
    const exercise = exercises.find(candidate => candidate.id === item.exercise_id)
    return exercise ? [{
      exercise,
      reasons: [item.reason],
      priority: row.classification === 'Severe' ? 'High' as const :
        row.classification === 'Moderate' ? 'Medium' as const : 'Supportive' as const
    }] : []
  })
  return {
    id: row.id,
    patientId: row.patient_id,
    date: row.assessment_date,
    severity: row.classification,
    severityReason: row.classification_reason,
    input: {
      facial: { eyeAsymmetry: row.facial_eye, mouthAsymmetry: row.facial_mouth },
      functional: {
        upperLimb: functional?.upper_limb ?? 'Normal',
        lowerLimb: functional?.lower_limb ?? 'Normal',
        balance: functional?.balance ?? 'Normal',
        mobility: functional?.mobility ?? 'Independent'
      },
      notes: functional?.notes ?? row.notes ?? ''
    },
    recommendations
  }
}

export const storage = {
  async getAssessments(patientId: string): Promise<AssessmentResult[]> {
    const client = requireOnlineSupabase()
    const { data, error } = await client
      .from('assessments')
      .select('*, functional_assessments(*), recommendations(exercise_id, reason)')
      .eq('patient_id', patientId)
      .order('assessment_date', { ascending: false })
    if (error) throw error
    return (data ?? []).map(fromDatabaseRow)
  },

  async saveAssessment(assessment: AssessmentResult): Promise<void> {
    const client = requireOnlineSupabase()
    const { error } = await client.rpc('save_assessment', { assessment })
    if (error) throw error
  },

  async getSessions(patientId: string): Promise<ExerciseSession[]> {
    const client = requireOnlineSupabase()
    const { data, error } = await client
      .from('exercise_sessions')
      .select('id, patient_id, assessment_id, exercise_id, exercise_name, completed_at, feedback, notes')
      .eq('patient_id', patientId)
      .order('completed_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(row => ({
      id: row.id,
      patientId: row.patient_id,
      assessmentId: row.assessment_id ?? 'standalone',
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      completedAt: row.completed_at,
      feedback: row.feedback ?? undefined,
      notes: row.notes ?? undefined
    }))
  },

  async saveSession(session: ExerciseSession): Promise<void> {
    const client = requireOnlineSupabase()
    const { error } = await client.from('exercise_sessions').insert({
      id: session.id,
      patient_id: session.patientId,
      assessment_id: session.assessmentId === 'standalone' ? null : session.assessmentId,
      exercise_id: session.exerciseId,
      exercise_name: session.exerciseName,
      completed_at: session.completedAt,
      feedback: session.feedback ?? null,
      notes: session.notes ?? null
    })
    if (error) throw error
  },

  async updatePatientInfo(user: UserProfile, patient: { fullName: string; age: number; sex: string }): Promise<UserProfile> {
    const client = requireOnlineSupabase()
    const { data, error } = await client
      .from('patients')
      .upsert({ user_id: user.userId, full_name: patient.fullName, age: patient.age, sex: patient.sex }, { onConflict: 'user_id' })
      .select('id')
      .single()
    if (error) throw error
    return { ...user, ...patient, id: data.id, onboardingComplete: true }
  },

  async getPatient(userId: string, email: string): Promise<UserProfile> {
    const client = requireOnlineSupabase()
    const { data, error } = await client.from('patients')
      .select('id, full_name, age, sex')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return {
      id: data?.id ?? '',
      userId,
      fullName: data?.full_name ?? '',
      email,
      age: data?.age ?? null,
      sex: data?.sex ?? '',
      onboardingComplete: !!data
    }
  }
}
