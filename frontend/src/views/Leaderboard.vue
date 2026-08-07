<template>
  <div class="page">
    <DemoLock v-if="auth.isDemo" />
    <template v-else>
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

    <!-- Friends / Global leaderboard -->
    <div v-else-if="activeTab !== 'challenges' && entries.length" class="card divide-y divide-gray-800 p-0 overflow-hidden">
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
            <img :src="entry.avatar" :alt="entry.username" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            :class="i < 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-300'"
          >
            {{ (entry.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ entry.username }}</div>
          </div>
        </router-link>

        <div class="text-right flex-shrink-0">
          <div class="text-sm font-bold" :class="i < 3 ? 'text-emerald-400' : 'text-gray-300'">
            {{ entry.score || 0 }}
          </div>
          <div class="text-[10px] text-gray-500">pts</div>
        </div>
      </div>
    </div>

    <!-- Challenges list -->
    <div v-else-if="activeTab === 'challenges' && challenges.length" class="space-y-2">
      <router-link
        v-for="c in challenges"
        :key="c.id"
        :to="`/challenges/${c.id}`"
        class="card flex items-center gap-3 hover:bg-gray-800/50 transition-colors"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
          :class="c.status === 'active' ? 'bg-emerald-500/20' : c.status === 'pending' ? 'bg-amber-500/20' : 'bg-gray-700'">
          {{ c.habit?.emoji || '🏆' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ c.title }}</p>
          <p class="text-[10px] text-gray-500">
            {{ c.creator?.username }} vs {{ c.opponent?.username }}
            <span v-if="c.endDate"> · Ends {{ formatDate(c.endDate) }}</span>
          </p>
        </div>
        <div class="text-right shrink-0">
          <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
            :class="statusClass(c.status)">{{ c.status }}</span>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ c.creatorProgress || 0 }} - {{ c.opponentProgress || 0 }}</p>
        </div>
      </router-link>
    </div>

    <div v-else class="card text-center py-8">
      <Trophy :size="24" class="mx-auto text-gray-500 mb-2" />
      <p class="text-sm text-gray-500">{{ activeTab === 'challenges' ? 'No challenges yet' : 'No entries yet' }}</p>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Loader2, Trophy } from 'lucide-vue-next'
import DemoLock from '../components/DemoLock.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const toast = useToast()
const activeTab = ref('global')
const entries = ref([])
const challenges = ref([])
const loading = ref(false)
const hasFriends = ref(false)

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

function statusClass(s) {
  if (s === 'active') return 'bg-emerald-500/20 text-emerald-400'
  if (s === 'pending') return 'bg-amber-500/20 text-amber-400'
  if (s === 'resolved') return 'bg-gray-700 text-gray-400'
  return 'bg-red-500/20 text-red-400'
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function switchTab(value) {
  activeTab.value = value
  await loadLeaderboard()
}

async function loadLeaderboard() {
  loading.value = true
  entries.value = []
  challenges.value = []
  try {
    if (activeTab.value === 'friends') {
      const res = await api.get('/challenges/leaderboard/friends')
      entries.value = res.data.leaderboard || []
    } else if (activeTab.value === 'global') {
      const res = await api.get('/leaderboard/global')
      entries.value = res.data.leaderboard || []
    } else {
      const res = await api.get('/challenges')
      const seen = new Set()
      challenges.value = (res.data.challenges || []).filter(c => {
        if (seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
    }
  } catch {
    entries.value = []
    challenges.value = []
  }
  loading.value = false
}

onMounted(async () => {
  try {
    const res = await api.get('/friends')
    hasFriends.value = (res.data.friends || []).length > 0
    if (hasFriends.value) activeTab.value = 'friends'
  } catch {}
  await loadLeaderboard()
})
</script>
