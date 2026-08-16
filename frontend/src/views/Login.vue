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
            <h1 class="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p class="text-[var(--bb-muted)] text-sm mt-1">Sign in to keep your streaks alive</p>
          </div>
        </div>

        <form @submit.prevent="handleLogin" class="card p-6 sm:p-7 space-y-4 rounded-2xl">
          <div v-if="error" class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</div>
          <input v-model="email" type="text" autocomplete="username" placeholder="Email or username" class="input" required />
          <div class="relative">
            <input v-model="password" :type="showPw ? 'text' : 'password'" autocomplete="current-password" placeholder="Password" class="input pr-10" required />
            <button type="button" @click="showPw = !showPw" :aria-label="showPw ? 'Hide password' : 'Show password'" :aria-pressed="showPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--bb-muted)] hover:text-[var(--bb-ink)] transition-colors">
              <Eye v-if="!showPw" :size="16" />
              <EyeOff v-else :size="16" />
            </button>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="stayLoggedIn" type="checkbox"
              class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer" />
            <span class="text-sm text-[var(--bb-muted)]">Stay logged in</span>
          </label>
          <button type="submit" class="btn w-full" :disabled="loading || demoLoading">
            <Loader2 v-if="loading" :size="18" class="animate-spin" />
            <span v-else>Sign In</span>
          </button>
          <p class="text-center text-sm text-[var(--bb-muted)]">
            <router-link to="/forgot-password" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Forgot password?</router-link>
          </p>
          <div class="relative flex items-center gap-3 text-xs text-[var(--bb-faint)]" aria-hidden="true">
            <span class="flex-1 h-px bg-[var(--bb-line)]"></span>
            <span>or</span>
            <span class="flex-1 h-px bg-[var(--bb-line)]"></span>
          </div>
          <button type="button" class="btn-secondary w-full" :disabled="loading || demoLoading" @click="handleDemo">
            <Loader2 v-if="demoLoading" :size="18" class="animate-spin" />
            <span v-else>Try the Demo</span>
          </button>
          <p class="text-center text-sm text-[var(--bb-muted)]">
            Don't have an account?
            <router-link :to="{ path: '/register', query: route.query.redirect ? { redirect: route.query.redirect } : {} }" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Sign up</router-link>
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
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { Loader2, Eye, EyeOff, Sun, Moon } from 'lucide-vue-next'
import Logo from '../components/Logo.vue'
import { useTheme } from '../composables/useTheme'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { isDark, toggleTheme } = useTheme()

const email = ref('')
const password = ref('')
const stayLoggedIn = ref(true)
const error = ref('')
const loading = ref(false)
const demoLoading = ref(false)
const showPw = ref(false)

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value, stayLoggedIn.value)
    toast.success('Welcome back!')
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (e) {
    error.value = e.response?.data?.error || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function handleDemo() {
  demoLoading.value = true
  error.value = ''
  try {
    auth.logout()
    await auth.demoLogin()
    toast.success('Welcome to the demo! Everything is safe to try.')
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Demo is temporarily unavailable. Please try again in a moment.'
  } finally {
    demoLoading.value = false
  }
}

onMounted(() => {
  if (route.query.demo === '1') handleDemo()
})
</script>
