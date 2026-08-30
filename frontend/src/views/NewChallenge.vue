<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold">New Challenge</h1>
    </div>

    <div class="card space-y-4">
      <!-- Habit picker -->
      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Habit to challenge on</label>
        <div v-if="habits.length" class="space-y-1">
          <button v-for="h in habits" :key="h.id" @click="form.habitId = h.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left"
            :class="form.habitId === h.id ? 'bg-emerald-600/20 border border-emerald-500/40' : 'hover:bg-gray-800 border border-transparent'">
            <span class="text-lg">{{ h.emoji || '🎯' }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ h.title }}</div>
              <div class="text-xs text-gray-500">{{ formatRecurrence(h) }}</div>
            </div>
            <Check v-if="form.habitId === h.id" :size="16" class="text-emerald-400 shrink-0" />
          </button>
        </div>
        <p v-else class="text-sm text-gray-500">No active habits to challenge on.</p>
      </div>

      <!-- Opponent -->
      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Opponent</label>
        <input v-model="searchQuery" @input="debouncedSearch" type="text"
          placeholder="Search friends..." class="input" />
        <div v-if="form.opponentId" class="mt-2 flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
            {{ (form.opponentName || 'U')[0].toUpperCase() }}
          </div>
          <span class="text-sm text-emerald-400">{{ form.opponentName }}</span>
          <button @click="clearOpponent" class="ml-auto text-gray-500 hover:text-gray-300 shrink-0 touch-target">
            <X :size="14" />
          </button>
        </div>
        <div v-else-if="searchResults.length" class="mt-2 space-y-1">
          <button v-for="u in searchResults" :key="u.id" @click="selectOpponent(u)"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left">
            <div class="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
              {{ (u.username || 'U')[0].toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="text-sm truncate">{{ u.username }}</div>
            </div>
          </button>
        </div>
        <p v-else-if="searchQuery.length >= 2 && !searchResults.length" class="text-xs text-gray-500 mt-1">
          No friends found
        </p>
      </div>

      <!-- End date -->
      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">End date (optional)</label>
        <input v-model="form.endDate" type="date" class="input" :min="todayStr" />
        <p class="text-[10px] text-gray-500 mt-1">Leave empty for an open-ended battle. Anyone can resolve it with a winner or a draw.</p>
      </div>

      <button @click="createChallenge" class="btn w-full" :disabled="!isValid">
        <Trophy :size="16" /> Create Challenge
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { ArrowLeft, X, Trophy, Check } from 'lucide-vue-next'
import { formatRecurrence } from '../utils/scheduleFormat'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const habits = ref([])
const searchQuery = ref('')
const searchResults = ref([])
const todayStr = new Date().toISOString().slice(0, 10)
const form = reactive({
  habitId: '',
  opponentId: '',
  opponentName: '',
  endDate: ''
})

const isValid = computed(() => form.habitId && form.opponentId)

let debounceTimer = null
function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(searchUsers, 300)
}

async function searchUsers() {
  if (searchQuery.value.length < 2) { searchResults.value = []; return }
  try {
    const res = await api.get('/friends/search', { params: { q: searchQuery.value } })
    searchResults.value = (res.data.users || res.data || []).slice(0, 5)
  } catch { searchResults.value = [] }
}

function selectOpponent(u) {
  form.opponentId = u.id
  form.opponentName = u.username || u.name
  searchResults.value = []
  searchQuery.value = ''
}

function clearOpponent() {
  form.opponentId = ''
  form.opponentName = ''
}

async function createChallenge() {
  if (!isValid.value) return
  try {
    const payload = { habitId: form.habitId, opponentId: form.opponentId }
    if (form.endDate) payload.endDate = form.endDate
    await api.post('/challenges', payload)
    toast.success('Challenge created!')
    router.push('/leaderboard')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to create challenge')
  }
}

onMounted(async () => {
  try {
    const res = await api.get('/habits')
    habits.value = (res.data.habits || []).filter(h => h.active !== false)
  } catch {}

  const userId = route.query.user
  if (userId) {
    try {
      const res = await api.get('/friends')
      const users = Array.isArray(res.data) ? res.data : (res.data.friends || res.data.users || [])
      const match = users.find(u => String(u.id) === String(userId) || u.username === userId)
      if (match) selectOpponent(match)
    } catch {}
  }
})
</script>
