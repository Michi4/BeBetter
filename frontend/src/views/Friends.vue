<template>
  <div class="page">
    <h1 class="text-xl font-bold">Friends</h1>

    <div class="card space-y-3">
      <h3 class="section-title">Invite Friends</h3>
      <div class="flex gap-2">
        <input :value="inviteLink" readonly class="input text-xs flex-1" />
        <button @click="copyInvite" class="btn whitespace-nowrap">
          <Copy :size="14" /> Copy
        </button>
      </div>
      <p class="text-xs text-gray-500">{{ referralCount }} friends joined via your link</p>
    </div>

    <div class="card space-y-3">
      <h3 class="section-title">Find Users</h3>
      <input
        v-model="searchQuery"
        @input="searchUsers"
        type="text"
        placeholder="Search by name or username..."
        class="input"
      />
      <div v-if="searching" class="text-center py-4">
        <Loader2 :size="18" class="animate-spin mx-auto text-gray-500" />
      </div>
      <div v-else-if="searchResults.length" class="space-y-1">
        <router-link
          v-for="u in searchResults"
          :key="u.id"
          :to="`/profile/${u.username || u.id}`"
          class="flex items-center gap-3 p-2 min-h-[44px] rounded-lg hover:bg-gray-800 transition-colors"
        >
          <div v-if="u.avatar" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <img :src="u.avatar" :alt="u.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {{ (u.name || u.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ u.name }}</div>
            <div class="text-xs text-gray-500 truncate">@{{ u.username }}</div>
          </div>
        </router-link>
      </div>
      <p v-else-if="searchQuery.length >= 2" class="text-sm text-gray-500 text-center py-2">No users found</p>
    </div>

    <div v-if="pendingRequests.length" class="space-y-3">
      <h3 class="section-title">Friend Requests ({{ pendingRequests.length }})</h3>
      <div v-for="req in pendingRequests" :key="req.id" class="card flex items-center gap-3">
        <div v-if="req.from?.avatar" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          <img :src="req.from.avatar" :alt="req.from.name" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {{ (req.from?.name || req.from?.username || 'U')[0].toUpperCase() }}
        </div>
        <span class="text-sm flex-1 min-w-0 truncate">{{ req.from?.name || req.from?.username }}</span>
        <div class="flex gap-2 flex-shrink-0">
          <button @click="acceptRequest(req.fromId || req.from?.id)" class="btn min-h-[40px] px-3 py-1.5 text-xs">
            <Check :size="14" /> Accept
          </button>
          <button @click="declineRequest(req.fromId || req.from?.id)" class="btn-secondary min-h-[40px] px-3 py-1.5 text-xs">
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
            <img :src="f.avatar" :alt="f.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {{ (f.name || f.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ f.name }}</div>
            <div class="text-xs text-gray-500 truncate">@{{ f.username }}</div>
          </div>
        </router-link>
      </div>
      <div v-else class="card text-center py-6">
        <UserPlus :size="24" class="mx-auto text-gray-500 mb-2" />
        <p class="text-sm text-gray-500">No friends yet. Share your invite link!</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { Copy, Check, Loader2, UserPlus } from 'lucide-vue-next'

const auth = useAuthStore()
const toast = useToast()

const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const pendingRequests = ref([])
const friends = ref([])
const referralCount = ref(0)

const inviteLink = computed(() => {
  const code = auth.user?.referralCode || auth.user?.username || ''
  return `${window.location.origin}/register?ref=${code}`
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
      searchResults.value = (res.data.users || res.data || []).slice(0, 5)
    } catch {
      searchResults.value = []
    }
    searching.value = false
  }, 300)
}

async function acceptRequest(userId) {
  try {
    await api.post('/friends/accept', { userId })
    toast.success('Friend added')
    loadAll()
  } catch {
    toast.error('Failed to accept request')
  }
}

async function declineRequest(userId) {
  try {
    await api.post('/friends/decline', { userId })
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
      api.get('/friends/requests')
    ])
    friends.value = friendsRes.data.friends || friendsRes.data || []
    pendingRequests.value = requestsRes.data.requests || requestsRes.data || []
    referralCount.value = friends.value.length
  } catch {
    toast.error('Failed to load friends')
  }
}

onMounted(loadAll)
</script>
