<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header v-if="!route.meta.hideHeader" class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
        <RouterLink to="/dashboard" class="shrink-0 text-xl font-bold text-slate-900">StrokeGuard</RouterLink>
        <div class="flex flex-wrap items-center gap-3"><SyncStatus /><button type="button" class="btn-secondary shrink-0" @click="handleLogout">Logout</button></div>
        </div>
        <nav class="flex max-w-full items-center gap-1 overflow-x-auto pb-1" aria-label="Patient navigation">
          <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-link">{{ item.label }}</RouterLink>
        </nav>
        <p v-if="logoutError" role="alert" class="text-sm text-red-700">{{ logoutError }}</p>
      </div>
    </header>
    <main class="mx-auto min-h-[calc(100vh-180px)] max-w-6xl px-4 py-6 sm:px-6 sm:py-8"><RouterView /></main>
    <p v-if="store.syncError || store.loadError" role="status" class="mx-auto max-w-6xl px-4 pb-4 text-sm text-amber-900 sm:px-6">{{ store.syncError || store.loadError }}</p>
    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto max-w-6xl px-4 py-5 text-xs leading-5 text-slate-600 sm:px-6"><strong class="text-slate-800">Research prototype:</strong> StrokeGuard provides assessment-based decision support and exercise guidance. It does not diagnose stroke or replace professional medical advice.</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import SyncStatus from '@/components/SyncStatus.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = useAppStore()
const logoutError = ref('')
const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/assessment', label: 'New Assessment' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/history', label: 'History' },
  { to: '/profile', label: 'Patient Information' }
]

watch(() => auth.profile?.id, () => { void store.refresh() }, { immediate: true })
onMounted(() => store.startConnectivityMonitoring())
onUnmounted(() => store.stopConnectivityMonitoring())

async function handleLogout() {
  logoutError.value = ''
  try {
    await auth.signOut()
    await router.push('/login')
  } catch (error) {
    logoutError.value = error instanceof Error ? error.message : 'Logout could not be completed.'
  }
}
</script>
