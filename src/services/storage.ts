import type { AssessmentResult, ExerciseSession } from '@/types'
import type { UserProfile } from '@/types/auth'
import { exercises } from '@/data/exercises'
import { offlineDb } from '@/services/offlineDb'
import { supabase, supabaseConfigured } from '@/services/supabase'

function isConnectivityError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: string; message?: string; cause?: unknown }
  return candidate.name?.includes('FetchError') === true ||
    /network|fetch failed|failed to fetch|connection/i.test(candidate.message ?? '') ||
    (candidate.cause !== undefined && isConnectivityError(candidate.cause))
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
    recommendations,
    syncStatus: 'synced'
  }
}

async function writeAssessment(assessment: AssessmentResult): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Configure the Supabase URL and publishable/anon key before saving assessments.')
  }
  const { error } = await supabase.rpc('save_assessment_offline', { assessment })
  if (error) throw error
}

export const storage = {
  initializeSecureCache: (userId: string) => offlineDb.initializeSession(userId),
  getCachedProfile: (userId: string) => offlineDb.getProfile(userId),
  cacheProfile: (profile: UserProfile) => offlineDb.cacheProfile(profile),
  clearPatientData: (userId: string, patientId?: string) => offlineDb.clearPatientData(userId, patientId),
  migrateLegacySessions: (patientId: string) => offlineDb.migrateLegacySessions(patientId),

  async getCachedAssessments(patientId: string): Promise<AssessmentResult[]> {
    return offlineDb.getAssessments(patientId)
  },

  async getAssessments(patientId: string): Promise<AssessmentResult[]> {
    if (!supabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Assessment history is available only from this device cache.')
    }

    const { data, error } = await supabase
      .from('assessments')
      .select('*, functional_assessments(*), recommendations(exercise_id, reason)')
      .eq('patient_id', patientId)
      .order('assessment_date', { ascending: false })
    if (error) throw error

    const synced = (data ?? []).map(fromDatabaseRow)
    const pending = await offlineDb.getPendingAssessments(patientId)
    const combined = new Map<string, AssessmentResult>()
    for (const assessment of [...synced, ...pending]) combined.set(assessment.id, assessment)
    const assessments = [...combined.values()].sort((a, b) => b.date.localeCompare(a.date))
    await Promise.all(synced.map(assessment => offlineDb.cacheAssessment(assessment)))
    return assessments
  },

  async saveAssessment(assessment: AssessmentResult): Promise<'synced' | 'pending'> {
    if (!supabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Sign-in and assessment saving require the Supabase project.')
    }
    if (!navigator.onLine) {
      await offlineDb.queueAssessment(assessment)
      return 'pending'
    }

    try {
      await writeAssessment(assessment)
      await offlineDb.markAssessmentSynced(assessment)
      return 'synced'
    } catch (error) {
      if (!isConnectivityError(error)) throw error
      await offlineDb.queueAssessment(assessment)
      return 'pending'
    }
  },

  async getPendingCount(patientId: string): Promise<number> {
    return (await offlineDb.getPendingAssessments(patientId)).length
  },

  async syncPendingAssessments(patientId: string): Promise<{ synced: number; pending: number; errors: string[] }> {
    if (!supabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Pending assessments cannot be synchronized.')
    }
    if (!navigator.onLine) {
      return { synced: 0, pending: await this.getPendingCount(patientId), errors: [] }
    }

    const pending = await offlineDb.getPendingAssessments(patientId)
    const errors: string[] = []
    let synced = 0
    for (const assessment of pending) {
      try {
        await writeAssessment(assessment)
        await offlineDb.markAssessmentSynced(assessment)
        synced += 1
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'An assessment could not be synchronized.')
      }
    }
    return { synced, pending: await this.getPendingCount(patientId), errors }
  },

  getSessions: (patientId: string) => offlineDb.getSessions(patientId),
  saveSession: (session: ExerciseSession) => offlineDb.saveSession(session)
}
