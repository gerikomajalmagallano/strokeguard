<template>
  <section class="mx-auto max-w-4xl space-y-6">
    <header>
      <p class="text-sm font-semibold uppercase text-blue-700">New assessment</p>
      <h1 class="mt-1 text-3xl font-bold">Functional assessment</h1>
      <p class="mt-2 text-slate-600">Record findings to generate a transparent, rules-based classification and exercise guidance.</p>
      <p v-if="!store.online" class="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">You are offline. This assessment will be encrypted on this device and queued for Supabase synchronization when you reconnect. Keep this signed-in browser session open; signing out is blocked while records are pending.</p>
    </header>

    <ol class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Assessment progress">
      <li v-for="(step, index) in steps" :key="step" class="flex items-center gap-2 border-b-2 py-3 text-sm" :class="activeStep === index + 1 ? 'border-blue-700 font-semibold text-blue-800' : activeStep > index + 1 ? 'border-teal-600 text-teal-800' : 'border-slate-200 text-slate-500'">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">{{ index + 1 }}</span><span>{{ step }}</span>
      </li>
    </ol>

    <form class="space-y-5" @submit.prevent="submit">
      <div v-if="activeStep === 1" class="card space-y-5">
        <div>
          <h2 class="text-xl font-bold">Facial observation</h2>
          <p class="mt-1 text-sm text-slate-600">Optional structured observation contributes to overall classification only. It does not select exercise areas.</p>
        </div>
        <fieldset v-for="item in facialItems" :key="item.key">
          <legend class="label">{{ item.label }}</legend>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button v-for="level in severities" :key="level" type="button" class="option justify-center" :aria-pressed="form.facial[item.key] === level" :class="form.facial[item.key] === level ? 'border-blue-600 bg-blue-50 text-blue-800' : ''" @click="form.facial[item.key] = level">{{ level }}</button>
          </div>
        </fieldset>
        <div class="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">StrokeGuard is a research prototype. It does not diagnose stroke or replace professional medical advice.</div>
      </div>

      <div v-else class="space-y-5">
        <div class="card">
          <h2 class="text-xl font-bold">Functional findings</h2>
          <p class="mt-1 text-sm text-slate-600">Select one option for each area. Exercise recommendations are based on these findings.</p>
          <div class="mt-5 space-y-6">
            <fieldset v-for="item in functionalItems" :key="item.key">
              <legend class="label">{{ item.label }}</legend>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button v-for="option in item.options" :key="option" type="button" class="option justify-center text-center" :aria-pressed="form.functional[item.key] === option" :class="form.functional[item.key] === option ? 'border-blue-600 bg-blue-50 text-blue-800' : ''" @click="setFunctional(item.key, option)">{{ option }}</button>
              </div>
            </fieldset>
          </div>
        </div>
        <div class="card">
          <label for="assessment-notes" class="label">Notes (optional)</label>
          <textarea id="assessment-notes" v-model="form.notes" rows="3" class="field" placeholder="Brief observation"></textarea>
        </div>
      </div>

      <p v-if="saveError" role="alert" class="text-sm text-red-700">{{ saveError }}</p>
      <div class="flex flex-wrap justify-between gap-3">
        <RouterLink to="/dashboard" class="btn-secondary">Cancel</RouterLink>
        <button v-if="activeStep === 2" type="button" class="btn-secondary" @click="activeStep = 1">Back</button>
        <button v-if="activeStep === 1" type="button" class="btn-primary px-6" @click="activeStep = 2">Continue to functional assessment</button>
        <button v-else class="btn-primary px-6" :disabled="saving" type="submit">{{ saving ? 'Saving…' : 'Save assessment and view classification' }}</button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { classifyAssessment, generateRecommendations } from '@/services/rulesEngine'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import type { AssessmentInput, FunctionalFindings, Severity } from '@/types'

const router = useRouter()
const store = useAppStore()
const auth = useAuthStore()
const activeStep = ref(1)
const saving = ref(false)
const saveError = ref('')
const steps = ['Assessment', 'Functional Assessment', 'Classification', 'Recommendations']
const severities: Severity[] = ['Normal', 'Mild', 'Moderate', 'Severe']
const facialItems = [
  { key: 'eyeAsymmetry', label: 'Eye asymmetry' },
  { key: 'mouthAsymmetry', label: 'Mouth asymmetry' }
] as const
const functionalItems = [
  { key: 'upperLimb', label: 'Upper limb', options: severities },
  { key: 'lowerLimb', label: 'Lower limb', options: severities },
  { key: 'balance', label: 'Balance', options: severities },
  { key: 'mobility', label: 'Mobility', options: ['Independent', 'Needs assistance', 'Unable'] }
] as const

const form = reactive<AssessmentInput>({
  facial: { eyeAsymmetry: 'Normal', mouthAsymmetry: 'Normal' },
  functional: { upperLimb: 'Normal', lowerLimb: 'Normal', balance: 'Normal', mobility: 'Independent' },
  notes: ''
})

function setFunctional<K extends keyof FunctionalFindings>(key: K, value: FunctionalFindings[K] | string) {
  form.functional[key] = value as FunctionalFindings[K]
}

async function submit() {
  if (!auth.profile?.id) {
    saveError.value = auth.authError || 'Your signed-in patient profile is unavailable. Reconnect and sign in again before saving.'
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    const result = classifyAssessment(form)
    const assessment = {
      id: crypto.randomUUID(),
      patientId: auth.profile.id,
      date: new Date().toISOString(),
      input: JSON.parse(JSON.stringify(form)) as AssessmentInput,
      severity: result.severity,
      severityReason: result.reason,
      recommendations: generateRecommendations(form)
    }
    await store.saveAssessment(assessment)
    await router.push(`/results/${assessment.id}`)
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'The assessment could not be saved.'
  } finally {
    saving.value = false
  }
}
</script>
