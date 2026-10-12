<template>
  <section class="space-y-5">
    <header><p class="text-sm font-semibold uppercase text-blue-700">History</p><h1 class="mt-1 text-3xl font-bold">Assessment history</h1><p class="mt-2 text-slate-600">Only your assessment records are shown.</p></header>
    <div v-if="store.assessments.length" class="space-y-3">
      <article v-for="item in store.assessments" :key="item.id" class="card flex flex-wrap items-center justify-between gap-4">
        <div><p class="font-semibold">{{ formatDate(item.date) }}</p><p class="mt-1 text-sm text-slate-600">Classification: <strong>{{ item.severity }}</strong></p><p v-if="item.syncStatus === 'pending'" class="mt-1 text-xs font-semibold text-orange-800">Sync Pending — stored encrypted on this device</p></div>
        <RouterLink :to="`/results/${item.id}`" class="btn-secondary">View Details</RouterLink>
      </article>
    </div>
    <div v-else class="card"><p class="text-slate-600">No assessments recorded yet.</p><RouterLink to="/assessment" class="btn-primary mt-4">Start New Assessment</RouterLink></div>
    <section v-if="store.sessions.length" class="space-y-3">
      <h2 class="text-xl font-bold">Completed exercise sessions</h2>
      <article v-for="session in store.sessions" :key="session.id" class="card flex flex-wrap justify-between gap-3 text-sm"><span class="font-semibold">{{ session.exerciseName }}</span><span class="text-slate-500">{{ formatDate(session.completedAt) }}</span></article>
    </section>
  </section>
</template>
<script setup lang="ts">
import { useAppStore } from '@/stores/app'
const store = useAppStore()
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) }
</script>
