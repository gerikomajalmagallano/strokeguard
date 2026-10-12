<template>
  <section class="mx-auto max-w-2xl space-y-5">
    <header><p class="text-sm font-semibold uppercase text-blue-700">Patient information</p><h1 class="mt-1 text-3xl font-bold">Your information</h1></header>
    <form class="card space-y-5" @submit.prevent="saveProfile">
      <div><label for="patient-name" class="label">Full name</label><input id="patient-name" v-model="form.fullName" class="field" required /></div>
      <div><label for="patient-age" class="label">Age</label><input id="patient-age" v-model.number="form.age" type="number" min="1" max="120" class="field" required /></div>
      <div><label for="patient-sex" class="label">Sex</label><select id="patient-sex" v-model="form.sex" class="field" required><option disabled value="">Select</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></div>
      <div><label class="label">Account email</label><p class="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{{ auth.profile?.email }}</p></div>
      <p v-if="saved" role="status" class="text-sm text-teal-800">Patient information saved.</p>
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      <button class="btn-primary" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save information' }}</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const form = reactive({ fullName: auth.profile?.fullName ?? '', age: auth.profile?.age ?? 0, sex: auth.profile?.sex ?? '' })
const saving = ref(false)
const saved = ref(false)
const error = ref('')

async function saveProfile() {
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    await auth.updatePatientInfo({ fullName: form.fullName.trim(), age: form.age, sex: form.sex })
    saved.value = true
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Patient information could not be saved.'
  } finally {
    saving.value = false
  }
}
</script>
