<template>
  <section v-if="assessment" class="mx-auto max-w-4xl space-y-5">
    <header>
      <p class="text-sm font-semibold uppercase text-blue-700">Lower-limb decision support</p>
      <h1 class="mt-1 text-3xl font-bold">Assessment results</h1>
      <p class="mt-2 text-slate-600">{{ formatDate(assessment.date) }}</p>
      <p class="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Assessment saved to Supabase.</p>
    </header>

    <article class="card">
      <h2 class="text-xl font-bold">Summary of reported findings</h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">{{ evaluation.summary }}</p>
      <p v-if="evaluation.missingAnswers.length" class="mt-3 text-sm text-amber-800">This historical record does not contain all four answers. Recommendations cannot be re-evaluated for missing answers.</p>
      <p v-if="evaluation.unmatchedFindings.length" class="mt-3 text-sm text-amber-800">No matching exercise in the existing library was found for: {{ evaluation.unmatchedFindings.map(item => item.activity).join(', ') }}.</p>
    </article>

    <article class="card">
      <h2 class="text-xl font-bold">Recorded answers</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div v-for="finding in recordedFindings" :key="finding.key" class="rounded-xl border border-slate-200 p-4">
          <dt class="text-sm text-slate-500">{{ finding.label }}</dt>
          <dd class="mt-1 font-semibold">{{ finding.answer ?? 'Not available in this historical record' }}</dd>
        </div>
      </dl>
      <p v-if="assessment.input.notes" class="mt-4 text-sm text-slate-600">{{ assessment.input.notes }}</p>
    </article>

    <article class="card">
      <h2 class="text-xl font-bold">{{ evaluation.missingAnswers.length ? 'Saved historical recommendations' : 'Exercises recommended by the rules' }}</h2>
      <p v-if="evaluation.missingAnswers.length && assessment.recommendations.length" class="mt-2 text-sm text-amber-800">These recommendations predate the four-question form and were not re-evaluated by the current rules.</p>
      <div v-if="assessment.recommendations.length" class="mt-4 space-y-4">
        <div v-for="recommendation in assessment.recommendations" :key="recommendation.exercise.id" class="rounded-xl border border-slate-200 p-4">
          <h3 class="font-semibold">{{ recommendation.exercise.name }}</h3>
          <p class="mt-1 text-sm text-slate-600">{{ recommendation.exercise.benefits }}</p>
          <p v-for="reason in recommendation.reasons" :key="reason" class="mt-2 text-sm text-slate-600">{{ reason }}</p>
        </div>
      </div>
      <p v-else-if="evaluation.noDifficultyReported" class="mt-2 text-sm text-slate-600">No difficulty was reported, so the rules generated no exercise recommendation.</p>
      <p v-else-if="evaluation.missingAnswers.length" class="mt-2 text-sm text-slate-600">No recommendations can be generated until all four answers are available.</p>
      <p v-else class="mt-2 text-sm text-slate-600">No matching exercise exists in the current library for the reported finding(s).</p>
    </article>

    <p class="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">StrokeGuard provides research-prototype decision support. These proposed self-reported questions are not a clinically validated assessment instrument. This system does not diagnose stroke or replace professional medical advice.</p>

    <div class="flex flex-wrap gap-3">
      <RouterLink :to="`/recommendations/${assessment.id}`" class="btn-primary">View exercise recommendations</RouterLink>
      <RouterLink to="/assessment" class="btn-secondary">Start another assessment</RouterLink>
    </div>
  </section>
  <section v-else class="card text-center">
    <h1 class="text-2xl font-bold">Assessment not found</h1>
    <p class="mt-2 text-slate-600">This record may not belong to the signed-in patient.</p>
    <RouterLink to="/history" class="btn-primary mt-5">Return to history</RouterLink>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { evaluateAssessment } from '@/services/rulesEngine'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const store = useAppStore()
const assessment = computed(() => store.assessments.find(item => item.id === route.params.id))
const evaluation = computed(() => evaluateAssessment(assessment.value?.input))
const recordedFindings = computed(() => {
  if (!assessment.value) return []
  const findings = assessment.value.input.findings
  return [
    { key: 'legMovement', label: 'Leg movement', answer: findings.legMovement },
    { key: 'standing', label: 'Standing', answer: findings.standing },
    { key: 'walking', label: 'Walking', answer: findings.walking },
    { key: 'sittingToStanding', label: 'Sitting to standing', answer: findings.sittingToStanding }
  ]
})
function formatDate(value: string) { return new Date(value).toLocaleString() }
onMounted(() => { if (!assessment.value) void store.refresh() })
</script>
