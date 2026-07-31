<template>
  <div class="page">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Notifications</h1>
      <button v-if="unread > 0" @click="markAllRead" class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
        Mark all read
      </button>
    </div>

    <div v-if="notifications.length === 0" class="text-center py-16">
      <Bell :size="32" class="mx-auto text-gray-500 mb-3" />
      <p class="text-sm text-gray-500">No notifications yet</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="card flex items-start gap-3"
        :class="{ 'bg-emerald-500/5 border-emerald-500/20': !n.read }"
      >
        <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          :class="iconClass(n.type)">
          <component :is="iconComponent(n.type)" :size="14" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm">{{ n.message }}</p>
          <p class="text-[10px] text-gray-500 mt-1">{{ formatTime(n.createdAt) }}</p>

          <div v-if="n.type === 'challenge_invite' && n.data?.challengeId && !n.read" class="flex gap-2 mt-2">
            <router-link v-if="n.data.challengeId" :to="`/challenges/${n.data.challengeId}`"
              class="btn text-xs px-3 py-1.5" @click="markRead(n.id)">
              <Eye :size="12" /> View
            </router-link>
          </div>

          <div v-if="n.type === 'buddy_request' && !n.read" class="mt-2">
            <span class="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
              You have a new accountability buddy!
            </span>
          </div>
        </div>
        <button v-if="!n.read" @click="markRead(n.id)" class="text-[10px] text-emerald-400 hover:text-emerald-300 shrink-0 mt-1">
          Read
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import { Bell, Trophy, Users, Eye, Shield } from 'lucide-vue-next'

const notifications = ref([])
const unread = ref(0)

async function loadNotifications() {
  try {
    const res = await api.get('/notifications')
    notifications.value = res.data.notifications || []
    unread.value = res.data.unread || 0
  } catch {
    // silent
  }
}

async function markRead(id) {
  try {
    await api.post('/notifications/read', { ids: [id] })
    notifications.value = notifications.value.map(n => n.id === id ? { ...n, read: true } : n)
    unread.value = Math.max(0, unread.value - 1)
  } catch {
    // silent
  }
}

async function markAllRead() {
  try {
    await api.post('/notifications/read')
    notifications.value = notifications.value.map(n => ({ ...n, read: true }))
    unread.value = 0
  } catch {
    // silent
  }
}

function iconComponent(type) {
  if (type?.includes('challenge')) return Trophy
  if (type?.includes('buddy')) return Users
  return Bell
}

function iconClass(type) {
  if (type?.includes('challenge_invite')) return 'bg-amber-500/20 text-amber-400'
  if (type?.includes('challenge_accepted')) return 'bg-emerald-500/20 text-emerald-400'
  if (type?.includes('challenge_declined')) return 'bg-red-500/20 text-red-400'
  if (type?.includes('buddy')) return 'bg-blue-500/20 text-blue-400'
  return 'bg-emerald-500/20 text-emerald-400'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(loadNotifications)
</script>
