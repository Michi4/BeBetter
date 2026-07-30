<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-3"><Logo :size="56" /></div>
        <h1 class="text-2xl font-bold">Reset Password</h1>
        <p class="text-gray-500 text-sm mt-1">Enter your email to receive a reset link</p>
      </div>
      <form @submit.prevent="handleSubmit" class="card space-y-4">
        <div v-if="error" class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</div>
        <div v-if="success" class="text-emerald-400 text-sm bg-emerald-500/10 px-3 py-2 rounded-lg">{{ success }}</div>
        <input v-model="email" type="email" placeholder="Email" class="input" required />
        <button type="submit" class="btn w-full" :disabled="loading">
          <Loader2 v-if="loading" :size="18" class="animate-spin" />
          <span v-else>Send Reset Link</span>
        </button>
        <p class="text-center text-sm text-gray-500">
          <router-link to="/login" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Back to Sign In</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api'
import { Loader2 } from 'lucide-vue-next'
import Logo from '../components/Logo.vue'

const email = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

async function handleSubmit() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const res = await api.post('/auth/forgot-password', { email: email.value })
    success.value = res.data.message || 'If an account exists, a reset link has been sent'
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to send reset link'
  } finally {
    loading.value = false
  }
}
</script>
