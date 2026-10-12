<template>
  <section class="mx-auto max-w-5xl py-6">
    <div class="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
      <div class="bg-slate-900 p-8 text-white sm:p-10">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">StrokeGuard</p>
        <h1 class="mt-4 text-3xl font-bold tracking-tight">Patient assessment and decision support.</h1>
        <p class="mt-4 max-w-md text-sm leading-6 text-slate-300">A research prototype for functional assessment, transparent classification, and rules-based exercise guidance.</p>

        <div class="mt-8 space-y-4 text-sm text-slate-200">
          <div class="flex items-center gap-3"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">1</span> Sign in or create an account</div>
          <div class="flex items-center gap-3"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">2</span> Enter basic patient information</div>
          <div class="flex items-center gap-3"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">3</span> Create assessments and review your history</div>
        </div>
      </div>

      <div class="p-6 sm:p-8">
        <div class="mb-6 flex rounded-full bg-slate-100 p-1">
          <button :class="['flex-1 rounded-full px-4 py-2 text-sm font-semibold transition', mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500']" @click="mode = 'login'">Login</button>
          <button :class="['flex-1 rounded-full px-4 py-2 text-sm font-semibold transition', mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500']" @click="mode = 'signup'">Sign Up</button>
        </div>

        <form v-if="mode === 'login'" class="space-y-4" @submit.prevent="handleLogin">
          <div>
            <label for="login-email" class="label">Email</label>
            <input id="login-email" v-model="login.email" type="email" class="field" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <div>
            <label for="login-password" class="label">Password</label>
            <input id="login-password" v-model="login.password" type="password" class="field" autocomplete="current-password" placeholder="Password" required />
          </div>
          <button class="btn-primary w-full" :disabled="auth.loading" type="submit">
            {{ auth.loading ? 'Signing in...' : 'Login' }}
          </button>
        </form>

        <form v-else class="space-y-4" @submit.prevent="handleSignup">
          <div>
            <label for="signup-email" class="label">Email</label>
            <input id="signup-email" v-model="signup.email" type="email" class="field" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <div>
            <label for="signup-password" class="label">Password</label>
            <input id="signup-password" v-model="signup.password" type="password" class="field" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" required />
          </div>
          <div>
            <label for="signup-confirm-password" class="label">Confirm password</label>
            <input id="signup-confirm-password" v-model="signup.confirmPassword" type="password" class="field" autocomplete="new-password" placeholder="Confirm password" required />
          </div>
          <button class="btn-primary w-full" :disabled="auth.loading" type="submit">
            {{ auth.loading ? 'Creating account...' : 'Create account' }}
          </button>
        </form>

        <p v-if="auth.authError" role="alert" class="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ auth.authError }}</p>

        <p class="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          {{ supabaseConfigured ? 'Sign-in, assessments, and patient records require an internet connection and are stored in Supabase.' : 'Supabase is not configured. Add the project URL and publishable/anon key to enable sign-in and patient records.' }}
        </p>

        <p class="mt-4 text-center text-xs leading-5 text-slate-500">Use this research prototype for assessment and decision-support demonstrations only.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabaseConfigured } from '@/services/supabase'

const props = defineProps<{ initialMode?: 'login' | 'signup' }>()
const router = useRouter()
const auth = useAuthStore()
const mode = ref<'login' | 'signup'>(props.initialMode ?? 'login')

const login = reactive({ email: '', password: '' })
const signup = reactive({ email: '', password: '', confirmPassword: '' })

async function handleLogin() {
  const profile = await auth.signIn(login.email, login.password)
  if (profile) router.push(profile.onboardingComplete ? '/dashboard' : '/onboarding')
}

async function handleSignup() {
  if (signup.password !== signup.confirmPassword) {
    auth.authError = 'Passwords do not match.'
    return
  }

  const profile = await auth.signUp(signup.email, signup.password)
  if (profile) router.push('/onboarding')
}
</script>
