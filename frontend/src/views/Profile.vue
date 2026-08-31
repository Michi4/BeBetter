<template>
  <div class="page">

    <template v-if="profile">
      <!-- Profile header (own or other) -->
      <div class="card text-center space-y-4">
        <div class="relative inline-block">
          <div v-if="profile.avatar"
            class="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-4xl font-bold mx-auto ring-2 ring-emerald-400 overflow-hidden cursor-pointer"
            @click="showFullAvatar = true">
            <img :src="profile.avatar" :alt="profile.username" class="w-full h-full object-cover" />
          </div>
          <div v-else
            class="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-4xl font-bold mx-auto ring-2 ring-emerald-400">
            {{ (profile.username || 'U')[0].toUpperCase() }}
          </div>
          <label v-if="isOwn"
            class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors">
            <Camera :size="14" class="text-gray-400" />
            <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
          </label>
        </div>
        <div><h1 class="text-xl font-bold">{{ profile.username }}</h1></div>
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
        <!-- Other user actions -->
        <div v-if="!isOwn" class="flex justify-center flex-wrap gap-2 pt-2">
          <button v-if="!isFriend && !requestSent" @click="sendRequest" class="btn">
            <UserPlus :size="16" /> Add Friend
          </button>
          <span v-else-if="requestSent" class="btn-secondary"><Clock :size="16" /> Request Sent</span>
          <router-link v-else :to="`/challenges/new?user=${profile.id}`" class="btn-secondary">
            <Swords :size="16" /> Challenge
          </router-link>
        </div>
      </div>

      <!-- Contribution Grid (own profile only - other users share no grid endpoint) -->
      <div v-if="isOwn && auth.user" class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="section-title">{{ isOwn ? 'Your Activity' : profile.username + "'s Activity" }}</h3>
          <div v-if="gridYearRange.lastYear > gridYearRange.firstYear" class="flex items-center gap-1">
            <button @click="gridYear--" :disabled="gridYear <= gridYearRange.firstYear"
              class="touch-target p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-30 transition-colors" aria-label="Previous year">
              <ChevronLeft :size="16" />
            </button>
            <span class="text-xs font-medium text-gray-400 min-w-[36px] text-center">{{ gridYear }}</span>
            <button @click="gridYear++" :disabled="gridYear >= gridYearRange.lastYear"
              class="touch-target p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-30 transition-colors" aria-label="Next year">
              <ChevronRight :size="16" />
            </button>
          </div>
          <span v-else class="text-xs font-medium text-gray-400">{{ gridYear }}</span>
        </div>
        <ContributionGrid :grid="profileGrid" :year="gridYear" />
      </div>

      <!-- Settings sections (own profile only) -->
      <template v-if="isOwn">
        <!-- Profile Settings -->
        <div class="card space-y-4">
          <div class="flex items-center gap-2">
            <User :size="16" class="text-emerald-400" />
            <h3 class="section-title">Profile Settings</h3>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">Bio</label>
            <textarea v-model="editForm.bio" class="input" placeholder="Tell something about yourself..." rows="3"></textarea>
          </div>
          <div v-if="auth.isDemo" class="flex items-center gap-3 min-h-[44px]">
            <input type="checkbox" checked disabled
              class="w-5 h-5 rounded border-gray-600 bg-gray-800 text-emerald-500 cursor-not-allowed opacity-40" />
            <div class="flex-1">
              <span class="text-sm text-gray-300">Public profile</span>
              <p class="text-[10px] text-gray-500">Sign up to make your profile public</p>
            </div>
            <button @click="openDemoPrompt()" class="text-xs text-emerald-400 hover:text-emerald-300 shrink-0">Unlock</button>
          </div>
          <label v-else class="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input v-model="editForm.isPublic" type="checkbox"
              class="w-5 h-5 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer" />
            <div>
              <span class="text-sm text-gray-300">Public profile</span>
              <p class="text-[10px] text-gray-500">Others can view your profile and stats</p>
            </div>
          </label>
