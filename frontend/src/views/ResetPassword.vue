<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-3"><Logo :size="56" /></div>
        <h1 class="text-2xl font-bold">Set New Password</h1>
        <p class="text-gray-500 text-sm mt-1">Enter your new password below</p>
      </div>
      <form @submit.prevent="handleSubmit" class="card space-y-4">
        <div v-if="error" class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</div>
        <div v-if="success" class="text-emerald-400 text-sm bg-emerald-500/10 px-3 py-2 rounded-lg">{{ success }}</div>
        <input v-model="password" type="password" placeholder="New password (min 6 chars)" class="input" required minlength="6" />
        <input v-model="confirmPassword" type="password" placeholder="Confirm password" class="input" required minlength="6" />
        <button type="submit" class="btn w-full" :disabled="loading">
          <Loader2 v-if="loading" :size="18" class="animate-spin" />
          <span v-else>Reset Password</span>
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
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { Loader2 } from 'lucide-vue-next'
import Logo from '../components/Logo.vue'

const route = useRoute()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const token = route.query.token
    if (!token) {
      error.value = 'Invalid reset link'
      return
    }
    const res = await api.post('/auth/reset-password', { token, password: password.value })
    success.value = res.data.message || 'Password reset successful'
    setTimeout(() => router.push('/login'), 2000)
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to reset password'
  } finally {
    loading.value = false
  }
}
</script>
