<template>
  <section class="space-y-6">
    <div><p class="text-sm font-semibold uppercase tracking-wider text-blue-700">Exercise library</p><h1 class="mt-1 text-3xl font-bold">Exercise catalogue</h1><p class="mt-2 max-w-2xl text-slate-600">Items are grouped by functional area. Rule matching is separate from documentation completeness and does not establish that an exercise is personally suitable or safe.</p></div>
    <section v-for="group in exerciseGroups" :key="group.area" class="space-y-3">
      <h2 class="text-xl font-bold">{{ group.area }}</h2>
      <div v-if="group.exercises.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="exercise in group.exercises" :key="exercise.id" class="card flex flex-col">
          <div class="flex items-start justify-between gap-2"><span class="badge bg-slate-100 text-slate-700">{{ exercise.category }}</span><span class="badge bg-amber-50 text-amber-900">Documentation {{ getExerciseDocumentationGaps(exercise).length ? 'incomplete' : 'complete' }}</span></div>
          <h3 class="mt-3 text-lg font-bold">{{ exercise.name }}</h3>
          <p v-if="exercise.description" class="mt-3 text-sm leading-6 text-slate-600">{{ exercise.description }}</p>
          <p class="mt-3 flex-1 text-sm leading-6 text-slate-600">{{ exercise.functionalGoal }}</p>
          <p class="mt-3 text-xs leading-5 text-slate-600"><strong>Starting position:</strong> {{ exercise.startingPosition ?? 'Not documented.' }}</p>
          <p v-if="getExerciseDocumentationGaps(exercise).length" class="mt-2 text-xs leading-5 text-amber-900"><strong>Missing:</strong> {{ getExerciseDocumentationGaps(exercise).join(', ') }}.</p>
          <p class="mt-3 text-xs leading-5 text-slate-500"><strong>Safety:</strong> {{ exercise.safety ?? 'Not documented; professional review required.' }}</p>
          <p class="mt-2 text-xs leading-5 text-slate-500"><strong>Contraindications:</strong> {{ exercise.contraindications ?? 'Not documented.' }}</p>
          <p v-if="exercise.literatureReference" class="mt-2 text-xs leading-5 text-slate-500">{{ exercise.literatureReference }}</p>
          <a v-if="exercise.sourceUrl" class="mt-2 text-xs font-semibold text-blue-800 underline" :href="exercise.sourceUrl" target="_blank" rel="noreferrer">Open source</a>
          <RouterLink :to="`/exercise/${exercise.id}`" class="btn-secondary mt-4 w-full">View catalogue details</RouterLink>
        </article>
      </div>
      <p v-else class="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No exercise entries are currently listed for this functional area.</p>
    </section>
  </section>
</template>
<script setup lang="ts">
import { exercises } from '@/data/exercises'
import { getExerciseDocumentationGaps } from '@/services/exerciseDocumentation'
import type { FunctionalArea } from '@/types'

const functionalAreas: FunctionalArea[] = [
  'Leg movement',
  'Standing and balance',
  'Walking and gait',
  'Sit-to-stand and functional strengthening'
]
const exerciseGroups = functionalAreas.map(area => ({
  area,
  exercises: exercises.filter(exercise => exercise.functionalAreas.includes(area))
}))
</script>
