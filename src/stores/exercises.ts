import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchExerciseCatalog } from '@/services/exerciseService'
import type { Exercise } from '@/types'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The exercise catalogue could not be loaded from Supabase.'
}

export const useExerciseStore = defineStore('exercises', () => {
  const catalogue = ref<Exercise[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  let pendingRequest: Promise<Exercise[]> | null = null

  function load(): Promise<Exercise[]> {
    if (loaded.value) return Promise.resolve(catalogue.value)
    if (pendingRequest) return pendingRequest

    loading.value = true
    error.value = ''
    pendingRequest = fetchExerciseCatalog()
      .then(exercises => {
        catalogue.value = exercises
        loaded.value = true
        return exercises
      })
      .catch(loadError => {
        error.value = errorMessage(loadError)
        throw loadError
      })
      .finally(() => {
        loading.value = false
        pendingRequest = null
      })

    return pendingRequest
  }

  return { catalogue, loading, loaded, error, load }
})
