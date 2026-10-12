import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storage } from '@/services/storage'
import { supabase, supabaseConfigured } from '@/services/supabase'
import type { UserProfile } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UserProfile | null>(null)
  const authError = ref('')
  const loading = ref(false)
  const sessionExpiresAt = ref(0)
  const sessionClock = ref(Date.now())
  const isAuthenticated = computed(() => {
    sessionClock.value
    return !!profile.value && (navigator.onLine || sessionExpiresAt.value > Date.now())
  })

  setInterval(() => {
    sessionClock.value = Date.now()
    if (!navigator.onLine && profile.value && sessionExpiresAt.value <= Date.now()) {
      hydrateProfile(null)
      authError.value = 'Your Supabase session expired while offline. Reconnect and sign in again to access patient information.'
    }
  }, 15_000)

  function clearLegacyLocalData() {
    const legacyKeys = ['strokeguard_profile_v1', 'strokeguard_local_accounts_v1', 'strokeguard_local_patients_v1']
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key && (legacyKeys.includes(key) ||
        key.startsWith('strokeguard_assessments_v3_'))) {
        localStorage.removeItem(key)
      }
    }
  }

  async function migrateLegacySessions(patientId: string) {
    if (!patientId) return
    try {
      await storage.migrateLegacySessions(patientId)
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'Legacy exercise history could not be migrated.'
      console.error('Unable to migrate legacy exercise-session data.', error)
    }
  }

  function hydrateProfile(nextProfile: UserProfile | null) {
    profile.value = nextProfile
  }

  async function initialize() {
    clearLegacyLocalData()
    if (!supabaseConfigured || !supabase) return

    try {
      let { data, error } = await supabase.auth.getSession()
      if (error) throw error
      let session = data.session
      if (!session) return

      if ((session.expires_at ?? 0) * 1000 <= Date.now()) {
        if (!navigator.onLine) {
          authError.value = 'Your saved Supabase session has expired. Connect to the internet and sign in again before accessing patient data.'
          return
        }
        const refreshed = await supabase.auth.refreshSession()
        if (refreshed.error) throw refreshed.error
        session = refreshed.data.session
        if (!session) {
          authError.value = 'Your session could not be refreshed. Sign in online to continue.'
          return
        }
      }
      sessionExpiresAt.value = (session.expires_at ?? 0) * 1000

      let cached: UserProfile | null = null
      try {
        cached = await storage.getCachedProfile(session.user.id)
      } catch (error) {
        console.error('Unable to decrypt the cached patient profile.', error)
        authError.value = error instanceof Error ? error.message : 'The encrypted patient profile could not be read.'
      }
      if (!navigator.onLine) {
        if (cached?.userId === session.user.id) {
          hydrateProfile(cached)
          await migrateLegacySessions(cached.id)
        }
        else authError.value = 'No secure patient profile is available for this signed-in account on this device. Sign in and load your profile while online first.'
        return
      }

      try {
        const nextProfile = await loadSupabasePatient(session.user.id, session.user.email ?? cached?.email ?? '')
        await storage.initializeSecureCache(session.user.id)
        await storage.cacheProfile(nextProfile)
        hydrateProfile(nextProfile)
        authError.value = ''
        await migrateLegacySessions(nextProfile.id)
      } catch (error) {
        if (cached?.userId === session.user.id) {
          hydrateProfile(cached)
          authError.value = `Using this device's encrypted profile cache because it could not be refreshed: ${error instanceof Error ? error.message : 'unknown error'}`
        } else {
          throw error
        }
      }
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'Unable to restore your Supabase session.'
    }
  }

  async function signIn(email: string, password: string) {
    loading.value = true
    authError.value = ''
    try {
      if (!supabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured. Add the project URL and publishable/anon key before signing in.')
      }
      if (!navigator.onLine) {
        throw new Error('Sign-in requires an internet connection. Previously signed-in users may continue offline only while their saved session is valid on this device.')
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('No user returned from authentication.')
      sessionExpiresAt.value = (data.session?.expires_at ?? 0) * 1000
      const nextProfile = await loadSupabasePatient(data.user.id, email)
      await storage.initializeSecureCache(data.user.id)
      await storage.cacheProfile(nextProfile)
      hydrateProfile(nextProfile)
      await migrateLegacySessions(nextProfile.id)
      return nextProfile
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'Unable to sign in.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string, password: string) {
    loading.value = true
    authError.value = ''
    try {
      if (!supabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured. Add the project URL and publishable/anon key before creating an account.')
      }
      if (!navigator.onLine) throw new Error('Creating an account requires an internet connection.')
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('No user returned from signup.')
      if (!data.session) throw new Error('Account created. Verify your email, then sign in online to continue.')
      sessionExpiresAt.value = (data.session.expires_at ?? 0) * 1000
      const nextProfile: UserProfile = {
        id: '',
        userId: data.user.id,
        fullName: '',
        email,
        age: null,
        sex: '',
        onboardingComplete: false
      }
      await storage.initializeSecureCache(data.user.id)
      await storage.cacheProfile(nextProfile)
      hydrateProfile(nextProfile)
      return nextProfile
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'Unable to create account.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    try {
      const userId = profile.value?.userId
      const patientId = profile.value?.id
      if (userId) {
        const pending = patientId ? await storage.getPendingCount(patientId) : 0
        if (pending && !navigator.onLine) {
          throw new Error('Logout is paused to protect unsynchronized assessments. Reconnect and synchronize them before logging out.')
        }
        if (pending && patientId) {
          const result = await storage.syncPendingAssessments(patientId)
          if (result.pending) {
            throw new Error(`Logout is paused because ${result.pending} assessment(s) are still pending. ${result.errors.join(' ')}`)
          }
        }
      }
      if (supabaseConfigured && supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      sessionExpiresAt.value = 0
      hydrateProfile(null)
      if (userId) await storage.clearPatientData(userId, patientId)
    } finally {
      loading.value = false
    }
  }

  async function updatePatientInfo(patient: { fullName: string; age: number; sex: string }) {
    const current = profile.value
    if (!current) return null
    if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured.')
    if (!navigator.onLine) throw new Error('Patient information changes require an internet connection.')

    const { data, error } = await supabase
      .from('patients')
      .upsert({ user_id: current.userId, full_name: patient.fullName, age: patient.age, sex: patient.sex }, { onConflict: 'user_id' })
      .select('id')
      .single()
    if (error) throw error

    const merged = { ...current, ...patient, id: data.id, onboardingComplete: true }
    await storage.cacheProfile(merged)
    hydrateProfile(merged)
    return merged
  }

  return {
    profile,
    authError,
    loading,
    isAuthenticated,
    assertOfflineSession() {
      if (!navigator.onLine && (!profile.value || sessionExpiresAt.value <= Date.now())) {
        throw new Error('Your Supabase session is expired or unavailable. Reconnect and sign in before creating or viewing patient records.')
      }
    },
    initialize,
    signIn,
    signUp,
    signOut,
    updatePatientInfo
  }
})

async function loadSupabasePatient(userId: string, email: string): Promise<UserProfile> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('patients')
    .select('id, full_name, age, sex')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return {
    id: data?.id ?? '',
    userId,
    fullName: data?.full_name ?? '',
    email,
    age: data?.age ?? null,
    sex: data?.sex ?? '',
    onboardingComplete: !!data
  }
}