<button @click="saveProfile" class="btn w-full">
            <Save :size="14" /> Save Profile
          </button>
        </div>

        <!-- Display Settings -->
        <div class="card space-y-4">
          <div class="flex items-center gap-2">
            <Clock :size="16" class="text-emerald-400" />
            <h3 class="section-title">Display Settings</h3>
          </div>
          <div class="flex items-center justify-between min-h-[44px]">
            <div>
              <div class="text-sm text-gray-300">Time Format</div>
              <div class="text-[10px] text-gray-500">Choose how times are displayed</div>
            </div>
            <div class="flex items-center gap-2">
              <button @click="setTimeFormat('12h')" :disabled="timeFormat === '12h'"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="timeFormat === '12h' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
                12h (AM/PM)
              </button>
              <button @click="setTimeFormat('24h')" :disabled="timeFormat === '24h'"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="timeFormat === '24h' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
                24h
              </button>
            </div>
          </div>
        </div>

        <!-- Notification Settings -->
        <div class="card space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Bell :size="16" class="text-emerald-400" />
              <h3 class="section-title">Notification Settings</h3>
            </div>
            <button v-if="auth.isDemo" @click="openDemoPrompt()" class="text-xs text-emerald-400 hover:text-emerald-300">
              View all
            </button>
            <router-link v-else to="/notifications" class="text-xs text-emerald-400 hover:text-emerald-300">
              View all
            </router-link>
          </div>

          <div v-if="notifPrefs" class="space-y-3">
            <!-- Morning Reminder -->
            <div class="flex items-center justify-between min-h-[44px]">
              <div>
                <div class="text-sm text-gray-300">Morning reminder</div>
                <div class="text-[10px] text-gray-500">Get notified to start your day</div>
              </div>
              <div class="flex items-center gap-2">
                <TimeInput v-if="notifPrefs.morningEnabled" v-model="notifPrefs.morningTime" />
                <button @click="notifPrefs.morningEnabled = !notifPrefs.morningEnabled; saveNotifPrefs()"
                  class="relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0"
                  :class="notifPrefs.morningEnabled ? 'bg-emerald-600' : 'bg-gray-700'"
                  role="switch" :aria-checked="!!notifPrefs.morningEnabled" :aria-label="'Morning reminder'">
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                    :class="notifPrefs.morningEnabled ? 'translate-x-6' : ''"></span>
                </button>
              </div>
            </div>

            <!-- Evening Reminder -->
            <div class="flex items-center justify-between min-h-[44px]">
              <div>
                <div class="text-sm text-gray-300">Evening summary</div>
                <div class="text-[10px] text-gray-500">Review your day before bed</div>
              </div>
              <div class="flex items-center gap-2">
                <TimeInput v-if="notifPrefs.eveningEnabled" v-model="notifPrefs.eveningTime" />
                <button @click="notifPrefs.eveningEnabled = !notifPrefs.eveningEnabled; saveNotifPrefs()"
                  class="relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0"
                  :class="notifPrefs.eveningEnabled ? 'bg-emerald-600' : 'bg-gray-700'"
                  role="switch" :aria-checked="!!notifPrefs.eveningEnabled" aria-label="Evening summary">
                  <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                    :class="notifPrefs.eveningEnabled ? 'translate-x-6' : ''"></span>
                </button>
              </div>
            </div>

            <!-- Habit Reminders -->
            <div class="flex items-center justify-between min-h-[44px]">
              <div>
                <div class="text-sm text-gray-300">Habit reminders</div>
                <div class="text-[10px] text-gray-500">Remind about incomplete habits</div>
              </div>
              <button @click="notifPrefs.habitRemindersEnabled = !notifPrefs.habitRemindersEnabled; saveNotifPrefs()"
                class="relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0"
                :class="notifPrefs.habitRemindersEnabled ? 'bg-emerald-600' : 'bg-gray-700'"
                role="switch" :aria-checked="!!notifPrefs.habitRemindersEnabled" aria-label="Habit reminders">
                <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                  :class="notifPrefs.habitRemindersEnabled ? 'translate-x-6' : ''"></span>
              </button>
            </div>

            <!-- Push Notifications -->
            <div class="flex items-center justify-between min-h-[44px]">
              <div>
                <div class="text-sm text-gray-300">Push notifications</div>
                <div class="text-[10px] text-gray-500">Receive push on your device</div>
              </div>
              <button @click="togglePush" :disabled="pushLoading"
                class="relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0"
                :class="pushEnabled ? 'bg-emerald-600' : 'bg-gray-700'"
                role="switch" :aria-checked="pushEnabled" aria-label="Push notifications">
                <Loader2 v-if="pushLoading" :size="12" class="absolute left-5 top-2 animate-spin text-white" />
                <span v-else class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                  :class="pushEnabled ? 'translate-x-6' : ''"></span>
              </button>
            </div>

            <!-- Announcements -->
            <div class="flex items-center justify-between min-h-[44px]">
              <div>
                <div class="text-sm text-gray-300">Announcements</div>
                <div class="text-[10px] text-gray-500">Product updates from the BeBetter team</div>
              </div>
              <button @click="notifPrefs.announcementsEnabled = !notifPrefs.announcementsEnabled; saveNotifPrefs()"
                class="relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0"
                :class="notifPrefs.announcementsEnabled ? 'bg-emerald-600' : 'bg-gray-700'"
                role="switch" :aria-checked="!!notifPrefs.announcementsEnabled" aria-label="Announcements">
                <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                  :class="notifPrefs.announcementsEnabled ? 'translate-x-6' : ''"></span>
              </button>
            </div>
          </div>
          <div v-else class="text-center py-4">
            <Loader2 :size="16" class="animate-spin mx-auto text-gray-500" />
          </div>
        </div>

        <!-- Vacation Management -->
        <div class="card space-y-4">
          <div class="flex items-center gap-2">
            <Palmtree :size="16" class="text-amber-400" />
            <h3 class="section-title">Vacation</h3>
          </div>
          <div v-if="vacation.active" class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-amber-300">On Vacation</p>
                <p class="text-xs text-amber-400/70">Since {{ formatDate(vacation.data?.startDate) }}</p>
                <p v-if="vacation.data?.reason" class="text-xs text-gray-500 mt-1">{{ vacation.data.reason }}</p>
              </div>
              <button @click="endVacation" class="btn-secondary text-xs">
                <Play :size="12" /> End Early
              </button>
            </div>
          </div>
          <div v-else class="space-y-3">
            <p class="text-xs text-gray-500">Going on vacation? Pause all habits so they don't count as missed.</p>
            <div>
              <label class="text-xs font-medium text-gray-400 mb-1 block">Reason (optional)</label>
              <input v-model="vacationReason" class="input" placeholder="e.g. Holiday, sick leave..." />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-400 mb-1 block">End date (optional)</label>
              <input v-model="vacationEndDate" type="date" class="input" />
            </div>
            <button @click="startVacation" class="btn w-full">
              <Palmtree :size="14" /> Start Vacation
            </button>
          </div>
        </div>

        <!-- Security -->
        <div class="card space-y-4">
          <div class="flex items-center gap-2">
            <KeyRound :size="16" class="text-emerald-400" />
            <h3 class="section-title">Security</h3>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-400 mb-1 block">Current password</label>
              <input v-model="pwForm.current" type="password" class="input" placeholder="Current password" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-400 mb-1 block">New password</label>
              <input v-model="pwForm.newPw" type="password" class="input" placeholder="New password (min 6 chars)" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-400 mb-1 block">Confirm new password</label>
              <input v-model="pwForm.confirm" type="password" class="input" placeholder="Confirm new password" />
            </div>
            <button @click="changePassword" class="btn w-full"
              :disabled="!pwForm.current || !pwForm.newPw || pwForm.newPw !== pwForm.confirm || pwForm.newPw.length < 6">
              <KeyRound :size="14" /> Change Password
            </button>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="card space-y-4 border-red-500/20">
          <div class="flex items-center gap-2">
            <AlertTriangle :size="16" class="text-red-400" />
            <h3 class="section-title text-red-400">Danger Zone</h3>
          </div>
          <p class="text-xs text-gray-500">This action is irreversible. All your data will be permanently deleted.</p>
          <button @click="showDeleteConfirm = true" class="btn-danger w-full">
            <Trash2 :size="14" /> Delete Account
          </button>
        </div>
      </template>

      <!-- Activity (for other users) -->
      <div v-if="!isOwn" class="space-y-3">
        <h3 class="section-title">Recent Activity</h3>
        <div v-if="activity.length" class="space-y-2">
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
        <div v-else class="text-sm text-gray-500 py-2">No recent activity</div>
      </div>

      <!-- Full Avatar Modal -->
      <Teleport to="body">
        <div v-if="showFullAvatar" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4" @click.self="showFullAvatar = false" role="dialog" aria-modal="true" aria-label="Profile photo">
          <div class="relative max-w-lg w-full">
            <button @click="showFullAvatar = false" class="absolute -top-10 right-0 text-gray-400 hover:text-gray-200">
              <X :size="24" />
            </button>
            <img :src="profile.avatar" :alt="profile.username" class="w-full h-auto rounded-lg" />
          </div>
        </div>
      </Teleport>

      <!-- Delete Account Modal -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showDeleteConfirm = false" role="dialog" aria-modal="true" aria-label="Delete account">
          <div class="card w-full max-w-sm mx-0 sm:mx-4 space-y-4 rounded-b-2xl sm:rounded-2xl safe-bottom" style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 20px)">
            <h3 class="font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle :size="18" /> Delete Account
            </h3>
            <p class="text-sm text-gray-400">This is irreversible. Type <strong>DELETE_MY_ACCOUNT</strong> to confirm.</p>
            <input v-model="deleteConfirm" class="input" placeholder="DELETE_MY_ACCOUNT" aria-label="Type DELETE_MY_ACCOUNT to confirm" />
            <div class="flex gap-2">
              <button @click="deleteAccount" class="btn-danger flex-1" :disabled="deleteConfirm !== 'DELETE_MY_ACCOUNT'">
                <Loader2 v-if="deleting" :size="14" class="animate-spin" />
                <span v-else>Delete Forever</span>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { openDemoPrompt } from '../utils/demoPrompt'
