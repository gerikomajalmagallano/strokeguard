import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import type { AssessmentResult, ExerciseSession } from '@/types'

export const useAppStore = defineStore('app', () => {
  const auth = useAuthStore()
  const assessments = ref<AssessmentResult[]>([])
  const sessions = ref<ExerciseSession[]>([])
  const loadError = ref('')
  const latestAssessment = computed(() => assessments.value[0] ?? null)
  const completedCount = computed(() => assessments.value.length)

  async function refresh() {
    const patientId = auth.profile?.id
    const userId = auth.profile?.userId
    if (!patientId || !userId) {
      assessments.value = []
      sessions.value = []
      loadError.value = ''
      return
    }

    assessments.value = []
    sessions.value = []
    loadError.value = ''
    try {
      const [nextAssessments, nextSessions] = await Promise.all([
        storage.getAssessments(patientId),
        storage.getSessions(patientId)
      ])
      assessments.value = nextAssessments
      sessions.value = nextSessions
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Patient records could not be loaded from Supabase.'
    }
  }

  async function saveAssessment(assessment: AssessmentResult) {
    await storage.saveAssessment(assessment)
    await refresh()
  }

  async function saveSession(session: ExerciseSession) {
    await storage.saveSession(session)
    await refresh()
  }

  return {
    assessments,
    sessions,
    loadError,
    latestAssessment,
    completedCount,
    refresh,
    saveAssessment,
    saveSession
  }
})
