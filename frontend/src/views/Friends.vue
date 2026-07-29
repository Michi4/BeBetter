<template>
  <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
    <h1 class="text-xl font-bold">Friends</h1>

    <div class="card space-y-3">
      <h3 class="text-sm font-medium text-gray-400">Invite Friends</h3>
      <div class="flex gap-2">
        <input :value="inviteLink" readonly class="input text-xs" />
        <button @click="copyInvite" class="btn text-xs whitespace-nowrap"><Copy :size="14" /> Copy</button>
      </div>
      <p class="text-xs text-gray-500">{{ referralCount }} friends joined via your link</p>
    </div>

    <div class="card space-y-3">
      <h3 class="text-sm font-medium text-gray-400">Find Users</h3>
      <input v-model="searchQuery" @input="searchUsers" type="text" placeholder="Search by name or username..." class="input" />
      <div v-if="searchResults.length" class="space-y-1">
        <router-link v-for="u in searchResults" :key="u.id" :to="`/profile/${u.username || u.id}`"
          class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors duration-150">
          <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
            {{ (u.name || u.username || 'U')[0].toUpperCase() }}
          </div>
          <div>
            <div class="text-sm font-medium">{{ u.name }}</div>
            <div class="text-xs text-gray-500">@{{ u.username }}</div>
          </div>
        </router-link>
      </div>
    </div>

    <div v-if="pendingRequests.length" class="card space-y-2">
      <h3 class="text-sm font-medium text-gray-400">Friend Requests</h3>
      <div v-for="req in pendingRequests" :key="req.id" class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
            {{ (req.from?.name || req.from?.username || 'U')[0].toUpperCase() }}
          </div>
          <span class="text-sm">{{ req.from?.name || req.from?.username }}</span>
        </div>
        <div class="flex gap-1">
          <button @click="acceptRequest(req.id)" class="btn text-xs px-2 py-1">Accept</button>
          <button @click="rejectRequest(req.id)" class="btn-secondary text-xs px-2 py-1">Reject</button>
        </div>
      </div>
    </div>

    <div class="card space-y-2">
      <h3 class="text-sm font-medium text-gray-400">Friends ({{ friends.length }})</h3>
      <router-link v-for="f in friends" :key="f.id" :to="`/profile/${f.username || f.id}`"
        class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors duration-150">
        <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
          {{ (f.name || f.username || 'U')[0].toUpperCase() }}
        </div>
        <div>
          <div class="text-sm font-medium">{{ f.name }}</div>
          <div class="text-xs text-gray-500">@{{ f.username }}</div>
        </div>
      </router-link>
      <p v-if="!friends.length" class="text-sm text-gray-500">No friends yet. Share your invite link!</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { Copy } from 'lucide-vue-next'

const auth = useAuthStore()
const toast = useToast()

const searchQuery = ref('')
const searchResults = ref([])
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

async function searchUsers() {
  if (searchQuery.value.length < 2) { searchResults.value = []; return }
  try {
    const res = await api.get('/friends/search', { params: { q: searchQuery.value } })
    searchResults.value = (res.data.users || res.data || []).slice(0, 5)
  } catch { searchResults.value = [] }
}

async function acceptRequest(id) {
  try { await api.post(`/friends/accept/${id}`); toast.success('Friend added'); loadAll() } catch { toast.error('Failed') }
}

async function rejectRequest(id) {
  try { await api.post(`/friends/reject/${id}`); toast.success('Request rejected'); loadAll() } catch { toast.error('Failed') }
}

async function loadAll() {
  try {
    const [friendsRes, requestsRes] = await Promise.all([api.get('/friends'), api.get('/friends/requests')])
    friends.value = friendsRes.data.friends || friendsRes.data || []
    pendingRequests.value = requestsRes.data.requests || requestsRes.data || []
    referralCount.value = friends.value.length
  } catch {}
}

onMounted(loadAll)
</script>
