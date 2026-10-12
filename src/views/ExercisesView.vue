<template>
  <section class="space-y-6">
    <div><p class="text-sm font-semibold uppercase tracking-wider text-blue-700">Exercise library</p><h1 class="mt-1 text-3xl font-bold">Exercise guidance</h1><p class="mt-2 max-w-2xl text-slate-600">These are the exercise records used by the rules engine. Open an item to see its instructions and safety notes.</p></div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article v-for="exercise in exercises" :key="exercise.id" class="card flex flex-col">
        <div class="flex items-start justify-between gap-2"><span class="badge bg-slate-100 text-slate-700">{{ exercise.category }}</span><span class="text-xs font-semibold text-slate-400">{{ exercise.difficulty }}</span></div>
        <h2 class="mt-3 text-lg font-bold">{{ exercise.name }}</h2><p class="mt-1 text-sm text-slate-500">{{ exercise.targetArea }}</p><p class="mt-3 flex-1 text-sm leading-6 text-slate-600">{{ exercise.benefits }}</p>
        <RouterLink :to="`/exercise/${exercise.id}`" class="btn-secondary mt-4 w-full">View instructions</RouterLink>
      </article>
    </div>
  </section>
</template>
<script setup lang="ts">import { exercises } from '@/data/exercises'</script>
