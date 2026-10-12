<template>
  <section v-if="assessment" class="mx-auto max-w-4xl space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div><p class="text-sm font-semibold uppercase text-blue-700">Decision support</p><h1 class="mt-1 text-3xl font-bold">Exercise recommendations</h1><p class="mt-2 text-sm text-slate-600">Based on the functional findings from {{ formatDate(assessment.date) }}.</p></div>
      <RouterLink to="/assessment" class="btn-secondary">New assessment</RouterLink>
    </header>

    <article class="card">
      <h2 class="text-lg font-bold">Why these exercises?</h2>
      <p class="mt-1 text-sm text-slate-600">Rules match functional limitations to exercises with the same target area. Facial findings affect overall classification only.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <span v-for="finding in triggeredFindings" :key="finding.label" class="badge bg-teal-50 text-teal-800">{{ finding.label }}: {{ finding.value }}</span>
        <span v-if="!triggeredFindings.length" class="text-sm text-slate-600">No functional limitations were selected, so no area-specific exercise was triggered.</span>
      </div>
    </article>

    <div v-if="assessment.recommendations.length" class="space-y-4">
      <article v-for="recommendation in assessment.recommendations" :key="recommendation.exercise.id" class="card">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><span class="badge bg-blue-50 text-blue-800">{{ recommendation.exercise.category }}</span><h2 class="mt-2 text-xl font-bold">{{ recommendation.exercise.name }}</h2><p class="mt-1 text-sm text-slate-600">{{ recommendation.exercise.targetArea }} · {{ recommendation.exercise.difficulty }}</p><p class="mt-3 text-sm text-slate-600">{{ recommendation.exercise.benefits }}</p></div>
          <span class="badge" :class="priorityClass(recommendation.priority)">{{ recommendation.priority }} priority</span>
        </div>
        <div class="mt-4 rounded-xl bg-slate-50 p-4"><h3 class="text-sm font-semibold">Why this recommendation?</h3><p v-for="reason in recommendation.reasons" :key="reason" class="mt-1 text-sm text-slate-600">{{ reason }}</p></div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-slate-500">{{ recommendation.exercise.repetitions }} · {{ recommendation.exercise.duration }}</p><RouterLink :to="`/exercise/${recommendation.exercise.id}`" class="btn-primary">View exercise</RouterLink></div>
      </article>
    </div>
    <article v-else class="card"><h2 class="font-bold">No exercise category was triggered</h2><p class="mt-2 text-sm text-slate-600">All recorded functional areas were normal or independent. Facial findings are not used to select exercise areas.</p></article>
  </section>
  <section v-else class="card text-center"><h1 class="text-2xl font-bold">Assessment not found</h1><RouterLink to="/history" class="btn-primary mt-5">View history</RouterLink></section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const store = useAppStore()
const assessment = computed(() => store.assessments.find(item => item.id === route.params.id) ?? (!route.params.id ? store.latestAssessment : null))
const triggeredFindings = computed(() => {
  if (!assessment.value) return []
  const finding = assessment.value.input.functional
  return [
    { label: 'Upper Limb', value: finding.upperLimb },
    { label: 'Lower Limb', value: finding.lowerLimb },
    { label: 'Balance', value: finding.balance },
    { label: 'Mobility', value: finding.mobility }
  ].filter(item => item.value !== 'Normal' && item.value !== 'Independent')
})
function priorityClass(value: string) { return value === 'High' ? 'badge-warn' : value === 'Medium' ? 'badge-mild' : 'badge-good' }
function formatDate(value: string) { return new Date(value).toLocaleString() }
onMounted(() => { if (!assessment.value) void store.refresh() })
</script>
