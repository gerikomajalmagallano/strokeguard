<template>
  <section class="mx-auto max-w-2xl space-y-5">
    <header><p class="text-sm font-semibold uppercase text-blue-700">Patient information</p><h1 class="mt-1 text-3xl font-bold">Complete your profile</h1><p class="mt-2 text-slate-600">Add the basic information associated with your assessment records.</p></header>
    <form class="card space-y-5" @submit.prevent="submitOnboarding">
      <div><label for="full-name" class="label">Full name</label><input id="full-name" v-model="form.fullName" class="field" autocomplete="name" required /></div>
      <div><label for="patient-age" class="label">Age</label><input id="patient-age" v-model.number="form.age" type="number" min="1" max="120" class="field" required /></div>
      <div><label for="patient-sex" class="label">Sex</label><select id="patient-sex" v-model="form.sex" class="field" required><option disabled value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></div>
      <p v-if="saveError" role="alert" class="text-sm text-red-700">{{ saveError }}</p>
      <button class="btn-primary w-full" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save patient information' }}</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ fullName: auth.profile?.fullName ?? '', age: auth.profile?.age ?? 0, sex: auth.profile?.sex ?? '' })
const saving = ref(false)
const saveError = ref('')

async function submitOnboarding() {
  saving.value = true
  saveError.value = ''
  try {
    await auth.updatePatientInfo({ fullName: form.fullName.trim(), age: form.age, sex: form.sex })
    await router.push('/dashboard')
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Patient information could not be saved.'
  } finally {
    saving.value = false
  }
}
</script>
