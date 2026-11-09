<template>
  <section v-if="exercise" class="mx-auto max-w-3xl space-y-5">
    <RouterLink :to="isSession ? `/exercise/${exercise.id}` : '/recommendations'" class="text-sm font-semibold text-blue-800">Back</RouterLink>
    <div class="card">
      <div class="mt-2"><span class="badge bg-blue-50 text-blue-800">{{ exercise.category }}</span><h1 class="mt-2 text-3xl font-bold">{{ exercise.name }}</h1><p class="mt-1 text-sm text-slate-600">{{ exercise.targetArea }}</p></div>
      <p v-if="exercise.description" class="mt-4 text-sm leading-6 text-slate-700">{{ exercise.description }}</p>
      <p class="mt-4 text-sm leading-6 text-slate-700"><strong>Functional goal:</strong> {{ exercise.functionalGoal }}</p>
      <p class="mt-2 text-sm text-slate-700"><strong>Starting position:</strong> {{ exercise.startingPosition ?? 'Not documented.' }}</p>
      <p class="mt-2 text-sm text-slate-700"><strong>Difficulty:</strong> {{ exercise.difficulty ?? 'Not documented.' }} <span class="mx-1">·</span><strong>Duration:</strong> {{ exercise.duration ?? 'Not documented.' }} <span class="mx-1">·</span><strong>Repetitions:</strong> {{ exercise.repetitions ?? 'Not documented.' }}</p>
      <p class="mt-2 text-sm text-slate-700"><strong>Equipment or support:</strong> {{ exercise.equipmentOrSupport ?? 'Not documented in the current catalogue.' }}</p>
      <p class="mt-2 text-sm text-slate-700"><strong>Assistance:</strong> {{ exercise.assistanceRequirements ?? 'Not documented in the current catalogue.' }}</p>
      <p class="mt-3 text-sm text-amber-900">Catalogue documentation status: {{ documentationGaps.length ? `Incomplete. Missing: ${documentationGaps.join(', ')}.` : 'Complete.' }} This is separate from rule matching and is not an individualized safety or suitability assessment.</p>
    </div>
    <div class="card"><h2 class="text-xl font-bold">Existing catalogue instructions</h2><ol v-if="exercise.instructions.length" class="mt-4 space-y-3"><li v-for="(instruction, index) in exercise.instructions" :key="instruction" class="flex gap-3"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{{ index + 1 }}</span><span class="pt-1 text-sm leading-6 text-slate-700">{{ instruction }}</span></li></ol><p v-else class="mt-3 text-sm text-amber-800">No exercise protocol is documented. Professional review is required before this catalogue item can be used.</p></div>
    <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 class="font-bold text-amber-900">Available safety information</h2><p class="mt-2 text-sm leading-6 text-amber-900">{{ exercise.safety ?? 'Safety precautions are not documented; professional review is required.' }}</p><p class="mt-2 text-sm text-amber-900"><strong>Contraindications:</strong> {{ exercise.contraindications ?? 'Not documented in the current catalogue.' }}</p><p class="mt-2 text-sm text-amber-900"><strong>Stroke phase applicability:</strong> {{ exercise.strokePhaseApplicability ?? 'Not documented.' }}</p><p class="mt-2 text-sm text-amber-900"><strong>Literature reference:</strong> {{ exercise.literatureReference ?? 'No literature reference is recorded.' }}</p><a v-if="exercise.sourceUrl" class="mt-2 inline-block text-sm font-semibold text-blue-800 underline" :href="exercise.sourceUrl" target="_blank" rel="noreferrer">Open source</a></div>
    <div v-if="isSession && exercise.eligibilityStatus === 'eligible'" class="card">
      <p class="text-sm text-slate-600">Progress</p><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full w-full bg-teal-700"></div></div>
      <p v-if="saveError" role="alert" class="mt-3 text-sm text-red-700">{{ saveError }}</p>
      <div v-if="completed" class="mt-4"><p class="font-semibold text-teal-800">Exercise completed and saved.</p><RouterLink to="/history" class="btn-primary mt-4">View history</RouterLink></div>
      <button v-else class="btn-primary mt-4 w-full py-3" :disabled="saving" @click="completeExercise">{{ saving ? 'Saving…' : 'Complete Exercise' }}</button>
    </div>
    <p v-else-if="isSession" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">A guided exercise session is unavailable because eligibility has not been reviewed.</p>
    <RouterLink v-else-if="exercise.eligibilityStatus === 'eligible'" :to="`/exercise/${exercise.id}/session`" class="btn-primary w-full py-3">Start Exercise</RouterLink>
  </section>
  <section v-else class="card text-center"><h1 class="text-2xl font-bold">Exercise not found</h1><RouterLink to="/exercises" class="btn-primary mt-5">Exercise library</RouterLink></section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { exercises } from '@/data/exercises'
import { getExerciseDocumentationGaps } from '@/services/exerciseDocumentation'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const store = useAppStore()
const auth = useAuthStore()
const exercise = exercises.find(item => item.id === Number(route.params.id))
const documentationGaps = exercise ? getExerciseDocumentationGaps(exercise) : []
const isSession = computed(() => route.path.endsWith('/session'))
const saving = ref(false)
const completed = ref(false)
const saveError = ref('')

async function completeExercise() {
  if (!exercise || exercise.eligibilityStatus !== 'eligible' || !auth.profile?.id) return
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
