<template>
  <section v-if="assessment" class="mx-auto max-w-4xl space-y-5">
    <header>
      <p class="text-sm font-semibold uppercase text-blue-700">Classification</p>
      <h1 class="mt-1 text-3xl font-bold">Assessment results</h1>
      <p class="mt-2 text-slate-600">{{ formatDate(assessment.date) }}</p>
      <p class="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Saved to Supabase.</p>
    </header>

    <article class="card">
      <p class="text-sm font-semibold uppercase text-slate-500">Overall classification</p>
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <h2 class="text-3xl font-bold">{{ assessment.severity }}</h2>
        <span class="badge" :class="severityClass">System classification</span>
      </div>
      <p class="mt-3 text-sm leading-6 text-slate-600">{{ assessment.severityReason }}</p>
    </article>

    <article class="card">
      <h2 class="text-xl font-bold">Functional findings</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div v-for="finding in functionalFindings" :key="finding.label" class="rounded-xl border border-slate-200 p-4">
          <dt class="text-sm text-slate-500">{{ finding.label }}</dt>
          <dd class="mt-1 font-semibold">{{ finding.value }}</dd>
        </div>
      </dl>
      <div class="mt-5 border-t border-slate-100 pt-4">
        <h3 class="font-semibold">Facial observations</h3>
        <p class="mt-1 text-sm text-slate-600">Eye: {{ assessment.input.facial.eyeAsymmetry }} · Mouth: {{ assessment.input.facial.mouthAsymmetry }}</p>
        <p class="mt-2 text-xs leading-5 text-slate-500">Facial observations contribute to overall classification only. Exercise recommendations are selected from functional findings, not facial observations.</p>
      </div>
      <p v-if="assessment.input.notes" class="mt-4 text-sm text-slate-600">{{ assessment.input.notes }}</p>
    </article>

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
import { useAppStore } from '@/stores/app'
import type { Severity } from '@/types'

const route = useRoute()
const store = useAppStore()
const assessment = computed(() => store.assessments.find(item => item.id === route.params.id))
const functionalFindings = computed(() => {
  if (!assessment.value) return []
  const functional = assessment.value.input.functional
  return [
    { label: 'Upper Limb', value: functional.upperLimb },
    { label: 'Lower Limb', value: functional.lowerLimb },
    { label: 'Balance', value: functional.balance },
    { label: 'Mobility', value: functional.mobility }
  ]
})
const severityClass = computed(() => {
  const styles: Record<Severity, string> = { Normal: 'badge-good', Mild: 'badge-mild', Moderate: 'badge-warn', Severe: 'badge-danger' }
  return assessment.value ? styles[assessment.value.severity] : ''
})
function formatDate(value: string) { return new Date(value).toLocaleString() }
onMounted(() => { if (!assessment.value) void store.refresh() })
</script>
