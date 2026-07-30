<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div v-if="loading" class="text-center py-16">
        <Loader2 :size="24" class="animate-spin mx-auto text-gray-500" />
        <p class="text-sm text-gray-500 mt-3">Checking friend link...</p>
      </div>

      <div v-else-if="accepted" class="card text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <Check :size="32" class="text-emerald-400" />
        </div>
        <h2 class="text-xl font-bold">You're now friends!</h2>
        <p class="text-sm text-gray-400">You can now see each other's activity and challenge each other.</p>
        <router-link to="/friends" class="btn w-full">Go to Friends</router-link>
      </div>

      <div v-else-if="error" class="card text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle :size="32" class="text-red-400" />
        </div>
        <h2 class="text-xl font-bold">Link expired or invalid</h2>
        <p class="text-sm text-gray-400">{{ error }}</p>
        <router-link to="/dashboard" class="btn w-full">Go to Dashboard</router-link>
      </div>

      <div v-else-if="auth.user" class="card text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <Users :size="32" class="text-emerald-400" />
        </div>
        <h2 class="text-xl font-bold">Friend Request</h2>
        <p class="text-sm text-gray-400">Someone shared a friend link with you. Accept to become friends!</p>
        <div class="flex gap-2">
          <button @click="acceptFriend" class="btn flex-1" :disabled="accepting">
            <Loader2 v-if="accepting" :size="16" class="animate-spin" />
            <UserPlus v-else :size="16" />
            Accept Friend
          </button>
          <router-link to="/dashboard" class="btn-secondary flex-1">Decline</router-link>
        </div>
      </div>

      <div v-else class="card text-center space-y-4">
        <div class="flex justify-center mb-3"><Logo :size="56" /></div>
        <h2 class="text-xl font-bold">BeBetter</h2>
        <p class="text-sm text-gray-400">Sign in or create an account to accept this friend request</p>
        <div class="flex gap-2">
          <router-link to="/login" class="btn flex-1">Sign In</router-link>
          <router-link to="/register" class="btn-secondary flex-1">Sign Up</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Loader2, Check, AlertTriangle, UserPlus, Users } from 'lucide-vue-next'
import Logo from '../components/Logo.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const error = ref('')
const accepted = ref(false)
const accepting = ref(false)

async function acceptFriend() {
  accepting.value = true
  try {
    const token = route.params.token
    await api.post('/friends/link/accept', { token })
    accepted.value = true
    toast.success('Friend added!')
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to accept friend request'
  }
  accepting.value = false
}

onMounted(async () => {
  const token = route.params.token
  if (!token) {
    error.value = 'No friend token provided'
    loading.value = false
    return
  }

  if (!auth.user) {
    loading.value = false
    return
  }

  try {
    await api.post('/friends/link/accept', { token })
    accepted.value = true
    toast.success('Friend added!')
  } catch (e) {
    error.value = e.response?.data?.error || 'This link may have already been used or expired'
  }
  loading.value = false
})
</script>
