<template>
  <div class="page">
    <DemoLock v-if="auth.isDemo" />
    <template v-else>
    <h1 class="text-xl font-bold">Friends</h1>

    <!-- Inline Notifications -->
    <NotificationAlerts />

    <div class="card space-y-3">
      <h3 class="section-title">Invite Friends</h3>
      <div class="flex gap-2">
        <input :value="inviteLink" readonly :disabled="!friendToken" class="input text-xs flex-1 disabled:opacity-60" />
        <button @click="copyInvite" :disabled="!friendToken" class="btn whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
          <Copy :size="14" /> Copy
        </button>
      </div>
      <p class="text-xs text-gray-500">Share this link. When they sign up, you'll be friends automatically.</p>
    </div>

    <div class="card space-y-3">
      <h3 class="section-title">Find Users</h3>
      <input
        v-model="searchQuery"
        @input="searchUsers"
        type="text"
        placeholder="Search by username..."
        class="input"
      />
      <div v-if="searching" class="text-center py-4">
        <Loader2 :size="18" class="animate-spin mx-auto text-gray-500" />
      </div>
      <div v-else-if="filteredResults.length" class="space-y-1">
        <div v-for="u in filteredResults" :key="u.id"
          class="flex items-center gap-3 p-2 min-h-[44px] rounded-lg hover:bg-gray-800 transition-colors">
          <div v-if="u.avatar" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <img :src="u.avatar" :alt="u.username" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {{ (u.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium truncate">@{{ u.username }}</div>
            <div v-if="u.bio" class="text-xs text-gray-500 truncate">{{ u.bio }}</div>
          </div>
          <button v-if="!u.isFriend && !u.hasPendingRequest" @click="sendRequest(u)"
            class="btn text-xs px-3 py-1.5 min-h-[36px] shrink-0">
            <UserPlus :size="14" /> Add
          </button>
          <span v-else-if="u.hasPendingRequest" class="text-xs text-gray-500 shrink-0">Requested</span>
          <span v-else class="text-xs text-emerald-400 shrink-0">Friend</span>
        </div>
      </div>
      <p v-else-if="searchQuery.length >= 2" class="text-sm text-gray-500 text-center py-2">No users found</p>
    </div>

    <div v-if="pendingRequests.length" class="space-y-3">
      <h3 class="section-title">Friend Requests ({{ pendingRequests.length }})</h3>
      <div v-for="req in pendingRequests" :key="req.id" class="card flex items-center gap-3">
        <div v-if="req.requester?.avatar" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          <img :src="req.requester.avatar" :alt="req.requester.username" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {{ (req.requester?.username || 'U')[0].toUpperCase() }}
        </div>
        <span class="text-sm flex-1 min-w-0 truncate">@{{ req.requester?.username }}</span>
        <div class="flex gap-2 flex-shrink-0">
          <button @click="acceptRequest(req.id)" class="btn min-h-[40px] px-3 py-1.5 text-xs">
            <Check :size="14" /> Accept
          </button>
          <button @click="declineRequest(req.id)" class="btn-secondary min-h-[40px] px-3 py-1.5 text-xs">
            Decline
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <h3 class="section-title">Friends ({{ friends.length }})</h3>
      <div v-if="friends.length" class="space-y-1">
        <router-link
          v-for="f in friends"
          :key="f.id"
          :to="`/profile/${f.username || f.id}`"
          class="flex items-center gap-3 p-2 min-h-[44px] rounded-lg hover:bg-gray-800 transition-colors"
        >
          <div v-if="f.avatar" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <img :src="f.avatar" :alt="f.username" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {{ (f.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">@{{ f.username }}</div>
          </div>
        </router-link>
      </div>
      <div v-else class="card text-center py-6">
        <UserPlus :size="24" class="mx-auto text-gray-500 mb-2" />
        <p class="text-sm text-gray-500">No friends yet. Share your invite link!</p>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Copy, Check, Loader2, UserPlus } from 'lucide-vue-next'
import NotificationAlerts from '../components/NotificationAlerts.vue'
import DemoLock from '../components/DemoLock.vue'
import { useAuthStore } from '../stores/auth'

const toast = useToast()
const auth = useAuthStore()

const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const pendingRequests = ref([])
const friends = ref([])
const friendToken = ref('')
const friendIds = ref(new Set())
const pendingRequestIds = ref(new Set())

const inviteLink = computed(() => {
  if (friendToken.value) {
    return `${window.location.origin}/friend/accept/${friendToken.value}`
  }
  return 'Generating link...'
})

const filteredResults = computed(() => {
  return searchResults.value.map(u => ({
    ...u,
    isFriend: friendIds.value.has(u.id),
    hasPendingRequest: pendingRequestIds.value.has(u.id),
  }))
})

function copyInvite() {
  navigator.clipboard.writeText(inviteLink.value)
  toast.success('Link copied!')
}

let searchTimeout = null
function searchUsers() {
  clearTimeout(searchTimeout)
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  searching.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const res = await api.get('/friends/search', { params: { q: searchQuery.value } })
      searchResults.value = (res.data.users || []).slice(0, 10)
    } catch {
      searchResults.value = []
    }
    searching.value = false
  }, 300)
}

async function sendRequest(user) {
  try {
    await api.post('/friends/request', { userId: user.id })
    pendingRequestIds.value.add(user.id)
    toast.success(`Request sent to @${user.username}`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to send request')
  }
}

async function acceptRequest(requestId) {
  try {
    await api.post(`/friends/request/${requestId}/accept`)
    toast.success('Friend added')
    loadAll()
  } catch {
    toast.error('Failed to accept request')
  }
}

async function declineRequest(requestId) {
  try {
    await api.post(`/friends/request/${requestId}/decline`)
    toast.success('Request declined')
    loadAll()
  } catch {
    toast.error('Failed to decline request')
  }
}

async function loadAll() {
  try {
    const [friendsRes, requestsRes] = await Promise.all([
      api.get('/friends'),
      api.get('/friends/requests'),
    ])
    friends.value = friendsRes.data.friends || []
    friendIds.value = new Set(friends.value.map(f => f.id))
    pendingRequests.value = requestsRes.data.requests || []
    pendingRequestIds.value = new Set(pendingRequests.value.map(r => r.requesterId))

    if (!friendToken.value) {
      try {
        const linkRes = await api.post('/friends/link')
        friendToken.value = linkRes.data.token || ''
      } catch {}
    }
  } catch {
    toast.error('Failed to load friends')
  }
}

onMounted(loadAll)
</script>
