import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import type { AssessmentResult, ExerciseSession } from '@/types'

export const useAppStore = defineStore('app', () => {
  const auth = useAuthStore()
  const assessments = ref<AssessmentResult[]>([])
  const sessions = ref<ExerciseSession[]>([])
  const online = ref(navigator.onLine)
  const pendingCount = ref(0)
  const syncing = ref(false)
  const syncError = ref('')
  const loadError = ref('')
  const latestAssessment = computed(() => assessments.value[0] ?? null)
  const completedCount = computed(() => assessments.value.length)

  async function refresh() {
    const patientId = auth.profile?.id
    const userId = auth.profile?.userId
    if (!patientId || !userId) {
      assessments.value = []
      sessions.value = []
      pendingCount.value = 0
      return
    }

    loadError.value = ''
    try {
      if (online.value) assessments.value = await storage.getAssessments(patientId)
      else assessments.value = await storage.getCachedAssessments(patientId)
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Assessment history could not be refreshed.'
      try {
        assessments.value = await storage.getCachedAssessments(patientId)
      } catch (cacheError) {
        console.error('Unable to read encrypted patient history.', cacheError)
        assessments.value = []
      }
    }

    try {
      sessions.value = await storage.getSessions(patientId)
      pendingCount.value = await storage.getPendingCount(patientId)
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Encrypted offline data could not be loaded.'
      console.error('Unable to load encrypted patient data.', error)
    }
  }

  async function syncPending() {
    const patientId = auth.profile?.id
    if (!patientId || !online.value) {
      if (patientId) pendingCount.value = await storage.getPendingCount(patientId)
      return
    }

    if (syncing.value) return
    syncing.value = true
    syncError.value = ''
    try {
      const result = await storage.syncPendingAssessments(patientId)
      pendingCount.value = result.pending
      if (result.errors.length) syncError.value = result.errors.join(' ')
      await refresh()
    } catch (error) {
      syncError.value = error instanceof Error ? error.message : 'Pending assessments could not be synchronized.'
      console.error('Unable to synchronize pending assessments.', error)
    } finally {
      syncing.value = false
    }
  }

  async function saveAssessment(assessment: AssessmentResult) {
    auth.assertOfflineSession()
    const status = await storage.saveAssessment(assessment)
    pendingCount.value = await storage.getPendingCount(assessment.patientId)
    await refresh()
    return status
  }

  async function saveSession(session: ExerciseSession) {
    await storage.saveSession(session)
    await refresh()
  }

  function setOnline() {
    online.value = navigator.onLine
    if (online.value) void syncPending()
  }

  function startConnectivityMonitoring() {
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOnline)
    void refresh()
    if (online.value) void syncPending()
  }

  function stopConnectivityMonitoring() {
    window.removeEventListener('online', setOnline)
    window.removeEventListener('offline', setOnline)
  }

  return {
    assessments,
    sessions,
    online,
    pendingCount,
    syncing,
    syncError,
    loadError,
    latestAssessment,
    completedCount,
    refresh,
    syncPending,
    saveAssessment,
    saveSession,
    startConnectivityMonitoring,
    stopConnectivityMonitoring
  }
})