import {
  UserPlus, Swords, Trash2, Camera, X, AlertTriangle, Loader2, Clock, Check,
  User, Bell, Palmtree, Play, KeyRound, Save, ChevronLeft, ChevronRight,
} from 'lucide-vue-next'
import ContributionGrid from '../components/ContributionGrid.vue'
import TimeInput from '../components/TimeInput.vue'
import { setTimeFormat as setTimeFormatGlobal, getTimeFormat } from '../utils/timeFormat'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const toast = useToast()

const profile = ref(null)
const loading = ref(true)
const activity = ref([])
const profileStats = ref({})
const isFriend = ref(false)
const requestSent = ref(false)
const showDeleteConfirm = ref(false)
const showFullAvatar = ref(false)
const deleteConfirm = ref('')
const deleting = ref(false)
const uploadingAvatar = ref(false)
const editForm = reactive({ bio: '', isPublic: false })

const notifPrefs = ref(null)
const vacation = reactive({ active: false, data: null })
const vacationReason = ref('')
const vacationEndDate = ref('')
const pwForm = reactive({ current: '', newPw: '', confirm: '' })
const pushEnabled = ref(false)
const pushLoading = ref(false)

const profileGrid = ref([])
const gridYear = ref(new Date().getFullYear())
const gridYearRange = ref({ firstYear: new Date().getFullYear(), lastYear: new Date().getFullYear() })

