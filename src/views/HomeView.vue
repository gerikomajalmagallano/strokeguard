<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <p class="text-sm font-semibold uppercase text-blue-700">StrokeGuard · Patient dashboard</p>
        <h1 class="mt-2 text-3xl font-bold">Welcome, {{ auth.profile?.fullName }}</h1>
        <p class="mt-2 max-w-2xl text-slate-600">Assess your functional condition and receive rule-based exercise guidance.</p>
      </div>
      <RouterLink to="/assessment" class="btn-primary px-6 py-3">Start New Assessment</RouterLink>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <article class="card"><p class="text-sm text-slate-500">Last assessment</p><p class="mt-2 text-lg font-bold">{{ latest ? formatDate(latest.date) : 'Not yet completed' }}</p></article>
      <article class="card"><p class="text-sm text-slate-500">Latest classification</p><p class="mt-2 text-lg font-bold">{{ latest?.severity ?? 'No result yet' }}</p></article>
      <article class="card"><p class="text-sm text-slate-500">Assessments completed</p><p class="mt-2 text-2xl font-bold text-blue-800">{{ store.assessments.length }}</p></article>
    </div>

    <section class="card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div><h2 class="text-xl font-bold">Recent assessments</h2><p class="mt-1 text-sm text-slate-600">Your saved assessment history.</p></div>
        <RouterLink to="/history" class="text-sm font-semibold text-blue-800">View all</RouterLink>
      </div>
      <div v-if="store.assessments.length" class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[440px] text-left text-sm">
          <thead class="border-b border-slate-200 text-slate-500"><tr><th class="py-3 pr-4 font-medium">Date</th><th class="py-3 pr-4 font-medium">Classification</th><th class="py-3 text-right font-medium">Details</th></tr></thead>
          <tbody><tr v-for="item in store.assessments.slice(0, 5)" :key="item.id" class="border-b border-slate-100 last:border-0"><td class="py-3 pr-4">{{ formatDate(item.date) }}</td><td class="py-3 pr-4">{{ item.severity }}</td><td class="py-3 text-right"><RouterLink :to="`/results/${item.id}`" class="font-semibold text-blue-800">View</RouterLink></td></tr></tbody>
        </table>
      </div>
      <p v-else class="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No assessments recorded. Start a new assessment to create your first result.</p>
    </section>
    <p v-if="latest" class="text-xs leading-5 text-slate-500">This classification is generated from recorded assessment findings. It is not a medical diagnosis.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const store = useAppStore()
const auth = useAuthStore()
const latest = computed(() => store.latestAssessment)
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) }
</script>
