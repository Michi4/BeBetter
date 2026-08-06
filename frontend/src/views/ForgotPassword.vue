<template>
  <div class="min-h-screen bg-[var(--bb-bg)] text-[var(--bb-ink)] flex flex-col relative overflow-hidden">
    <div class="absolute top-4 right-4 z-10">
      <button @click="toggleTheme" class="p-2.5 rounded-lg text-[var(--bb-muted)] hover:text-[var(--bb-ink)] hover:bg-[var(--bb-line)] transition-colors touch-target inline-flex items-center justify-center" aria-label="Toggle theme">
        <Sun v-if="isDark" :size="18" />
        <Moon v-else :size="18" />
      </button>
    </div>

    <div class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm">
        <div class="flex flex-col items-center gap-4 mb-8">
          <Logo :size="56" />
          <div class="text-center">
            <h1 class="text-2xl font-bold tracking-tight">Reset Password</h1>
            <p class="text-[var(--bb-muted)] text-sm mt-1">Enter your email to receive a reset link</p>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="card p-6 sm:p-7 space-y-4 rounded-2xl">
          <div v-if="error" class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</div>
          <div v-if="success" class="text-emerald-400 text-sm bg-emerald-500/10 px-3 py-2 rounded-lg">{{ success }}</div>
          <input v-model="email" type="email" autocomplete="email" placeholder="Email" class="input" required />
          <button type="submit" class="btn w-full" :disabled="loading">
            <Loader2 v-if="loading" :size="18" class="animate-spin" />
            <span v-else>Send Reset Link</span>
          </button>
          <p class="text-center text-sm text-[var(--bb-muted)]">
            <router-link to="/login" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Back to Sign In</router-link>
          </p>
        </form>

        <p class="text-center text-xs text-[var(--bb-faint)] mt-6">
          <router-link to="/terms" class="hover:text-[var(--bb-muted)] underline underline-offset-2">Terms</router-link>
          &middot;
          <router-link to="/privacy" class="hover:text-[var(--bb-muted)] underline underline-offset-2">Privacy</router-link>
          &middot;
          <router-link to="/imprint" class="hover:text-[var(--bb-muted)] underline underline-offset-2">Imprint</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api'
import { Loader2, Sun, Moon } from 'lucide-vue-next'
import Logo from '../components/Logo.vue'
import { useTheme } from '../composables/useTheme'

const email = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)
const { isDark, toggleTheme } = useTheme()

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
