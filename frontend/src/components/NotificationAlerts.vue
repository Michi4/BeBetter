<template>
  <div v-if="alerts.length" class="fixed inset-x-0 top-[calc(3rem+env(safe-area-inset-top,0px)+8px)] z-[45] flex justify-center px-3 sm:px-4 pointer-events-none">
    <TransitionGroup name="alert" tag="div" class="w-full max-w-lg space-y-2 pointer-events-auto">
      <div v-if="alerts.length > 1" class="flex justify-end pr-1 -mb-1">
        <button @click="dismissAll" class="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Dismiss all</button>
      </div>
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
          <p v-if="n.type === 'announcement'" class="text-sm font-semibold">{{ n.data?.title || 'Announcement' }}</p>
          <p class="text-sm leading-snug break-words" :class="n.type === 'announcement' ? 'text-gray-400' : ''">{{ n.message }}</p>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <template v-if="n.type === 'challenge_invite' && n.data?.challengeId">
              <button @click="acceptChallenge(n)" class="btn text-xs px-3 py-1.5 min-h-[44px]"><Check :size="13" /> Accept</button>
              <button @click="declineChallenge(n)" class="btn-secondary text-xs px-3 py-1.5 min-h-[44px]"><X :size="13" /> Decline</button>
              <button @click="dismiss(n.id)" class="text-[10px] text-gray-500 hover:text-gray-300 transition-colors min-h-[44px] flex items-center">Later</button>
            </template>
            <template v-else-if="n.type === 'friend_request' && n.data?.requestId">
              <button @click="acceptFriendRequest(n)" class="btn text-xs px-3 py-1.5 min-h-[44px]"><Check :size="13" /> Accept</button>
              <button @click="declineFriendRequest(n)" class="btn-secondary text-xs px-3 py-1.5 min-h-[44px]"><X :size="13" /> Decline</button>
            </template>
            <template v-else-if="n.type === 'buddy_request'">
              <button @click="dismiss(n.id)" class="btn text-xs px-3 py-1.5 min-h-[44px]">Got it</button>
            </template>
            <template v-else>
              <button @click="dismiss(n.id)" class="text-[10px] text-gray-500 hover:text-gray-300 transition-colors min-h-[44px] flex items-center">Dismiss</button>
            </template>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
  <ConfirmDialog ref="confirmDialog" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Trophy, Users, Bell, Megaphone, Check, X } from 'lucide-vue-next'
import api from '../api'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import ConfirmDialog from './ConfirmDialog.vue'

const router = useRouter()
const toast = useToast()
const confirmDialog = ref(null)

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
  } catch {
    toastError('Failed to dismiss notification')
  }
}

async function dismissAll() {
  try {
    await api.post('/notifications/read')
    alerts.value = []
  } catch {
    toastError('Failed to dismiss notifications')
  }
}

async function acceptChallenge(n) {
  try {
    await api.post(`/challenges/${n.data.challengeId}/accept`)
    toastSuccess('Challenge accepted!')
    dismiss(n.id)
    router.push(`/challenges/${n.data.challengeId}`)
  } catch {
    toastError('Failed to accept challenge')
  }
}

async function declineChallenge(n) {
  const ok = await confirmDialog.value.open({ title: 'Decline challenge?', message: 'The challenge will be closed. This cannot be undone.', confirmLabel: 'Decline' })
  if (!ok) return
  try {
    await api.post(`/challenges/${n.data.challengeId}/decline`)
    toastSuccess('Challenge declined')
    dismiss(n.id)
  } catch {
    toastError('Failed to decline challenge')
  }
}

async function acceptFriendRequest(n) {
  try {
    await api.post(`/friends/request/${n.data.requestId}/accept`)
    toastSuccess('Friend request accepted')
    dismiss(n.id)
  } catch {
    toastError('Failed to accept friend request')
  }
}

async function declineFriendRequest(n) {
  const ok = await confirmDialog.value.open({ title: 'Decline friend request?', message: 'The request will be closed.', confirmLabel: 'Decline' })
  if (!ok) return
  try {
    await api.post(`/friends/request/${n.data.requestId}/decline`)
    toastSuccess('Request declined')
    dismiss(n.id)
  } catch {
    toastError('Failed to decline request')
  }
}

const toastSuccess = (m) => toast(m, { type: 'success' })
const toastError = (m) => toast(m, { type: 'error' })

function iconFor(type) {
  if (type === 'announcement') return Megaphone
  if (type?.includes('challenge')) return Trophy
  if (type?.includes('buddy')) return Users
  if (type?.includes('friend')) return Users
  return Bell
}

function iconBg(type) {
  if (type === 'announcement') return 'bg-purple-500/20 text-purple-400'
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

<style scoped>
.alert-enter-active {
  transition: opacity 0.18s ease;
}
.alert-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.alert-enter-from {
  opacity: 0;
}
.alert-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
@media (prefers-reduced-motion: reduce) {
  .alert-enter-active, .alert-leave-active { transition: none; }
}
</style>
