<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">🔥</div>
        <h1 class="text-2xl font-bold">BeBetter</h1>
        <p class="text-gray-500 text-sm mt-1">Start your journey</p>
      </div>
      <form @submit.prevent="handleRegister" class="card space-y-4">
        <div v-if="error" class="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</div>
        <input v-model="form.name" type="text" placeholder="Full name" class="input" required />
        <input v-model="form.username" type="text" placeholder="Username (3-20 chars)" class="input" required
          minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]+" />
        <input v-model="form.email" type="email" placeholder="Email" class="input" required />
        <input v-model="form.password" type="password" placeholder="Password" class="input" required minlength="6" />
        <input v-if="!form.referralCode" v-model="form.referralCode" type="text" placeholder="Referral code (optional)" class="input" />
        <div v-else class="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
          Referred by: {{ form.referralCode }}
          <button type="button" @click="form.referralCode = ''" class="ml-2 text-gray-400 hover:text-gray-200 transition-colors duration-150">✕</button>
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="stayLoggedIn" type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer" />
          <span class="text-sm text-gray-400">Stay logged in</span>
        </label>
        <button type="submit" class="btn w-full" :disabled="loading">
          <Loader2 v-if="loading" :size="18" class="animate-spin" />
          <span v-else>Create Account</span>
        </button>
        <p class="text-center text-sm text-gray-500">
          Already have an account?
          <router-link to="/login" class="text-emerald-400 hover:text-emerald-300 transition-colors duration-150">Sign in</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { Loader2 } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const form = ref({ name: '', username: '', email: '', password: '', referralCode: '' })
const stayLoggedIn = ref(true)
const error = ref('')
const loading = ref(false)

onMounted(() => {
  if (route.query.ref) form.value.referralCode = route.query.ref
})

async function handleRegister() {
  loading.value = true
  error.value = ''
  try {
    await auth.register({ ...form.value, stayLoggedIn: stayLoggedIn.value })
    toast.success('Account created!')
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
