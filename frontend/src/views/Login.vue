<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="flex justify-between mb-8">
        <div class="flex justify-center mb-3"><Logo :size="56" /></div>
        <button @click="toggleTheme" class="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors touch-target" aria-label="Toggle theme">
          <Sun v-if="isDark" :size="18" />
          <Moon v-else :size="18" />
        </button>
      </div>
      <h1 class="text-2xl font-bold">BeBetter</h1>
      <p class="text-gray-500 text-sm mt-1">Welcome back</p>
      <form @submit.prevent="handleLogin" class="card space-y-4">
        <div v-if="error" class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</div>
        <input v-model="email" type="text" placeholder="Email or username" class="input" required />
        <div class="relative">
          <input v-model="password" :type="showPw ? 'text' : 'password'" placeholder="Password" class="input pr-10" required />
          <button type="button" @click="showPw = !showPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
            <Eye v-if="!showPw" :size="16" />
            <EyeOff v-else :size="16" />
          </button>
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="stayLoggedIn" type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer" />
          <span class="text-sm text-gray-400">Stay logged in</span>
        </label>
        <button type="submit" class="btn w-full" :disabled="loading">
          <Loader2 v-if="loading" :size="18" class="animate-spin" />
          <span v-else>Sign In</span>
        </button>
        <p class="text-center text-sm text-gray-500">
          <router-link to="/forgot-password" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Forgot password?</router-link>
        </p>
        <p class="text-center text-sm text-gray-500">
          Don't have an account?
          <router-link :to="{ path: '/register', query: route.query.redirect ? { redirect: route.query.redirect } : {} }" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Sign up</router-link>
        </p>
      </form>
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

const email = ref('')
const password = ref('')
const stayLoggedIn = ref(true)
const error = ref('')
const loading = ref(false)
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
</script>