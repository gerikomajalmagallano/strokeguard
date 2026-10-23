<template>
  <section v-if="assessment" class="mx-auto max-w-4xl space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm font-semibold uppercase text-blue-700">Research-prototype decision support</p>
        <h1 class="mt-1 text-3xl font-bold">Suggested lower-limb exercise plan</h1>
        <p class="mt-2 text-sm text-slate-600">Based on the four reported findings from {{ formatDate(assessment.date) }}.</p>
      </div>
      <RouterLink to="/assessment" class="btn-secondary">New assessment</RouterLink>
    </header>

    <article class="card">
      <h2 class="text-lg font-bold">Reported findings</h2>
      <p class="mt-2 text-sm text-slate-600">{{ evaluation.summary }}</p>
      <p v-if="evaluation.missingAnswers.length" class="mt-3 text-sm text-amber-800">This historical record is missing one or more of the four answers, so its exercise rules cannot be re-evaluated.</p>
      <p class="mt-3 text-sm leading-6 text-slate-600">Exercises are grouped by the reported activity that matched them, not assigned to specific days. The available exercise records do not provide a supported daily schedule or frequency; follow any existing repetition and duration details only as catalogue information, not as a personalized prescription.</p>
    </article>

    <p v-if="evaluation.missingAnswers.length && assessment.recommendations.length" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">The saved recommendations predate the four-question form and were not re-evaluated by the current rules.</p>
    <div v-if="assessment.recommendations.length" class="space-y-4">
      <article v-for="recommendation in assessment.recommendations" :key="recommendation.exercise.id" class="card">
        <div>
          <span class="badge bg-blue-50 text-blue-800">{{ recommendation.exercise.category }}</span>
          <h2 class="mt-2 text-xl font-bold">{{ recommendation.exercise.name }}</h2>
          <p class="mt-1 text-sm text-slate-600">{{ recommendation.exercise.targetArea }} · {{ recommendation.exercise.difficulty }}</p>
          <p class="mt-3 text-sm text-slate-600">{{ recommendation.exercise.benefits }}</p>
          <div v-if="recommendation.matches.length" class="mt-3 flex flex-wrap gap-2">
            <span v-for="match in recommendation.matches" :key="`${match.activity}-${match.answer}`" class="badge bg-teal-50 text-teal-800">{{ match.label }}: {{ match.answer }}</span>
          </div>
        </div>
        <div class="mt-4">
          <h3 class="text-sm font-semibold">Existing instructions</h3>
          <ol class="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600">
            <li v-for="instruction in recommendation.exercise.instructions" :key="instruction">{{ instruction }}</li>
          </ol>
        </div>
        <div class="mt-4 rounded-xl bg-slate-50 p-4">
          <h3 class="text-sm font-semibold">Why this recommendation?</h3>
          <p v-for="reason in recommendation.reasons" :key="reason" class="mt-1 text-sm text-slate-600">{{ reason }}</p>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-slate-500">{{ recommendation.exercise.repetitions }} · {{ recommendation.exercise.duration }}</p>
          <RouterLink :to="`/exercise/${recommendation.exercise.id}`" class="btn-primary">View exercise</RouterLink>
        </div>
        <p class="mt-3 text-sm leading-5 text-amber-900"><strong>Safety:</strong> {{ recommendation.exercise.safety }}</p>
        <p class="mt-2 text-xs leading-5 text-slate-500"><strong>Source/reference:</strong> {{ recommendation.exercise.source ?? 'No source is recorded in the current exercise library.' }}</p>
      </article>
    </div>
    <article v-else-if="evaluation.noDifficultyReported" class="card">
      <h2 class="font-bold">No exercise recommendation generated</h2>
      <p class="mt-2 text-sm text-slate-600">No difficulty was reported for any of the four activities, so the rules generated no exercise recommendation.</p>
    </article>
    <article v-else-if="evaluation.missingAnswers.length" class="card">
      <h2 class="font-bold">Unable to evaluate recommendations</h2>
      <p class="mt-2 text-sm text-slate-600">All four answers are required. No exercise was generated for this incomplete historical record.</p>
    </article>
    <article v-else class="card">
      <h2 class="font-bold">No matching exercise available</h2>
      <p class="mt-2 text-sm text-slate-600">The existing lower-limb exercise library does not support a matching recommendation for {{ evaluation.unmatchedFindings.map(item => item.activity).join(', ') }}. No substitute exercise was invented.</p>
    </article>
    <p class="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">StrokeGuard provides research-prototype decision support, not a day-by-day schedule or personalized medical prescription. The proposed self-reported questions are not a clinically validated assessment instrument. This system does not diagnose stroke or replace professional medical advice.</p>
  </section>
  <section v-else class="card text-center">
    <h1 class="text-2xl font-bold">Assessment not found</h1>
    <RouterLink to="/history" class="btn-primary mt-5">View history</RouterLink>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { evaluateAssessment } from '@/services/rulesEngine'
import { useAppStore } from '@/stores/app'
const route = useRoute()
const store = useAppStore()
const assessment = computed(() => store.assessments.find(item => item.id === route.params.id) ?? (!route.params.id ? store.latestAssessment : null))
const evaluation = computed(() => evaluateAssessment(assessment.value?.input))
function formatDate(value: string) { return new Date(value).toLocaleString() }
onMounted(() => { if (!assessment.value) void store.refresh() })
</script>
