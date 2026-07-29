<template>
  <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
    <div v-if="loading" class="text-center text-gray-500 py-10">
      <Loader2 :size="24" class="animate-spin mx-auto" />
    </div>
    <template v-else-if="profile">
      <!-- Avatar Section -->
      <div class="card text-center space-y-4">
        <div class="relative inline-block">
          <div v-if="profile.avatar"
            class="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-3xl font-bold mx-auto ring-2 ring-emerald-400 overflow-hidden cursor-pointer"
            @click="showFullAvatar = true">
            <img :src="profile.avatar" :alt="profile.name" class="w-full h-full object-cover" />
          </div>
          <div v-else
            class="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-3xl font-bold mx-auto ring-2 ring-emerald-400">
            {{ (profile.name || profile.username || 'U')[0].toUpperCase() }}
          </div>
          <label v-if="isOwn"
            class="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors duration-150">
            <Camera :size="12" class="text-gray-400" />
            <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
          </label>
        </div>

        <div>
          <h1 class="text-xl font-bold">{{ profile.name }}</h1>
          <p class="text-sm text-gray-500">@{{ profile.username }}</p>
        </div>

        <p v-if="profile.bio" class="text-sm text-gray-400">{{ profile.bio }}</p>

        <p v-if="profile.createdAt" class="text-xs text-gray-500">
          Joined {{ new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}
        </p>

        <!-- Stats Grid -->
        <div class="grid grid-cols-4 gap-3 pt-2">
          <div class="text-center">
            <div class="text-lg font-bold text-emerald-400">{{ profile.stats?.streak || 0 }}</div>
            <div class="text-[10px] text-gray-500">Streak</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-emerald-400">{{ profile.stats?.totalCompletions || 0 }}</div>
            <div class="text-[10px] text-gray-500">Done</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-emerald-400">{{ profile.stats?.totalHabits || 0 }}</div>
            <div class="text-[10px] text-gray-500">Habits</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-emerald-400">{{ profile.stats?.friendsCount || 0 }}</div>
            <div class="text-[10px] text-gray-500">Friends</div>
          </div>
        </div>

        <!-- Other Profile Actions -->
        <div v-if="!isOwn" class="flex justify-center gap-2 pt-2">
          <button v-if="!isFriend && !requestSent" @click="sendRequest" class="btn text-xs">
            <UserPlus :size="14" /> Add Friend
          </button>
          <span v-else-if="requestSent" class="text-xs text-gray-500 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-yellow-500"></span> Request sent
          </span>
          <span v-else class="text-xs text-emerald-400 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Friends
          </span>
          <router-link :to="`/challenges/new?user=${profile.id}`" class="btn-secondary text-xs">
            <Swords :size="14" /> Challenge
          </router-link>
          <button @click="showReport = true" class="btn-ghost text-xs text-red-400">
            <Flag :size="14" /> Report
          </button>
        </div>

        <!-- Own Profile Actions -->
        <div v-else class="flex justify-center gap-2 pt-2">
          <button @click="openEdit" class="btn-secondary text-xs">
            <Edit :size="14" /> Edit Profile
          </button>
          <button @click="showDeleteConfirm = true" class="btn-danger text-xs">
            <Trash2 :size="14" /> Delete Account
          </button>
        </div>
      </div>

      <!-- Contribution Grid -->
      <div class="card">
        <h3 class="text-sm font-medium text-gray-400 mb-4">Activity</h3>
        <ContributionGrid v-if="profile.grid && profile.grid.length" :grid="profile.grid" @select="selectDay" />
        <div v-else class="text-center py-8 text-gray-500 text-sm">
          <div class="text-2xl mb-2">📊</div>
          No activity data yet
        </div>
      </div>
      <DayDetail :show="!!selectedDay" :day="selectedDay" @close="selectedDay = null" />

      <!-- Edit Profile Form -->
      <div v-if="showEdit" class="card space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium">Edit Profile</h3>
          <button @click="showEdit = false" class="text-gray-400 hover:text-gray-200 transition-colors duration-150"><X :size="16" /></button>
        </div>
        <input v-model="editForm.name" class="input" placeholder="Name" />
        <textarea v-model="editForm.bio" class="input" placeholder="Bio" rows="2"></textarea>
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="editForm.isPublic" type="checkbox"
            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer" />
          <span class="text-sm text-gray-400">Public profile</span>
        </label>
        <div class="flex justify-end gap-2">
          <button @click="showEdit = false" class="btn-secondary text-xs">Cancel</button>
          <button @click="saveProfile" class="btn text-xs">Save</button>
        </div>
      </div>

      <!-- Full Avatar Modal -->
      <Teleport to="body">
        <div v-if="showFullAvatar" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" @click.self="showFullAvatar = false">
          <div class="relative max-w-lg mx-4">
            <button @click="showFullAvatar = false" class="absolute -top-10 right-0 text-gray-400 hover:text-gray-200 transition-colors duration-150">
              <X :size="24" />
            </button>
            <img :src="profile.avatar" :alt="profile.name" class="w-full h-auto rounded-lg" />
          </div>
        </div>
      </Teleport>

      <!-- Delete Account Modal -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="showDeleteConfirm = false">
          <div class="card w-full max-w-sm mx-4 space-y-3">
            <h3 class="font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle :size="18" />
              Delete Account
            </h3>
            <p class="text-sm text-gray-400">This action is irreversible. Type DELETE_MY_ACCOUNT to confirm.</p>
            <input v-model="deleteConfirm" class="input" placeholder="DELETE_MY_ACCOUNT" />
            <div class="flex gap-2">
              <button @click="deleteAccount" class="btn-danger text-xs" :disabled="deleteConfirm !== 'DELETE_MY_ACCOUNT'">
                <Loader2 v-if="deleting" :size="14" class="animate-spin" />
                <span v-else>Delete</span>
              </button>
              <button @click="showDeleteConfirm = false" class="btn-secondary text-xs">Cancel</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Report Modal -->
      <Teleport to="body">
        <div v-if="showReport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="showReport = false">
          <div class="card w-full max-w-sm mx-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Report User</h3>
              <button @click="showReport = false" class="text-gray-400 hover:text-gray-200 transition-colors duration-150"><X :size="16" /></button>
            </div>
            <textarea v-model="reportReason" class="input" placeholder="Reason..." rows="3"></textarea>
            <div class="flex gap-2">
              <button @click="submitReport" class="btn-danger text-xs" :disabled="!reportReason.trim()">Report</button>
              <button @click="showReport = false" class="btn-secondary text-xs">Cancel</button>
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
import { UserPlus, Swords, Flag, Edit, Trash2, Camera, X, AlertTriangle, Loader2 } from 'lucide-vue-next'
import ContributionGrid from '../components/ContributionGrid.vue'
import DayDetail from '../components/DayDetail.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const profile = ref(null)
const loading = ref(true)
const isFriend = ref(false)
const requestSent = ref(false)
const showEdit = ref(false)
const showDeleteConfirm = ref(false)
const showReport = ref(false)
const showFullAvatar = ref(false)
const deleteConfirm = ref('')
const reportReason = ref('')
const selectedDay = ref(null)
const deleting = ref(false)
const editForm = reactive({ name: '', bio: '', isPublic: false })

const isOwn = computed(() => auth.user?.id === profile.value?.id || auth.user?.username === route.params.id)

async function loadProfile() {
  loading.value = true
  try {
    const res = await api.get(`/friends/${route.params.id}/profile`)
    profile.value = res.data.user || res.data
    editForm.name = profile.value.name || ''
    editForm.bio = profile.value.bio || ''
    editForm.isPublic = profile.value.isPublic || false
    isFriend.value = res.data.isFriend || false
    requestSent.value = res.data.requestSent || false
  } catch {
    toast.error('Profile not found')
  }
  loading.value = false
}

function openEdit() {
  editForm.name = profile.value.name || ''
  editForm.bio = profile.value.bio || ''
  editForm.isPublic = profile.value.isPublic || false
  showEdit.value = true
}

async function saveProfile() {
  try {
    await api.put('/friends/me', editForm)
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
  formData.append('file', file)
  try {
    const uploadRes = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    const avatarUrl = uploadRes.data.url || uploadRes.data.file
    await api.put('/friends/me', { avatar: avatarUrl })
    profile.value.avatar = avatarUrl
    toast.success('Avatar updated')
  } catch {
    toast.error('Failed to upload avatar')
  }
}

async function deleteAccount() {
  deleting.value = true
  try {
    await auth.deleteAccount()
    toast.success('Account deleted')
    router.push('/login')
  } catch {
    toast.error('Failed to delete account')
  }
  deleting.value = false
}

async function submitReport() {
  if (!reportReason.value.trim()) return
  try {
    await api.post('/reports', { targetType: 'user', targetId: profile.value.id, reason: reportReason.value })
    showReport.value = false
    reportReason.value = ''
    toast.success('Report submitted')
  } catch {
    toast.error('Failed to submit report')
  }
}

function selectDay(day) {
  selectedDay.value = day
}

onMounted(loadProfile)
</script>
