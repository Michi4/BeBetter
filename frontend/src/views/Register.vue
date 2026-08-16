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
            <h1 class="text-2xl font-bold tracking-tight">Start your journey</h1>
          </div>
        </div>

        <form @submit.prevent="handleRegister" class="card p-6 sm:p-7 space-y-4 rounded-2xl">
          <div v-if="error" class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</div>
          <input v-model="form.username" type="text" placeholder="Username" class="input" required
            minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]+"
            title="3-20 characters, letters, numbers and underscores only" />
          <input v-model="form.email" type="email" autocomplete="email" placeholder="Email" class="input" required />
          <div class="relative">
            <input v-model="form.password" :type="showPw ? 'text' : 'password'" autocomplete="new-password" placeholder="Password (min 6 chars)" class="input pr-10" required minlength="6" />
            <button type="button" @click="showPw = !showPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--bb-muted)] hover:text-[var(--bb-ink)] transition-colors">
              <Eye v-if="!showPw" :size="16" />
              <EyeOff v-else :size="16" />
            </button>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="stayLoggedIn" type="checkbox"
              class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer" />
            <span class="text-sm text-[var(--bb-muted)]">Stay logged in</span>
          </label>
          <label class="flex items-start gap-2.5 cursor-pointer select-none">
            <input v-model="agreeTerms" type="checkbox" required
              class="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer" />
            <span class="text-xs text-[var(--bb-muted)] leading-relaxed">
              I am at least 16 years old (or have my parent's or guardian's permission), and I agree to the
              <router-link to="/terms" target="_blank" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">Terms of Service</router-link>
              and
              <router-link to="/privacy" target="_blank" class="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">Privacy Policy</router-link>.
            </span>
          </label>
          <button type="submit" class="btn w-full" :disabled="loading || !agreeTerms">
            <Loader2 v-if="loading" :size="18" class="animate-spin" />
            <span v-else>Create Account</span>
          </button>
          <p class="text-center text-sm text-[var(--bb-muted)]">
            Already have an account?
            <router-link :to="{ path: '/login', query: route.query.redirect ? { redirect: route.query.redirect } : {} }" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Sign in</router-link>
          </p>
        </form>

        <p class="text-center text-xs text-[var(--bb-faint)] mt-6">
          By creating an account you accept our
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

const form = ref({ username: '', email: '', password: '' })
const stayLoggedIn = ref(true)
const agreeTerms = ref(false)
const error = ref('')
const loading = ref(false)
const showPw = ref(false)

async function handleRegister() {
  if (!agreeTerms.value) {
    error.value = 'Please accept the Terms of Service and Privacy Policy to continue'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await auth.register({ ...form.value, agreeToTerms: true, stayLoggedIn: stayLoggedIn.value })
    toast.success('Account created!')
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (e) {
    error.value = e.response?.data?.error || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
