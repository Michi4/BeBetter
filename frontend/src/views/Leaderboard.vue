<template>
  <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
    <h1 class="text-xl font-bold">Leaderboard</h1>
    <div class="flex gap-2">
      <button v-for="t in tabs" :key="t.value" @click="activeTab = t.value"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
        :class="activeTab === t.value ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
        {{ t.label }}
      </button>
    </div>

    <div class="card space-y-1">
      <div v-for="(entry, i) in entries" :key="entry.id || i"
        class="flex items-center gap-3 p-2 rounded-lg" :class="i < 3 ? 'bg-emerald-500/5' : ''">
        <span class="w-6 text-center font-bold" :class="i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'">
          {{ i < 3 ? ['🥇','🥈','🥉'][i] : i + 1 }}
        </span>
        <router-link :to="`/profile/${entry.username || entry.id}`" class="flex items-center gap-2 flex-1 min-w-0">
          <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {{ (entry.name || entry.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ entry.name }}</div>
            <div class="text-xs text-gray-500 truncate">@{{ entry.username }}</div>
          </div>
        </router-link>
        <div class="text-right flex-shrink-0">
          <div class="text-sm font-bold text-emerald-400">{{ entry.score || entry.streak || entry.totalCompletions || 0 }}</div>
          <div class="text-[10px] text-gray-500">{{ activeTab === 'challenges' ? 'wins' : 'score' }}</div>
        </div>
      </div>
      <p v-if="!entries.length" class="text-sm text-gray-500 text-center py-4">No entries yet</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'

const toast = useToast()
const activeTab = ref('friends')
const entries = ref([])

const tabs = [
  { label: 'Friends', value: 'friends' },
  { label: 'Global', value: 'global' },
  { label: 'Challenges', value: 'challenges' },
]

async function loadLeaderboard() {
  try {
    let res
    if (activeTab.value === 'friends') res = await api.get('/challenges/leaderboard/friends')
    else if (activeTab.value === 'global') res = await api.get('/leaderboard/global')
    else res = await api.get('/challenges')
    entries.value = res.data.leaderboard || res.data.challenges || res.data || []
  } catch { entries.value = [] }
}

watch(activeTab, loadLeaderboard)
onMounted(loadLeaderboard)
</script>
