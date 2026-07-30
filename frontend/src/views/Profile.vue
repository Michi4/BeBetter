<template>
  <div class="page">
    <div v-if="loading" class="text-center py-16">
      <Loader2 :size="24" class="animate-spin mx-auto text-gray-500" />
    </div>

    <template v-else-if="profile">
      <div class="card text-center space-y-4">
        <div class="relative inline-block">
          <div
            v-if="profile.avatar"
            class="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-4xl font-bold mx-auto ring-2 ring-emerald-400 overflow-hidden cursor-pointer"
            @click="showFullAvatar = true"
          >
            <img :src="profile.avatar" :alt="profile.username" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-4xl font-bold mx-auto ring-2 ring-emerald-400"
          >
            {{ (profile.username || 'U')[0].toUpperCase() }}
          </div>
          <label
            v-if="isOwn"
            class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors"
          >
            <Camera :size="14" class="text-gray-400" />
            <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
          </label>
        </div>

        <div>
          <h1 class="text-xl font-bold">{{ profile.username }}</h1>
        </div>

        <p v-if="profile.bio" class="text-sm text-gray-400 max-w-sm mx-auto">{{ profile.bio }}</p>

        <p v-if="profile.createdAt" class="text-xs text-gray-500">
          Joined {{ new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}
        </p>

        <div class="grid grid-cols-2 gap-3 pt-2">
          <div class="text-center">
            <div class="text-xl font-bold text-emerald-400">{{ profileStats.bestStreak || 0 }}</div>
            <div class="text-[10px] text-gray-500">Best Streak</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-emerald-400">{{ profileStats.totalHabits || 0 }}</div>
            <div class="text-[10px] text-gray-500">Habits</div>
          </div>
        </div>

        <div v-if="!isOwn" class="flex justify-center flex-wrap gap-2 pt-2">
          <button v-if="!isFriend && !requestSent" @click="sendRequest" class="btn">
            <UserPlus :size="16" /> Add Friend
          </button>
          <span v-else-if="requestSent" class="btn-secondary">
            <Clock :size="16" /> Request Sent
          </span>
          <router-link v-else :to="`/challenges/new?user=${profile.id}`" class="btn-secondary">
            <Swords :size="16" /> Challenge
          </router-link>
        </div>

        <div v-if="isOwn" class="flex justify-center gap-2 pt-2">
          <button @click="openEdit" class="btn-secondary">
            <Edit :size="16" /> Edit Profile
          </button>
          <button @click="showDeleteConfirm = true" class="btn-danger">
            <Trash2 :size="16" /> Delete Account
          </button>
        </div>
      </div>

      <div v-if="activity.length" class="space-y-3">
        <h3 class="section-title">Recent Activity</h3>
        <div class="space-y-2">
          <div v-for="item in activity" :key="item.id" class="card flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Check :size="14" class="text-emerald-400" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ item.habit?.title || item.title }}</div>
              <div class="text-[10px] text-gray-500">{{ formatDate(item.completedAt || item.date) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showEdit" class="card space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium">Edit Profile</h3>
          <button @click="showEdit = false" class="text-gray-400 hover:text-gray-200 transition-colors">
            <X :size="16" />
          </button>
        </div>
        <textarea v-model="editForm.bio" class="input" placeholder="Bio" rows="3"></textarea>
        <label class="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <input
            v-model="editForm.isPublic"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
          />
          <span class="text-sm text-gray-400">Public profile</span>
        </label>
        <div class="flex justify-end gap-2">
          <button @click="showEdit = false" class="btn-secondary">Cancel</button>
          <button @click="saveProfile" class="btn">Save</button>
        </div>
      </div>

      <Teleport to="body">
        <div v-if="showFullAvatar" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" @click.self="showFullAvatar = false">
          <div class="relative max-w-lg w-full">
            <button @click="showFullAvatar = false" class="absolute -top-10 right-0 text-gray-400 hover:text-gray-200 transition-colors">
              <X :size="24" />
            </button>
            <img :src="profile.avatar" :alt="profile.username" class="w-full h-auto rounded-lg" />
          </div>
        </div>
      </Teleport>

      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="showDeleteConfirm = false">
          <div class="card w-full max-w-sm space-y-4">
            <h3 class="font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle :size="18" />
              Delete Account
            </h3>
            <p class="text-sm text-gray-400">This action is irreversible. Type DELETE_MY_ACCOUNT to confirm.</p>
            <input v-model="deleteConfirm" class="input" placeholder="DELETE_MY_ACCOUNT" />
            <div class="flex gap-2">
              <button @click="deleteAccount" class="btn-danger flex-1" :disabled="deleteConfirm !== 'DELETE_MY_ACCOUNT'">
                <Loader2 v-if="deleting" :size="14" class="animate-spin" />
                <span v-else>Delete</span>
              </button>
              <button @click="showDeleteConfirm = false" class="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { UserPlus, Swords, Edit, Trash2, Camera, X, AlertTriangle, Loader2, Clock, Check } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const profile = ref(null)
const loading = ref(true)
const activity = ref([])
const profileStats = ref({})
const isFriend = ref(false)
const requestSent = ref(false)
const showEdit = ref(false)
const showDeleteConfirm = ref(false)
const showFullAvatar = ref(false)
const deleteConfirm = ref('')
const deleting = ref(false)
const editForm = reactive({ bio: '', isPublic: false })

const isOwn = computed(() => {
  const param = route.params.id
  if (!param || !auth.user) return false
  return auth.user.id === param || auth.user.username === param
})

async function loadProfile() {
  loading.value = true
  try {
    const res = await api.get(`/friends/profile/${route.params.id}`)
    profile.value = res.data.user || res.data
    editForm.bio = profile.value.bio || ''
    editForm.isPublic = profile.value.isPublic || false
    isFriend.value = res.data.isFriend || false
    activity.value = res.data.recentLogs || []
    profileStats.value = res.data.stats || {}
  } catch {
    toast.error('Profile not found')
  }
  loading.value = false
}

function openEdit() {
  editForm.bio = profile.value.bio || ''
  editForm.isPublic = profile.value.isPublic || false
  showEdit.value = true
}

async function saveProfile() {
  try {
    await api.put('/auth/me', { bio: editForm.bio, isPublic: editForm.isPublic })
    showEdit.value = false
    toast.success('Profile updated')
    loadProfile()
  } catch {
    toast.error('Failed to update profile')
  }
}

async function sendRequest() {
  try {
    await api.post('/friends/request', { userId: profile.value.id })
    requestSent.value = true
    toast.success('Request sent')
  } catch {
    toast.error('Failed to send request')
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('photo', file)
  try {
    const uploadRes = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const avatarUrl = uploadRes.data.url
    await api.put('/auth/me', { avatar: avatarUrl })
    profile.value.avatar = avatarUrl
    toast.success('Avatar updated')
  } catch {
    toast.error('Failed to upload avatar')
  }
}

async function deleteAccount() {
  if (deleteConfirm.value !== 'DELETE_MY_ACCOUNT') return
  deleting.value = true
  try {
    await api.delete('/auth/account', { data: { confirm: 'DELETE_MY_ACCOUNT' } })
    toast.success('Account deleted')
    auth.logout()
    router.push('/login')
  } catch {
    toast.error('Failed to delete account')
  }
  deleting.value = false
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(loadProfile)
</script>
