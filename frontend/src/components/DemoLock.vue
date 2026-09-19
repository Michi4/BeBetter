<template>
  <div class="page flex flex-col items-center justify-center min-h-[50vh] text-center">
    <div
      class="w-16 h-16 rounded-2xl bg-[var(--bb-accent)]/10 border border-[var(--bb-accent)]/20 flex items-center justify-center mb-4"
    >
      <Sparkles :size="28" class="text-[var(--bb-accent)]" />
    </div>
    <h1 class="text-xl font-bold text-[var(--bb-ink)]">This is the demo account</h1>
    <p class="text-sm text-[var(--bb-muted)] max-w-sm mx-auto leading-relaxed">
      {{ message }}
    </p>
    <div class="flex flex-col sm:flex-row gap-2 mt-5 w-full max-w-xs sm:max-w-none sm:w-auto">
      <button @click="handleSignUp" class="btn flex-1 sm:flex-none sm:px-8">
        <UserPlus :size="16" /> Create free account
      </button>
      <router-link to="/dashboard" class="btn-secondary flex-1 sm:flex-none sm:px-8">
        Back to dashboard
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { Sparkles, UserPlus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

defineProps({
  message: {
    type: String,
    default: 'Sign up free to unlock social features like friends, leaderboards, and notifications. Your own streaks will be saved to your account.',
  },
})

function handleSignUp() {
  auth.logout()
  router.push('/register')
}
</script>