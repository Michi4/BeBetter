<template>
  <div class="max-w-lg mx-auto px-4 py-6 space-y-6">
    <div class="flex items-center gap-3">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold">New Challenge</h1>
    </div>

    <div class="card space-y-4">
      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Opponent</label>
        <input v-model="searchQuery" @input="searchUsers" type="text" placeholder="Search friend..." class="input" />
        <div v-if="searchResults.length" class="mt-1 space-y-1">
          <button v-for="u in searchResults" :key="u.id" @click="selectOpponent(u)"
            class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors duration-150">
            {{ u.name }} (@{{ u.username }})
          </button>
        </div>
        <div v-if="form.opponentId" class="mt-1 text-xs text-emerald-400">Selected: {{ form.opponentName }}</div>
      </div>

      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Title</label>
        <input v-model="form.title" class="input" placeholder="Challenge title" />
      </div>

      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Stake</label>
        <input v-model="form.stake" class="input" placeholder="e.g. $10 coffee" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-gray-400 mb-1 block">Start</label>
          <input v-model="form.startDate" type="date" class="input" />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-400 mb-1 block">End</label>
          <input v-model="form.endDate" type="date" class="input" />
        </div>
      </div>

      <button @click="createChallenge" class="btn w-full" :disabled="!isValid">Create Challenge</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()

const searchQuery = ref('')
const searchResults = ref([])
const form = reactive({ opponentId: '', opponentName: '', title: '', stake: '', startDate: '', endDate: '' })

const isValid = computed(() => form.opponentId && form.title && form.startDate && form.endDate)

let searchTimeout = null
function searchUsers() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (searchQuery.value.length < 2) { searchResults.value = []; return }
    try {
      const res = await api.get('/friends/search', { params: { q: searchQuery.value } })
      searchResults.value = (res.data.users || res.data || []).slice(0, 5)
    } catch { searchResults.value = [] }
  }, 300)
}

function selectOpponent(u) {
  form.opponentId = u.id
  form.opponentName = u.name || u.username
  searchResults.value = []
  searchQuery.value = ''
}

async function createChallenge() {
  try {
    await api.post('/challenges', form)
    toast.success('Challenge created!')
    router.push('/leaderboard')
  } catch { toast.error('Failed') }
}
</script>
