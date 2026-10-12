import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import './style.css'

async function removeLegacyOfflineData() {
  const legacyKeys = ['strokeguard_profile_v1', 'strokeguard_local_accounts_v1', 'strokeguard_local_patients_v1']
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key && (legacyKeys.includes(key) ||
      key.startsWith('strokeguard_assessments_v3_') ||
      key.startsWith('strokeguard_sessions_v3_') ||
      key.startsWith('strokeguard_cache_key_v1_'))) {
      localStorage.removeItem(key)
    }
  }

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) await registration.unregister()
  }

  if ('caches' in globalThis) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames
      .filter(name => name.startsWith('workbox-'))
      .map(name => caches.delete(name)))
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('strokeguard-offline')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not remove the old offline database.'))
    request.onblocked = () => reject(new Error('Close other StrokeGuard tabs to remove the old offline database.'))
  })
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
try {
  await removeLegacyOfflineData()
} catch (error) {
  console.error('Unable to fully remove the previous offline cache.', error)
}
await useAuthStore(pinia).initialize()
app.use(router)
app.mount('#app')
