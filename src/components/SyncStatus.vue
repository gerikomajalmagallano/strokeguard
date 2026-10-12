<template>
  <div class="flex flex-wrap items-center gap-2 text-xs font-semibold" aria-live="polite">
    <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
      :class="store.online ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'">
      <span class="h-2 w-2 rounded-full" :class="store.online ? 'bg-emerald-600' : 'bg-amber-600'"></span>
      {{ store.online ? 'Online' : 'Offline' }}
    </span>
    <span v-if="store.pendingCount" class="rounded-full bg-orange-50 px-3 py-1.5 text-orange-900">
      Sync Pending: {{ store.pendingCount }}
    </span>
    <span v-else-if="store.online" class="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">All changes synced</span>
    <button v-if="store.pendingCount && store.online" type="button" class="underline"
      :disabled="store.syncing" @click="store.syncPending">
      {{ store.syncing ? 'Syncing…' : 'Try sync' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const store = useAppStore()
</script>
