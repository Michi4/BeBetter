<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-3"><Logo :size="56" /></div>
        <h1 class="text-2xl font-bold">BeBetter</h1>
        <p class="text-gray-500 text-sm mt-1">Welcome back</p>
      </div>
      <form @submit.prevent="handleLogin" class="card space-y-4">
        <div v-if="error" class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</div>
        <input v-model="email" type="text" placeholder="Email or username" class="input" required />
        <input v-model="password" type="password" placeholder="Password" class="input" required />
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
          Don't have an account?
          <router-link to="/register" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Sign up</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { Loader2 } from 'lucide-vue-next'
import Logo from '../components/Logo.vue'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const email = ref('')
const password = ref('')
const stayLoggedIn = ref(true)
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value, stayLoggedIn.value)
    toast.success('Welcome back!')
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
