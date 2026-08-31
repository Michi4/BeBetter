<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1" aria-label="Go back"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold truncate">{{ challenge.title }}</h1>
    </div>

    <div v-if="loading" class="text-center py-12">
      <Loader2 :size="24" class="animate-spin mx-auto text-gray-500" />
    </div>

    <template v-else-if="notFound">
      <div class="card text-center py-12">
        <AlertCircle :size="40" class="mx-auto text-red-400 mb-4" />
        <h2 class="text-xl font-bold mb-2">Challenge not found</h2>
        <p class="text-sm text-gray-400 mb-4">This challenge may have been deleted or the link is invalid.</p>
        <router-link to="/dashboard" class="btn">Go to Dashboard</router-link>
      </div>
    </template>
    <template v-else-if="challenge.id">
      <!-- Status badge -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] px-2 py-1 rounded-full font-medium"
          :class="statusClass">{{ challenge.status }}</span>
        <span v-if="challenge.endDate" class="text-xs text-gray-500">
          Ends {{ formatDate(challenge.endDate) }}
        </span>
        <span v-else-if="challenge.status === 'active'" class="text-xs text-gray-500">
          Started {{ formatDate(challenge.startDate) }}
        </span>
      </div>

      <!-- Pending actions -->
      <div v-if="challenge.status === 'pending' && (isOpponent || isCreator)" class="card space-y-3">
        <p class="text-sm text-gray-400">{{ challenge.creator?.username }} challenged you!</p>
        <div class="flex gap-2">
          <button @click="acceptChallenge" class="btn flex-1"><Check :size="14" /> Accept</button>
          <button @click="declineChallenge" class="btn-danger flex-1"><X :size="14" /> Decline</button>
        </div>
      </div>

      <!-- Challenge Habit -->
      <div v-if="challenge.status === 'active' && challenge.habit" class="card">
        <div class="flex items-center gap-3">
          <button v-bind="logTap" @click.stop.prevent :aria-label="iLoggedToday ? 'Challenge habit completed' : 'Complete challenge habit'" class="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150"
            :class="iLoggedToday ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400'">
            <Camera v-if="challenge.habit.verificationType === 'photo' || challenge.habit.verificationType === 'be_better_cam'" :size="18" />
            <CheckCircle2 v-else :size="18" />
          </button>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="font-medium text-sm">{{ challenge.habit.emoji || '' }} {{ challenge.habit.title }}</h4>
              <span v-if="iLoggedToday" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Done</span>
            </div>
            <p v-if="challenge.habit.description" class="text-xs text-gray-500 truncate mt-0.5">{{ challenge.habit.description }}</p>
          </div>
        </div>
      </div>

      <!-- Participants -->
      <div class="grid grid-cols-2 gap-3">
        <div class="card text-center space-y-2">
          <div class="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold mx-auto">
            {{ (challenge.creator?.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="text-sm font-medium">{{ challenge.creator?.username }}</div>
          <div class="text-2xl font-bold text-emerald-400">{{ challenge.creatorProgress || 0 }}</div>
          <div class="text-[10px] text-gray-500">completions</div>
        </div>
        <div class="card text-center space-y-2">
          <div class="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-sm font-bold mx-auto">
            {{ (challenge.opponent?.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="text-sm font-medium">{{ challenge.opponent?.username }}</div>
          <div class="text-2xl font-bold text-amber-400">{{ challenge.opponentProgress || 0 }}</div>
          <div class="text-[10px] text-gray-500">completions</div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="card space-y-2">
        <p class="section-title">Progress</p>
        <div class="flex gap-1 h-4 rounded-full overflow-hidden bg-gray-800">
          <div class="bg-emerald-500 transition-all duration-500 rounded-l-full"
            :style="{ width: creatorPercent + '%' }"></div>
          <div class="bg-amber-500 transition-all duration-500 rounded-r-full"
            :style="{ width: opponentPercent + '%' }"></div>
        </div>
        <div class="flex justify-between text-[10px] text-gray-500">
          <span>{{ challenge.creator?.username }}: {{ creatorPercent }}%</span>
          <span>{{ challenge.opponent?.username }}: {{ opponentPercent }}%</span>
        </div>
      </div>

      <!-- Challenge Grid -->
      <div v-if="gridDays.length" class="card">
        <p class="section-title mb-3">Daily Progress</p>
        <div class="overflow-y-auto max-h-64 space-y-0.5 pr-1 scrollbar-thin">
          <div v-for="day in gridDays" :key="day.date" class="flex items-center gap-3 text-xs py-0.5">
            <span class="text-gray-500 w-24 shrink-0" :class="{ 'text-emerald-400 font-medium': isToday(day.date) }">{{ formatGridDate(day.date) }}</span>
            <div class="flex-1 flex gap-1">
              <div class="h-3 rounded-sm flex-1 transition-all"
                :class="day.creator > 0 ? 'bg-emerald-500' : 'bg-gray-800'"></div>
              <div class="h-3 rounded-sm flex-1 transition-all"
                :class="day.opponent > 0 ? 'bg-amber-500' : 'bg-gray-800'"></div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
          <div class="w-2 h-2 rounded-sm bg-emerald-500"></div> {{ challenge.creator?.username }}
          <div class="w-2 h-2 rounded-sm bg-amber-500 ml-2"></div> {{ challenge.opponent?.username }}
        </div>
      </div>

      <!-- Resolve (only if active) -->
      <div v-if="challenge.status === 'active'" class="flex gap-2">
        <button v-if="creatorProgress > opponentProgress" @click="resolveChallenge(challenge.creator?.id)"
          class="btn flex-1">
          <Trophy :size="14" /> Declare {{ challenge.creator?.username }} winner
        </button>
        <button v-else-if="opponentProgress > creatorProgress" @click="resolveChallenge(challenge.opponent?.id)"
          class="btn flex-1">
          <Trophy :size="14" /> Declare {{ challenge.opponent?.username }} winner
        </button>
        <button v-else @click="resolveChallenge(null)"
          class="btn-secondary flex-1">
          <Handshake :size="14" /> End in Draw
        </button>
      </div>

      <!-- Result -->
      <div v-if="challenge.status === 'resolved'" class="card text-center">
        <Trophy :size="32" class="mx-auto text-amber-400 mb-2" />
        <p class="text-sm font-medium">
          {{ challenge.winnerId ? getWinnerName() + ' wins!' : 'Draw!' }}
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../stores/auth'
import { ArrowLeft, Loader2, Check, X, Trophy, Handshake, CheckCircle2, Camera, AlertCircle } from 'lucide-vue-next'
import { useTap } from '../utils/tapTrigger'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()

const challenge = ref({})
const gridDays = ref([])
const loading = ref(true)
const notFound = ref(false)
const iLoggedToday = ref(false)
const logTap = useTap(() => logChallengeHabit())

const isOpponent = computed(() => auth.user && challenge.value.opponentId === auth.user.id)
const isCreator = computed(() => auth.user && challenge.value.creatorId === auth.user.id)
const creatorPercent = computed(() => {
  const total = (challenge.value.creatorProgress || 0) + (challenge.value.opponentProgress || 0)
  return total ? Math.round(((challenge.value.creatorProgress || 0) / total) * 100) : 50
})
const opponentPercent = computed(() => 100 - creatorPercent.value)

const statusClass = computed(() => {
  const s = challenge.value.status
  if (s === 'active') return 'bg-emerald-500/20 text-emerald-400'
  if (s === 'pending') return 'bg-amber-500/20 text-amber-400'
  if (s === 'resolved') return 'bg-gray-700 text-gray-400'
  return 'bg-red-500/20 text-red-400'
})

function isToday(dateStr) {
  return dateStr === new Date().toISOString().slice(0, 10)
}

async function loadChallenge() {
  loading.value = true
  try {
    const [cRes, gRes] = await Promise.all([
      api.get(`/challenges/${route.params.id}`),
      api.get(`/challenges/${route.params.id}/grid`).catch(() => ({ data: { grid: [] } })),
    ])
    challenge.value = cRes.data.challenge || {}
    gridDays.value = gRes.data.grid || []

    if (challenge.value.status === 'active' && challenge.value.habitId) {
      try {
        const todayLogsRes = await api.get('/logs/today').catch(() => ({ data: { logs: [] } }))
        iLoggedToday.value = (todayLogsRes.data.logs || []).some(l => l.habitId === challenge.value.habitId)
      } catch {
        iLoggedToday.value = false
      }
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

async function logChallengeHabit() {
  if (iLoggedToday.value) return
  try {
    const payload = { habitId: challenge.value.habitId }
    const slot = challengeSlotTime()
    if (slot) payload.scheduledTime = slot
    await api.post('/logs', payload)
    iLoggedToday.value = true
    toast.success('Habit completed!')
    loadChallenge()
  } catch (e) {
    if (e.response?.status === 409) toast.info('Already completed today!')
    else toast.error('Failed')
  }
}

function challengeSlotTime() {
  const scheds = challenge.value?.habit?.schedules || []
  if (!Array.isArray(scheds) || !scheds.length) return null
  const today = new Date().getDay()
  const pick = scheds.find(s => Array.isArray(s.days) && s.days.includes(today)) || scheds[0]
  return pick?.time || null
}

async function acceptChallenge() {
  try {
    await api.post(`/challenges/${route.params.id}/accept`)
    toast.success('Challenge accepted!')
    loadChallenge()
  } catch {
    toast.error('Failed to accept')
  }
}

async function declineChallenge() {
  try {
    await api.post(`/challenges/${route.params.id}/decline`)
    toast.success('Challenge declined')
    router.back()
  } catch {
    toast.error('Failed')
  }
}

async function resolveChallenge(winnerId) {
  try {
    await api.post(`/challenges/${route.params.id}/resolve`, { winnerId })
    toast.success('Challenge resolved')
    loadChallenge()
  } catch {
    toast.error('Failed')
  }
}

function getWinnerName() {
  if (challenge.value.winnerId === challenge.value.creatorId) return challenge.value.creator?.username
  if (challenge.value.winnerId === challenge.value.opponentId) return challenge.value.opponent?.username
  return ''
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatGridDate(d) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

onMounted(loadChallenge)
</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(16, 185, 129, 0.5) rgba(255, 255, 255, 0.03);
}
.scrollbar-thin::-webkit-scrollbar {
  width: 10px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 99px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(16, 185, 129, 0.5);
  border-radius: 99px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 185, 129, 0.75);
  border: 2px solid transparent;
  background-clip: content-box;
}
</style>
