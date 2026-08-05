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
          <p v-if="n.type === 'announcement'" class="text-sm font-semibold">{{ n.data?.title || 'Announcement' }}</p>
          <p class="text-sm" :class="n.type === 'announcement' ? 'text-gray-400 mt-0.5' : ''">{{ n.message }}</p>
          <p class="text-[10px] text-gray-500 mt-1">{{ formatTime(n.createdAt) }}</p>

          <div v-if="n.type === 'challenge_invite' && n.data?.challengeId && !n.read" class="flex gap-2 mt-2">
            <button @click="acceptChallenge(n)" class="btn text-xs px-3 py-1.5">
              <Check :size="12" /> Accept
            </button>
            <button @click="declineChallenge(n)" class="btn-secondary text-xs px-3 py-1.5">
              <X :size="12" /> Decline
            </button>
          </div>

          <div v-if="n.type === 'friend_request' && n.data?.requestId && !n.read" class="flex gap-2 mt-2">
            <button @click="acceptFriendRequest(n)" class="btn text-xs px-3 py-1.5">
              <Check :size="12" /> Accept
            </button>
            <button @click="declineFriendRequest(n)" class="btn-secondary text-xs px-3 py-1.5">
              <X :size="12" /> Decline
            </button>
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
import { useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Bell, Trophy, Users, Eye, Shield, Megaphone, Check, X } from 'lucide-vue-next'

const toast = useToast()
const router = useRouter()

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

async function acceptChallenge(n) {
  try {
    await api.post(`/challenges/${n.data.challengeId}/accept`)
    toast.success('Challenge accepted!')
    markRead(n.id)
    router.push(`/challenges/${n.data.challengeId}`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to accept challenge')
  }
}

async function declineChallenge(n) {
  if (!confirm('Decline this challenge?')) return
  try {
    await api.post(`/challenges/${n.data.challengeId}/decline`)
    toast.success('Challenge declined')
    markRead(n.id)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to decline challenge')
  }
}

async function acceptFriendRequest(n) {
  try {
    await api.post(`/friends/request/${n.data.requestId}/accept`)
    toast.success('Friend request accepted')
    markRead(n.id)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to accept friend request')
  }
}

async function declineFriendRequest(n) {
  if (!confirm('Decline this friend request?')) return
  try {
    await api.post(`/friends/request/${n.data.requestId}/decline`)
    toast.success('Request declined')
    markRead(n.id)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to decline request')
  }
}

function iconComponent(type) {
  if (type === 'announcement') return Megaphone
  if (type?.includes('challenge')) return Trophy
  if (type?.includes('buddy')) return Users
  return Bell
}

function iconClass(type) {
  if (type === 'announcement') return 'bg-purple-500/20 text-purple-400'
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
