import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storage } from '@/services/storage'
import { supabase, supabaseConfigured } from '@/services/supabase'
import type { UserProfile } from '@/types/auth'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string' && error.trim()) return error
  if (error && typeof error === 'object') {
    const details = error as { message?: unknown; error_description?: unknown; msg?: unknown }
    for (const message of [details.message, details.error_description, details.msg]) {
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return fallback
}

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UserProfile | null>(null)
  const authError = ref('')
  const loading = ref(false)
  const isAuthenticated = computed(() => !!profile.value)

  function hydrateProfile(nextProfile: UserProfile | null) {
    profile.value = nextProfile
  }

  async function initialize() {
    if (!supabaseConfigured || !supabase) return
    if (!navigator.onLine) {
      authError.value = 'Connect to the internet to sign in and load your patient profile.'
      return
    }

    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      const session = data.session
      if (!session) return
      const nextProfile = await storage.getPatient(session.user.id, session.user.email ?? '')
      hydrateProfile(nextProfile)
      authError.value = ''
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
      if (!navigator.onLine) throw new Error('An internet connection is required to sign in.')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('No user returned from authentication.')
      const nextProfile = await storage.getPatient(data.user.id, email)
      hydrateProfile(nextProfile)
      return nextProfile
    } catch (error) {
      authError.value = getErrorMessage(error, 'Unable to sign in.')
      if (authError.value === 'Unable to sign in.') console.error('Sign-in failed with an unrecognized error.', error)
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
      const nextProfile: UserProfile = {
        id: '',
        userId: data.user.id,
        fullName: '',
        email,
        age: null,
        sex: '',
        onboardingComplete: false
      }
      hydrateProfile(nextProfile)
      return nextProfile
    } catch (error) {
      authError.value = getErrorMessage(error, 'Unable to create account.')
      if (authError.value === 'Unable to create account.') console.error('Account creation failed with an unrecognized error.', error)
      return null
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    try {
      if (supabaseConfigured && supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      hydrateProfile(null)
    } finally {
      loading.value = false
    }
  }

  async function updatePatientInfo(patient: { fullName: string; age: number; sex: string }) {
    const current = profile.value
    if (!current) return null
    const merged = await storage.updatePatientInfo(current, patient)
    hydrateProfile(merged)
    return merged
  }

  return {
    profile,
    authError,
    loading,
    isAuthenticated,
    initialize,
    signIn,
    signUp,
    signOut,
    updatePatientInfo
  }
})