const timeFormat = ref(getTimeFormat())

const isOwn = computed(() => {
  const param = route.params.id
  if (!param || !auth.user) return false
  return String(auth.user.id) === param || auth.user.username === param
})

async function loadProfile() {
  loading.value = true
  try {
    const res = await api.get(`/friends/profile/${route.params.id}`)
    profile.value = res.data.user || res.data
    editForm.bio = profile.value.bio || ''
    editForm.isPublic = profile.value.isPublic || false
    isFriend.value = res.data.isFriend || false
    requestSent.value = res.data.requestSent || false
    activity.value = res.data.recentLogs || []
    profileStats.value = res.data.stats || {}
  } catch {
    toast.error('Profile not found')
  }
  loading.value = false
}

async function loadSettings() {
  if (!isOwn.value) return
  try {
    const [prefsRes, vacRes] = await Promise.all([
      api.get('/notifications/preferences').catch(() => ({ data: { preferences: null } })),
      api.get('/vacation/status').catch(() => ({ data: { active: false } })),
    ])
    notifPrefs.value = prefsRes.data.preferences
    vacation.active = vacRes.data.active
    vacation.data = vacRes.data.vacation
  } catch {
    toast.error('Failed to load settings')
  }

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      pushEnabled.value = !!sub
    } catch {}
  }
}

async function saveProfile() {
  if (auth.isDemo) {
    openDemoPrompt()
    return
  }
  try {
    await api.put('/auth/me', { bio: editForm.bio, isPublic: editForm.isPublic })
    toast.success('Profile updated')
    if (auth.user) {
      auth.user.bio = editForm.bio
      auth.user.isPublic = editForm.isPublic
    }
  } catch {
    toast.error('Failed to update profile')
  }
}

async function saveNotifPrefs() {
  if (auth.isDemo) {
    openDemoPrompt()
    return
  }
  if (!notifPrefs.value) return
  try {
    await api.put('/notifications/preferences', notifPrefs.value)
    toast.success('Settings saved')
  } catch {
    toast.error('Failed to save settings')
  }
}

