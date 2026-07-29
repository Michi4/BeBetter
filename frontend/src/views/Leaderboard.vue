<template>
  <div class="page">
    <h1 class="text-xl font-bold">Leaderboard</h1>

    <div class="flex gap-2">
      <button
        v-for="t in tabs"
        :key="t.value"
        @click="switchTab(t.value)"
        class="flex-1 py-2.5 rounded-full text-xs font-medium transition-colors"
        :class="activeTab === t.value
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
        style="min-height: 44px"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <Loader2 :size="24" class="animate-spin mx-auto text-gray-500" />
    </div>

    <div v-else-if="entries.length" class="card divide-y divide-gray-800 p-0 overflow-hidden">
      <div
        v-for="(entry, i) in entries"
        :key="entry.id || i"
        class="flex items-center gap-3 p-3"
      >
        <span
          class="w-7 text-center font-bold text-sm flex-shrink-0"
          :class="rankColor(i)"
        >
          {{ rankLabel(i) }}
        </span>

        <router-link :to="`/profile/${entry.username || entry.id}`" class="flex items-center gap-2 flex-1 min-w-0">
          <div v-if="entry.avatar" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <img :src="entry.avatar" :alt="entry.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            :class="i < 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-300'"
          >
            {{ (entry.name || entry.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ entry.name }}</div>
            <div class="text-xs text-gray-500 truncate">@{{ entry.username }}</div>
          </div>
        </router-link>

        <div class="text-right flex-shrink-0">
          <div class="text-sm font-bold" :class="i < 3 ? 'text-emerald-400' : 'text-gray-300'">
            {{ entry.score || entry.streak || entry.totalCompletions || 0 }}
          </div>
          <div class="text-[10px] text-gray-500">{{ activeTab === 'challenges' ? 'wins' : 'pts' }}</div>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-8">
      <Trophy :size="24" class="mx-auto text-gray-500 mb-2" />
      <p class="text-sm text-gray-500">No entries yet</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Loader2, Trophy } from 'lucide-vue-next'

const toast = useToast()
const activeTab = ref('friends')
const entries = ref([])
const loading = ref(false)

const tabs = [
  { label: 'Friends', value: 'friends' },
  { label: 'Global', value: 'global' },
  { label: 'Challenges', value: 'challenges' },
]

function rankColor(i) {
  if (i === 0) return 'text-yellow-400'
  if (i === 1) return 'text-gray-300'
  if (i === 2) return 'text-amber-600'
  return 'text-gray-500'
}

function rankLabel(i) {
  if (i === 0) return '\u{1F947}'
  if (i === 1) return '\u{1F948}'
  if (i === 2) return '\u{1F949}'
  return String(i + 1)
}

async function switchTab(value) {
  activeTab.value = value
  await loadLeaderboard()
}

async function loadLeaderboard() {
  loading.value = true
  entries.value = []
  try {
    let res
    if (activeTab.value === 'friends') {
      res = await api.get('/challenges/leaderboard/friends')
    } else if (activeTab.value === 'global') {
      res = await api.get('/leaderboard/global')
    } else {
      res = await api.get('/challenges')
    }
    entries.value = res.data.leaderboard || res.data.challenges || res.data || []
  } catch {
    entries.value = []
  }
  loading.value = false
}

onMounted(loadLeaderboard)
</script>
