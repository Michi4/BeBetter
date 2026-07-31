<template>
  <div v-if="alerts.length" class="space-y-2">
    <div
      v-for="n in alerts"
      :key="n.id"
      class="card flex items-start gap-3 py-3"
      :class="alertClass(n.type)"
    >
      <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        :class="iconBg(n.type)">
        <component :is="iconFor(n.type)" :size="13" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm leading-snug">{{ n.message }}</p>
        <div class="flex items-center gap-2 mt-2 flex-wrap">
          <template v-if="n.type === 'challenge_invite' && n.data?.challengeId">
            <router-link :to="`/challenges/${n.data.challengeId}`"
              class="btn text-xs px-3 py-1.5" @click="dismiss(n.id)">
              View Challenge
            </router-link>
            <button @click="dismiss(n.id)" class="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Dismiss</button>
          </template>
          <template v-else-if="n.type === 'buddy_request'">
            <button @click="dismiss(n.id)" class="btn text-xs px-3 py-1.5">Got it</button>
          </template>
          <template v-else>
            <button @click="dismiss(n.id)" class="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Dismiss</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Trophy, Users, Bell, Info } from 'lucide-vue-next'
import api from '../api'

const alerts = ref([])
let pollInterval = null

async function fetchAlerts() {
  try {
    const res = await api.get('/notifications')
    const all = res.data.notifications || []
    alerts.value = all.filter(n => !n.read).slice(0, 5)
  } catch {}
}

async function dismiss(id) {
  try {
    await api.post('/notifications/read', { ids: [id] })
    alerts.value = alerts.value.filter(n => n.id !== id)
  } catch {}
}

function iconFor(type) {
  if (type?.includes('challenge')) return Trophy
  if (type?.includes('buddy')) return Users
  if (type?.includes('friend')) return Users
  return Bell
}

function iconBg(type) {
  if (type?.includes('challenge_invite')) return 'bg-amber-500/20 text-amber-400'
  if (type?.includes('challenge_accepted')) return 'bg-emerald-500/20 text-emerald-400'
  if (type?.includes('challenge_declined')) return 'bg-red-500/20 text-red-400'
  if (type?.includes('buddy')) return 'bg-blue-500/20 text-blue-400'
  if (type?.includes('friend')) return 'bg-purple-500/20 text-purple-400'
  return 'bg-emerald-500/20 text-emerald-400'
}

function alertClass(type) {
  if (type?.includes('challenge_invite')) return 'border-amber-500/20 bg-amber-500/5'
  if (type?.includes('buddy_request')) return 'border-blue-500/20 bg-blue-500/5'
  return ''
}

onMounted(() => {
  fetchAlerts()
  pollInterval = setInterval(fetchAlerts, 30000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>
