<template>
  <div class="page">
    <div class="flex items-center gap-2 mb-4">
      <button @click="$router.back()" class="btn-ghost p-1" aria-label="Go back"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold">Challenge Invite</h1>
    </div>

    <div v-if="loading" class="text-center py-12">
      <Loader2 :size="24" class="animate-spin mx-auto text-gray-500" />
    </div>

    <div v-else-if="error" class="card text-center py-8">
      <AlertCircle :size="32" class="mx-auto text-red-400 mb-3" />
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-else-if="challenge" class="space-y-4">
      <div class="card space-y-4 text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center text-3xl mx-auto">
          {{ challenge.habit?.emoji || '🎯' }}
        </div>
        <div>
          <h2 class="text-lg font-bold">{{ challenge.habit?.title }}</h2>
          <p class="text-sm text-gray-500 mt-1">Challenge from <span class="text-emerald-400">{{ challenge.creator?.username }}</span></p>
        </div>
        <div v-if="challenge.habit?.description" class="text-sm text-gray-400">{{ challenge.habit.description }}</div>
        <div class="flex justify-center gap-4 text-xs text-gray-500">
          <span>{{ formatRecurrence(challenge.habit) }}</span>
          <span v-if="challenge.endDate">Ends {{ formatDate(challenge.endDate) }}</span>
        </div>
      </div>

      <div class="flex gap-2">
        <button @click="acceptInvite" class="btn flex-1" :disabled="accepting">
          <Check :size="16" />
          {{ accepting ? 'Accepting...' : 'Accept Challenge' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const challenge = ref(null)
const loading = ref(true)
const accepting = ref(false)
const error = ref('')

async function loadInvite() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get(`/challenges/invite/${route.params.token}`)
    challenge.value = res.data.challenge
  } catch (e) {
    error.value = e.response?.data?.error || 'Invalid or expired invite link'
  } finally {
    loading.value = false
  }
}

async function acceptInvite() {
  accepting.value = true
  try {
    const res = await api.post(`/challenges/invite/${route.params.token}/accept`)
    toast.success('Challenge accepted!')
    router.push(`/challenges/${res.data.challenge.id}`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to accept invite')
  } finally {
    accepting.value = false
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRecurrence(h) {
  if (!h) return 'Daily'
  if (h.frequencyType === 'daily' || h.frequencyType === 'always') return 'Daily'
  const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'))
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (h.frequencyType === 'days_per_week') return `${sched.length}x per week`
  return (Array.isArray(sched) ? sched : []).map(d => days[d]).filter(Boolean).join(', ') || 'Daily'
}

onMounted(loadInvite)
</script>