async function togglePush() {
  if (auth.isDemo) {
    openDemoPrompt()
    return
  }
  if (pushEnabled.value) {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.post('/notifications/unsubscribe', { endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      pushEnabled.value = false
      toast.success('Push notifications disabled')
    } catch {
      toast.error('Failed to disable push')
    }
    return
  }

  pushLoading.value = true
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      toast.warning('Notification permission denied')
      pushLoading.value = false
      return
    }
    
    // Fetch dynamic VAPID public key from backend
    const vapidRes = await api.get('/notifications/vapid-public-key')
    const publicKey = vapidRes.data.publicKey
    if (!publicKey) {
      throw new Error('VAPID public key not configured on server')
    }

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    const keys = sub.toJSON().keys
    await api.post('/notifications/subscribe', {
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    pushEnabled.value = true
    toast.success('Push notifications enabled')
  } catch (err) {
    toast.error('Push setup failed: ' + (err.response?.data?.error || err.message))
    pushEnabled.value = false
  }
  pushLoading.value = false
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function startVacation() {
  try {
    const payload = {}
    if (vacationReason.value.trim()) payload.reason = vacationReason.value.trim()
    if (vacationEndDate.value) payload.endDate = vacationEndDate.value
    await api.post('/vacation/start', payload)
    vacation.active = true
    vacation.data = { startDate: new Date().toISOString(), reason: vacationReason.value }
    vacationReason.value = ''
    vacationEndDate.value = ''
    toast.success('Vacation started! Habits are paused.')
  } catch {
    toast.error('Failed to start vacation')
  }
}

async function endVacation() {
  try {
    await api.post('/vacation/end')
    vacation.active = false
    vacation.data = null
    toast.success('Vacation ended. Habits are active again!')
  } catch {
    toast.error('Failed to end vacation')
  }
}

async function changePassword() {
  if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return }
  if (pwForm.newPw.length < 6) { toast.error('Password must be at least 6 characters'); return }
  try {
    await api.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw })
    pwForm.current = ''
    pwForm.newPw = ''
    pwForm.confirm = ''
    toast.success('Password changed')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to change password')
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
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.error('Please choose an image file')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Image must be under 5MB')
    return
  }
  uploadingAvatar.value = true
  const formData = new FormData()
  formData.append('photo', file)
  try {
    const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    const avatarUrl = uploadRes.data.url
    await api.put('/auth/me', { avatar: avatarUrl })
    profile.value.avatar = avatarUrl
    toast.success('Avatar updated')
  } catch {
    toast.error('Failed to upload avatar')
  } finally {
    uploadingAvatar.value = false
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

function setTimeFormat(fmt) {
  timeFormat.value = setTimeFormatGlobal(fmt)
  toast.success(`Time format set to ${fmt === '12h' ? '12h (AM/PM)' : '24h'}`)
}

let gridToken = 0

async function loadProfileGrid() {
  const token = ++gridToken
  try {
    const [yearsRes, gridRes] = await Promise.all([
      api.get('/grid/years').catch(() => ({ data: { years: [new Date().getFullYear()] } })),
      api.get('/grid', { params: { from: `${gridYear.value}-01-01`, to: `${gridYear.value}-12-31` } }),
    ])
    if (token !== gridToken) return
    const years = yearsRes.data.years || [new Date().getFullYear()]
    gridYearRange.value = { firstYear: Math.min(...years), lastYear: Math.max(...years) }
    if (gridYear.value < gridYearRange.value.firstYear) gridYear.value = gridYearRange.value.firstYear
    if (gridYear.value > gridYearRange.value.lastYear) gridYear.value = gridYearRange.value.lastYear

    const gridRaw = gridRes.data.grid || {}
    const vacationSet = new Set(gridRes.data.vacationDays || [])
    const days = []
    const cur = new Date(`${gridYear.value}-01-01T12:00:00Z`)
    const end = new Date(`${gridYear.value}-12-31T12:00:00Z`)
    while (cur <= end) {
      const ds = cur.toISOString().slice(0, 10)
      const data = gridRaw[ds]
      const isVacation = vacationSet.has(ds)
      if (data) {
        days.push({
          date: ds,
          count: data.completed || 0,
          items: data.items || [],
          isVacation,
          scheduled: data.scheduled || 0,
          completed: data.completed || 0,
          habits: data.habits || 0,
          tasks: data.tasks || 0
        })
      } else {
        days.push({ date: ds, count: 0, items: [], isVacation, scheduled: 0, completed: 0, habits: 0, tasks: 0 })
      }
      cur.setDate(cur.getDate() + 1)
    }
    if (token !== gridToken) return
    profileGrid.value = days
  } catch {
    if (token !== gridToken) return
    profileGrid.value = []
  }
}

watch(gridYear, loadProfileGrid)

async function loadAll() {
  await loadProfile()
  if (isOwn.value) loadSettings()
  if (isOwn.value) loadProfileGrid()
}

watch(() => route.params.id, () => {
  profileGrid.value = []
  loadAll()
})

onMounted(loadAll)
</script>
