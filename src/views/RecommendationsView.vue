<template>
  <section v-if="assessment" class="mx-auto max-w-4xl space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm font-semibold uppercase text-blue-700">Research-prototype decision support</p>
        <h1 class="mt-1 text-3xl font-bold">Exercise recommendations</h1>
        <p class="mt-2 text-sm text-slate-600">Based on the four self-reported functional responses from {{ formatDate(assessment.date) }}.</p>
      </div>
      <RouterLink to="/assessment" class="btn-secondary">New assessment</RouterLink>
    </header>

    <article class="card">
      <h2 class="text-lg font-bold">Reported findings</h2>
      <p class="mt-2 text-sm text-slate-600">{{ evaluation.summary }}</p>
      <p v-if="evaluation.missingAnswers.length" class="mt-3 text-sm text-amber-800">This historical record is missing one or more of the four answers, so its exercise rules cannot be re-evaluated.</p>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div v-for="area in evaluation.identifiedAreas" :key="area.activity" class="rounded-xl border border-slate-200 p-4">
          <dt class="text-sm text-slate-500">{{ area.label }}</dt>
          <dd class="mt-1 font-semibold">{{ area.answerLabel }}</dd>
        </div>
      </dl>
      <p class="mt-3 text-sm leading-6 text-slate-600">Exercises are shown when their explicit functional rule matches the recorded responses. A rule match is not a clinical safety clearance; review available precautions and references and follow professional guidance.</p>
    </article>

    <article v-if="!evaluation.missingAnswers.length" class="card">
      <h2 class="text-xl font-bold">Functional rule results</h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">Each response is checked against its explicit rule. Walking and sit-to-stand matches also require a compatible standing response. The day labels organize results only; they are not a prescribed schedule.</p>
      <div class="mt-4 space-y-3">
        <section v-for="area in evaluation.areaResults" :key="area.activity" class="rounded-xl border border-slate-200 p-4">
          <h3 class="font-semibold">{{ area.label }}</h3>
          <p class="mt-1 text-sm text-slate-600">Response: {{ getAnswerLabel(area.activity, area.answer) }}</p>
          <p class="mt-2 text-sm text-slate-700">{{ area.reason }}</p>
          <p class="mt-2 text-sm text-slate-700"><strong>IF–THEN rule:</strong> {{ area.rule }}</p>
          <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
            <li v-for="condition in area.compatibilityConditions" :key="condition">{{ condition }}</li>
          </ul>
          <p class="mt-2 text-sm text-slate-700">
            <strong>Matched exercises:</strong>
            {{ area.matchedExercises.length
              ? area.matchedExercises.map(exercise => `${exercise.name} (ID ${exercise.id}; ${exercise.documentationStatus})`).join('; ')
              : 'None.' }}
          </p>
          <p v-if="area.missingEvidence" class="mt-2 text-sm text-amber-900"><strong>Evidence or catalogue gap:</strong> {{ area.missingEvidence }}</p>
          <details v-if="area.excludedExercises.length" class="mt-3">
            <summary class="cursor-pointer text-sm font-semibold text-slate-700">Excluded exercises and reasons ({{ area.excludedExercises.length }})</summary>
            <ul class="mt-2 space-y-2 text-sm text-slate-600">
              <li v-for="exercise in area.excludedExercises" :key="exercise.id">
                <strong>{{ exercise.name }} (ID {{ exercise.id }}):</strong>
                {{ exercise.reason }}
                <span class="block text-xs text-slate-500">Documentation status: {{ exercise.documentationStatus }}</span>
              </li>
            </ul>
          </details>
        </section>
      </div>
    </article>

    <div v-if="recommendationGroups.length" class="space-y-6">
      <section v-for="group in recommendationGroups" :key="group.area" class="space-y-3">
        <h2 class="text-xl font-bold">Day {{ group.day }} — {{ group.area }}</h2>
        <article v-for="recommendation in group.items" :key="recommendation.exercise.id" class="card">
        <div>
          <span class="badge bg-blue-50 text-blue-800">{{ recommendation.exercise.category }}</span>
          <h2 class="mt-2 text-xl font-bold">{{ recommendation.exercise.name }}</h2>
          <p class="mt-1 text-sm text-slate-600">{{ recommendation.exercise.targetArea }}</p>
          <p class="mt-3 text-sm text-slate-600"><strong>Description:</strong> {{ recommendation.exercise.description ?? 'No separate description is documented in the catalogue.' }}</p>
          <p class="mt-3 text-sm text-slate-600"><strong>Functional goal:</strong> {{ recommendation.exercise.functionalGoal }}</p>
          <p class="mt-2 text-sm text-slate-600"><strong>Starting position:</strong> {{ recommendation.exercise.startingPosition ?? 'Not documented.' }}</p>
          <div v-if="recommendation.matches.length" class="mt-3 flex flex-wrap gap-2">
            <span v-for="match in recommendation.matches" :key="`${match.activity}-${match.answer}`" class="badge bg-teal-50 text-teal-800">{{ match.label }}: {{ getAnswerLabel(match.activity, match.answer) }}</span>
          </div>
        </div>
        <div class="mt-4">
          <h3 class="text-sm font-semibold">Existing instructions</h3>
          <ol v-if="recommendation.exercise.instructions.length" class="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600">
            <li v-for="instruction in recommendation.exercise.instructions" :key="instruction">{{ instruction }}</li>
          </ol>
          <p v-else class="mt-2 text-sm text-slate-600">No exercise instructions are documented in the catalogue.</p>
        </div>
        <div class="mt-4 rounded-xl bg-amber-50 p-4">
          <h3 class="text-sm font-semibold text-amber-950">Documentation status: {{ getExerciseDocumentationGaps(recommendation.exercise).length ? 'Incomplete' : 'Complete' }}</h3>
          <p v-if="getExerciseDocumentationGaps(recommendation.exercise).length" class="mt-1 text-sm text-amber-900">
            Not documented: {{ getExerciseDocumentationGaps(recommendation.exercise).join(', ') }}.
          </p>
          <p class="mt-1 text-sm text-amber-900">A rule match is separate from documentation completeness and does not establish personal suitability or safety.</p>
        </div>
        <dl class="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div><dt class="font-semibold">Difficulty</dt><dd>{{ recommendation.exercise.difficulty ?? 'Not documented.' }}</dd></div>
          <div><dt class="font-semibold">Duration</dt><dd>{{ recommendation.exercise.duration ?? 'Not documented.' }}</dd></div>
          <div><dt class="font-semibold">Repetitions</dt><dd>{{ recommendation.exercise.repetitions ?? 'Not documented.' }}</dd></div>
          <div><dt class="font-semibold">Equipment or support</dt><dd>{{ recommendation.exercise.equipmentOrSupport ?? 'Not documented.' }}</dd></div>
          <div><dt class="font-semibold">Assistance</dt><dd>{{ recommendation.exercise.assistanceRequirements ?? 'Not documented.' }}</dd></div>
          <div><dt class="font-semibold">Stroke phase applicability</dt><dd>{{ recommendation.exercise.strokePhaseApplicability ?? 'Not documented.' }}</dd></div>
        </dl>
        <div class="mt-4 rounded-xl bg-slate-50 p-4">
          <h3 class="text-sm font-semibold">Why this recommendation?</h3>
          <p v-for="reason in recommendation.reasons" :key="reason" class="mt-1 text-sm text-slate-600">{{ reason }}</p>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <RouterLink :to="`/exercise/${recommendation.exercise.id}`" class="btn-primary">View exercise</RouterLink>
        </div>
        <p class="mt-3 text-sm leading-5 text-amber-900"><strong>Available safety precautions:</strong> {{ recommendation.exercise.safety ?? 'Not documented; no safety clearance is implied.' }}</p>
        <p class="mt-2 text-sm text-amber-900"><strong>Contraindications:</strong> {{ recommendation.exercise.contraindications ?? 'Not documented.' }}</p>
        <p class="mt-2 text-xs leading-5 text-slate-500"><strong>Supporting reference:</strong> {{ recommendation.exercise.literatureReference ?? 'No supporting reference is recorded in the catalogue.' }}</p>
        <a v-if="recommendation.exercise.sourceUrl" class="mt-2 inline-block text-xs font-semibold text-blue-800 underline" :href="recommendation.exercise.sourceUrl" target="_blank" rel="noreferrer">Open source</a>
      </article>
      </section>
    </div>
    <article v-else-if="evaluation.missingAnswers.length" class="card">
      <h2 class="font-bold">Unable to evaluate recommendations</h2>
      <p class="mt-2 text-sm text-slate-600">All four answers are required. No exercise was generated for this incomplete historical record.</p>
    </article>
    <article v-else class="card">
      <h2 class="font-bold">No matching recommendations are available</h2>
      <p class="mt-2 text-sm text-slate-600">Based on the recorded responses, none of the current exercise rules matched. Review the functional rule results above. No substitute exercise has been added.</p>
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
import { getExerciseDocumentationGaps } from '@/services/exerciseDocumentation'
import { groupRecommendationsByDay } from '@/services/recommendationGroups'
import { useAppStore } from '@/stores/app'
import { getAnswerLabel } from '@/types'
const route = useRoute()
const store = useAppStore()
const assessment = computed(() => store.assessments.find(item => item.id === route.params.id) ?? (!route.params.id ? store.latestAssessment : null))
const evaluation = computed(() => evaluateAssessment(assessment.value?.input))
const recommendationGroups = computed(() => groupRecommendationsByDay(evaluation.value.recommendations))
function formatDate(value: string) { return new Date(value).toLocaleString() }
onMounted(() => { if (!assessment.value) void store.refresh() })
</script>
