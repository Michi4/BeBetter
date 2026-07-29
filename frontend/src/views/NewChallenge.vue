<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold">New Challenge</h1>
    </div>

    <div class="card space-y-4">
      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Opponent</label>
        <input
          v-model="searchQuery"
          @input="debouncedSearch"
          type="text"
          placeholder="Search friends..."
          class="input"
        />
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
          <button
            v-for="u in searchResults"
            :key="u.id"
            @click="selectOpponent(u)"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-150 text-left"
          >
            <div class="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
              {{ (u.name || 'U')[0].toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="text-sm truncate">{{ u.name }}</div>
              <div class="text-xs text-gray-500 truncate">@{{ u.username }}</div>
            </div>
          </button>
        </div>
        <p v-else-if="searchQuery.length >= 2 && !searchResults.length" class="text-xs text-gray-500 mt-1">
          No friends found
        </p>
      </div>

      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Title</label>
        <input v-model="form.title" class="input" placeholder="e.g. 30-Day Pushup Challenge" />
      </div>

      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Stake</label>
        <input v-model="form.stake" class="input" placeholder="e.g. Loser buys coffee" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-gray-400 mb-1 block">Start date</label>
          <input v-model="form.startDate" type="date" class="input" />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-400 mb-1 block">End date</label>
          <input v-model="form.endDate" type="date" class="input" />
        </div>
      </div>

      <button @click="createChallenge" class="btn w-full" :disabled="!isValid">
        <Trophy :size="16" /> Create Challenge
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { ArrowLeft, X, Trophy } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()

const searchQuery = ref('')
const searchResults = ref([])
const form = reactive({
  opponentId: '',
  opponentName: '',
  title: '',
  stake: '',
  startDate: '',
  endDate: ''
})

const isValid = computed(() => form.opponentId && form.title && form.startDate && form.endDate)

let debounceTimer = null
function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(searchUsers, 300)
}

async function searchUsers() {
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  try {
    const res = await api.get('/friends/search', { params: { q: searchQuery.value } })
    searchResults.value = (res.data.users || res.data || []).slice(0, 5)
  } catch {
    searchResults.value = []
  }
}

function selectOpponent(u) {
  form.opponentId = u.id
  form.opponentName = u.name || u.username
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
    await api.post('/challenges', {
      opponentId: form.opponentId,
      title: form.title,
      stake: form.stake,
      startDate: form.startDate,
      endDate: form.endDate
    })
    toast.success('Challenge created!')
    router.push('/leaderboard')
  } catch {
    toast.error('Failed to create challenge')
  }
}
</script>
