<template>
  <section class="mx-auto max-w-4xl space-y-6">
    <header>
      <p class="text-sm font-semibold uppercase text-blue-700">New assessment</p>
      <h1 class="mt-1 text-3xl font-bold">Lower-limb assessment</h1>
      <p class="mt-2 text-slate-600">Answer all four questions to receive transparent, rules-based exercise guidance.</p>
    </header>

    <form class="space-y-5" @submit.prevent="submit">
      <div class="card space-y-5">
        <div>
          <h2 class="text-xl font-bold">Lower-limb functional questions</h2>
          <p class="mt-1 text-sm text-slate-600">These are proposed self-reported findings, not a clinically validated assessment instrument.</p>
        </div>
        <fieldset v-for="item in questions" :key="item.key" :aria-describedby="validationErrors.includes(item.question) ? `${item.key}-error` : undefined">
          <legend class="label">{{ item.question }} <span class="text-red-700" aria-hidden="true">*</span></legend>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label v-for="option in item.options" :key="option" class="option justify-center text-center" :class="form.findings[item.key] === option ? 'border-blue-600 bg-blue-50 text-blue-800' : ''">
              <input
                class="sr-only"
                type="radio"
                :name="item.key"
                :value="option"
                :checked="form.findings[item.key] === option"
                :required="option === item.options[0]"
                :aria-invalid="validationErrors.includes(item.question)"
                @change="setAnswer(item.key, option)"
              >
              <span class="rounded peer-focus-visible:ring-2 peer-focus-visible:ring-teal-700 peer-focus-visible:ring-offset-2">{{ option }}</span>
            </label>
          </div>
          <p v-if="validationErrors.includes(item.question)" :id="`${item.key}-error`" class="mt-2 text-sm text-red-700">Select an answer to continue.</p>
        </fieldset>
        <div>
          <label for="assessment-notes" class="label">Notes (optional)</label>
          <textarea id="assessment-notes" v-model="form.notes" rows="3" class="field" placeholder="Optional notes about these lower-limb findings"></textarea>
        </div>
        <div class="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">StrokeGuard is a research prototype. It does not diagnose stroke or replace professional medical advice.</div>
      </div>

      <p v-if="saveError" role="alert" class="text-sm text-red-700">{{ saveError }}</p>
      <div class="flex flex-wrap justify-between gap-3">
        <RouterLink to="/dashboard" class="btn-secondary">Cancel</RouterLink>
        <button class="btn-primary px-6" :disabled="saving" type="submit">{{ saving ? 'Saving…' : 'Save assessment and view results' }}</button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { evaluateAssessment } from '@/services/rulesEngine'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import type { AssessmentFindings, AssessmentInput, FindingAnswer } from '@/types'

const router = useRouter()
const store = useAppStore()
const auth = useAuthStore()
const saving = ref(false)
const saveError = ref('')
const validationErrors = ref<string[]>([])
const difficultyOptions = ['Mild difficulty', 'Moderate difficulty', 'Severe difficulty'] as const
const questions = [
  {
    key: 'legMovement',
    question: 'How hard is it to move your affected leg?',
    options: ['Normal', ...difficultyOptions]
  },
  {
    key: 'standing',
    question: 'How hard is it to stand?',
    options: ['No reported difficulty', ...difficultyOptions]
  },
  {
    key: 'walking',
    question: 'How hard is it to walk?',
    options: ['No reported difficulty', ...difficultyOptions]
  },
  {
    key: 'sittingToStanding',
    question: 'How hard is it to get up from a chair?',
    options: ['No reported difficulty', ...difficultyOptions]
  }
] as const

const form = reactive<AssessmentInput>({
  findings: {
    legMovement: null,
    standing: null,
    walking: null,
    sittingToStanding: null
  },
  notes: ''
})

function setAnswer(key: keyof AssessmentFindings, answer: FindingAnswer) {
  form.findings[key] = answer
  const question = questions.find(item => item.key === key)?.question
  if (question) validationErrors.value = validationErrors.value.filter(item => item !== question)
  if (!validationErrors.value.length) saveError.value = ''
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string' && error.trim()) return error
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
  const evaluation = evaluateAssessment(form)
  validationErrors.value = evaluation.missingAnswers
  if (evaluation.missingAnswers.length) {
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
      recommendations: evaluation.recommendations
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
