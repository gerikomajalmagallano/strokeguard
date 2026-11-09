<template>
  <section class="mx-auto max-w-4xl space-y-6">
    <header>
      <p class="text-sm font-semibold uppercase text-blue-700">New assessment</p>
      <h1 class="mt-1 text-3xl font-bold">Lower-limb assessment</h1>
      <p class="mt-2 text-slate-600">Record all four functional responses and review the transparent rule outcomes.</p>
    </header>

    <form class="space-y-5" @submit.prevent="submit">
      <div class="card space-y-5">
        <div>
          <h2 class="text-xl font-bold">Lower-limb functional questions</h2>
          <p class="mt-1 text-sm text-slate-600">Select one answer for each activity.</p>
        </div>
        <fieldset v-for="item in questions" :key="item.key" :aria-describedby="validationErrors.includes(item.question) ? `${item.key}-error` : undefined">
          <legend class="label">{{ item.question }} <span class="text-red-700" aria-hidden="true">*</span></legend>
          <div class="grid gap-2 sm:grid-cols-2">
            <label v-for="(option, index) in item.options" :key="option.value" class="option min-h-14" :class="form.findings[item.key] === option.value ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600' : ''">
              <input
                class="peer sr-only"
                type="radio"
                :name="item.key"
                :value="option.value"
                :checked="form.findings[item.key] === option.value"
                :required="index === 0"
                :aria-invalid="validationErrors.includes(item.question)"
                @change="setAnswer(item.key, option.value)"
              >
              <span class="rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-teal-700 peer-focus-visible:ring-offset-2">{{ option.label }}</span>
              <span v-if="form.findings[item.key] === option.value" class="ml-3 shrink-0 text-xs font-bold uppercase text-blue-800">Selected</span>
            </label>
          </div>
          <p v-if="validationErrors.includes(item.question)" :id="`${item.key}-error`" class="mt-2 text-sm text-red-700">Select an answer to continue.</p>
        </fieldset>
        <div>
          <label for="assessment-notes" class="label">Notes (optional)</label>
          <textarea id="assessment-notes" v-model="form.additionalNotes" rows="3" class="field" placeholder="Optional notes about these lower-limb activities"></textarea>
        </div>
        <p class="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{{ assessmentDisclaimer }}</p>
      </div>

      <section v-if="allQuestionsAnswered" class="card" aria-live="polite">
        <h2 class="text-xl font-bold">Review your answers</h2>
        <dl class="mt-4 grid gap-3 sm:grid-cols-2">
          <div v-for="item in questions" :key="item.key" class="rounded-xl border border-slate-200 p-4">
            <dt class="text-sm text-slate-500">{{ item.label }}</dt>
            <dd class="mt-1 font-semibold">{{ answerLabel(item.key, form.findings[item.key]) }}</dd>
          </div>
        </dl>
      </section>

      <p v-if="saveError" role="alert" class="text-sm text-red-700">{{ saveError }}</p>
      <div class="flex flex-wrap justify-between gap-3">
        <RouterLink to="/dashboard" class="btn-secondary">Cancel</RouterLink>
        <button class="btn-primary px-6" :disabled="saving" type="submit">{{ saving ? 'Saving...' : 'Save assessment and view results' }}</button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { validateAssessmentInput } from '@/services/rulesEngine'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import {
  assessmentDisclaimer,
  assessmentQuestions,
  getAnswerLabel,
  type AssessmentActivity,
  type AssessmentAnswer,
  type AssessmentInput,
  isAssessmentAnswer
} from '@/types'

const router = useRouter()
const store = useAppStore()
const auth = useAuthStore()
const saving = ref(false)
const saveError = ref('')
const validationErrors = ref<string[]>([])
const questions = assessmentQuestions

const form = reactive<AssessmentInput>({
  findings: {
    legMovement: null,
    standing: null,
    walking: null,
    sittingToStanding: null
  },
  additionalNotes: ''
})

const allQuestionsAnswered = computed(() => questions.every(item => !!form.findings[item.key]))

function answerLabel(activity: AssessmentActivity, answer: AssessmentAnswer | null) {
  return getAnswerLabel(activity, answer)
}

function setAnswer(key: AssessmentActivity, answer: AssessmentAnswer) {
  switch (key) {
    case 'legMovement':
      if (isAssessmentAnswer(key, answer)) form.findings.legMovement = answer
      break
    case 'standing':
      if (isAssessmentAnswer(key, answer)) form.findings.standing = answer
      break
    case 'walking':
      if (isAssessmentAnswer(key, answer)) form.findings.walking = answer
      break
    case 'sittingToStanding':
      if (isAssessmentAnswer(key, answer)) form.findings.sittingToStanding = answer
      break
  }
  const question = questions.find(item => item.key === key)?.question
  if (question) validationErrors.value = validationErrors.value.filter(item => item !== question)
  if (!validationErrors.value.length) saveError.value = ''
}

function getSaveErrorMessage(error: unknown): string {
  const messages = error instanceof Error
    ? [error.message]
    : typeof error === 'string'
      ? [error]
      : error && typeof error === 'object'
        ? Object.values(error)
          .filter((value): value is string => typeof value === 'string' && !!value.trim())
        : []
  if (messages.some(message => message.includes('All four lower-limb assessment answers are required.'))) {
    return 'Supabase is still using the old assessment answer validation. In your Supabase SQL Editor, apply docs/migrations/20261030_activity_based_assessment.sql, then retry saving.'
  }
  if (messages.length) return [...new Set(messages)].join(' ')
  if (error && typeof error === 'object') {
    const details = error as { message?: unknown; details?: unknown; hint?: unknown }
    const parts = [details.message, details.details, details.hint]
      .filter((part): part is string => typeof part === 'string' && !!part.trim())
    if (parts.length) return [...new Set(parts)].join(' ')
  }
  console.error('Assessment save failed with an unrecognized error.', error)
  return 'The assessment could not be saved.'
}

async function submit() {
  const missingAnswers = validateAssessmentInput(form)
  validationErrors.value = missingAnswers
  if (missingAnswers.length) {
    saveError.value = 'Answer all four required questions before saving.'
    return
  }
  if (!auth.profile?.id) {
    saveError.value = auth.authError || 'Your signed-in patient profile is unavailable. Reconnect and sign in again before saving.'
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    const assessment = {
      id: crypto.randomUUID(),
      patientId: auth.profile.id,
      date: new Date().toISOString(),
      input: JSON.parse(JSON.stringify(form)) as AssessmentInput,
      recommendations: []
    }
    await store.saveAssessment(assessment)
    await router.push(`/results/${assessment.id}`)
  } catch (error) {
    saveError.value = getSaveErrorMessage(error)
  } finally {
    saving.value = false
  }
}
</script>
