<template>
  <section v-if="exercise" class="mx-auto max-w-3xl space-y-5">
    <RouterLink :to="isSession ? `/exercise/${exercise.id}` : '/recommendations'" class="text-sm font-semibold text-blue-800">Back</RouterLink>
    <div class="card">
      <p v-if="isSession" class="text-sm font-semibold text-blue-800">Exercise 1 of 1</p>
      <div class="mt-2 flex flex-wrap items-start justify-between gap-4"><div><span class="badge bg-blue-50 text-blue-800">{{ exercise.category }}</span><h1 class="mt-2 text-3xl font-bold">{{ exercise.name }}</h1><p class="mt-1 text-sm text-slate-600">{{ exercise.targetArea }} · {{ exercise.difficulty }}</p></div><div class="rounded-xl bg-slate-50 px-4 py-3"><p class="text-xs text-slate-500">Repetitions</p><p class="mt-1 font-semibold">{{ exercise.repetitions }}</p></div></div>
      <div class="mt-5 grid gap-3 sm:grid-cols-2"><div class="rounded-xl bg-slate-50 p-4"><p class="text-xs font-semibold uppercase text-slate-500">Sets</p><p class="mt-1 font-semibold">1 set</p></div><div class="rounded-xl bg-slate-50 p-4"><p class="text-xs font-semibold uppercase text-slate-500">Purpose</p><p class="mt-1 text-sm leading-5">{{ exercise.benefits }}</p></div></div>
    </div>
    <div class="card"><h2 class="text-xl font-bold">{{ isSession ? 'Current exercise instructions' : 'Step-by-step instructions' }}</h2><ol class="mt-4 space-y-3"><li v-for="(instruction, index) in exercise.instructions" :key="instruction" class="flex gap-3"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{{ index + 1 }}</span><span class="pt-1 text-sm leading-6 text-slate-700">{{ instruction }}</span></li></ol></div>
    <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 class="font-bold text-amber-900">Safety reminder</h2><p class="mt-2 text-sm leading-6 text-amber-900">{{ exercise.safety }} Stop the exercise if you experience pain, dizziness, or unusual discomfort. Exercise guidance from this research prototype does not replace professional medical advice.</p></div>
    <div v-if="isSession" class="card">
      <p class="text-sm text-slate-600">Progress</p><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full w-full bg-teal-700"></div></div>
      <p v-if="saveError" role="alert" class="mt-3 text-sm text-red-700">{{ saveError }}</p>
      <div v-if="completed" class="mt-4"><p class="font-semibold text-teal-800">Exercise completed and saved.</p><RouterLink to="/history" class="btn-primary mt-4">View history</RouterLink></div>
      <button v-else class="btn-primary mt-4 w-full py-3" :disabled="saving" @click="completeExercise">{{ saving ? 'Saving…' : 'Complete Exercise' }}</button>
    </div>
    <RouterLink v-else :to="`/exercise/${exercise.id}/session`" class="btn-primary w-full py-3">Start Exercise</RouterLink>
  </section>
  <section v-else class="card text-center"><h1 class="text-2xl font-bold">Exercise not found</h1><RouterLink to="/exercises" class="btn-primary mt-5">Exercise library</RouterLink></section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { exercises } from '@/data/exercises'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const store = useAppStore()
const auth = useAuthStore()
const exercise = exercises.find(item => item.id === Number(route.params.id))
const isSession = computed(() => route.path.endsWith('/session'))
const saving = ref(false)
const completed = ref(false)
const saveError = ref('')

async function completeExercise() {
  if (!exercise || !auth.profile?.id) return
  saving.value = true
  saveError.value = ''
  try {
    await store.saveSession({ id: crypto.randomUUID(), patientId: auth.profile.id, assessmentId: store.latestAssessment?.id ?? 'standalone', exerciseId: exercise.id, exerciseName: exercise.name, completedAt: new Date().toISOString() })
    completed.value = true
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Session could not be saved.'
  } finally {
    saving.value = false
  }
}
</script>
