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
      <ul v-if="evaluation.areaResults.length" class="mt-3 space-y-2 text-sm text-slate-700">
        <li v-for="area in evaluation.areaResults" :key="area.activity">
          <strong>{{ area.label }}:</strong> {{ area.reason }}
          <p class="mt-1 text-slate-600"><strong>IF–THEN rule:</strong> {{ area.rule }}</p>
          <p class="mt-1 text-slate-600"><strong>Matched exercises:</strong>
            {{ area.matchedExercises.length
              ? area.matchedExercises.map(exercise => `${exercise.name} (ID ${exercise.id}; ${exercise.documentationStatus})`).join('; ')
              : 'None.' }}
          </p>
          <p v-if="area.missingEvidence" class="mt-1 text-amber-900"><strong>Evidence or catalogue gap:</strong> {{ area.missingEvidence }}</p>
          <details v-if="area.excludedExercises.length" class="mt-1">
            <summary class="cursor-pointer">Excluded exercises and reasons ({{ area.excludedExercises.length }})</summary>
            <ul class="mt-1 list-inside list-disc">
              <li v-for="exercise in area.excludedExercises" :key="exercise.id">
                {{ exercise.name }} (ID {{ exercise.id }}): {{ exercise.reason }}
                <span class="text-slate-500">Documentation: {{ exercise.documentationStatus }}</span>
              </li>
            </ul>
          </details>
        </li>
      </ul>
    </article>

    <article class="card">
      <h2 class="text-xl font-bold">Four functional areas</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div v-for="finding in recordedFindings" :key="finding.key" class="rounded-xl border border-slate-200 p-4">
          <dt class="text-sm text-slate-500">{{ finding.label }}</dt>
          <dd class="mt-1 font-semibold">{{ getAnswerLabel(finding.key, finding.answer) }}</dd>
        </div>
      </dl>
      <p v-if="assessment.input.additionalNotes" class="mt-4 text-sm text-slate-600">{{ assessment.input.additionalNotes }}</p>
    </article>

    <article class="card">
      <h2 class="text-xl font-bold">Rule-matched exercises</h2>
      <div v-if="evaluation.recommendations.length" class="mt-4 space-y-4">
        <div v-for="recommendation in evaluation.recommendations" :key="recommendation.exercise.id" class="rounded-xl border border-slate-200 p-4">
          <h3 class="font-semibold">{{ recommendation.exercise.name }}</h3>
          <p class="mt-1 text-sm text-slate-600">{{ recommendation.exercise.functionalGoal }}</p>
          <p v-for="reason in recommendation.reasons" :key="reason" class="mt-2 text-sm text-slate-600">{{ reason }}</p>
          <p class="mt-3 text-sm text-amber-900">
            <strong>Documentation status:</strong>
            {{ getExerciseDocumentationGaps(recommendation.exercise).length ? `Incomplete. Missing: ${getExerciseDocumentationGaps(recommendation.exercise).join(', ')}.` : 'Complete.' }}
          </p>
          <p class="mt-1 text-sm text-amber-900"><strong>Available safety information:</strong> {{ recommendation.exercise.safety ?? 'Not documented; a rule match is not safety clearance.' }}</p>
        </div>
      </div>
      <p v-else-if="evaluation.missingAnswers.length" class="mt-2 text-sm text-slate-600">No recommendations can be generated until all four answers are available.</p>
      <p v-else class="mt-2 text-sm text-slate-600">No matching recommendations are available based on the recorded responses and current rules. Each functional area was evaluated against the complete four-response profile; review the rule audit for compatibility and documentation gaps.</p>
    </article>

    <p class="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">These questions collect self-reported functional information. They are not a clinically validated assessment instrument and do not establish a diagnosis or determine clinical safety. StrokeGuard does not diagnose stroke or replace professional rehabilitation advice.</p>

    <div class="flex flex-wrap gap-3">
      <RouterLink :to="`/recommendations/${assessment.id}`" class="btn-primary">View Recommendations</RouterLink>
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
import { getExerciseDocumentationGaps } from '@/services/exerciseDocumentation'
import { evaluateAssessment } from '@/services/rulesEngine'
import { useAppStore } from '@/stores/app'
import { getAnswerLabel } from '@/types'

const route = useRoute()
const store = useAppStore()
const assessment = computed(() => store.assessments.find(item => item.id === route.params.id))
const evaluation = computed(() => evaluateAssessment(assessment.value?.input))
const recordedFindings = computed(() => {
  if (!assessment.value) return []
  const findings = assessment.value.input.findings
  return [
    { key: 'legMovement' as const, label: 'Leg movement', answer: findings.legMovement },
    { key: 'standing' as const, label: 'Standing', answer: findings.standing },
    { key: 'walking' as const, label: 'Walking', answer: findings.walking },
    { key: 'sittingToStanding' as const, label: 'Sit-to-stand', answer: findings.sittingToStanding }
  ]
})
function formatDate(value: string) { return new Date(value).toLocaleString() }
onMounted(() => { if (!assessment.value) void store.refresh() })
</script>
