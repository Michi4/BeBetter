<template>
  <div class="page">
    <h1 class="text-xl font-bold">Admin</h1>

    <div class="grid grid-cols-2 gap-3">
      <div v-for="stat in statCards" :key="stat.label" class="card text-center">
        <div class="text-2xl font-bold text-emerald-400">{{ stat.value }}</div>
        <div class="text-[10px] text-gray-500 mt-1">{{ stat.label }}</div>
      </div>
    </div>

    <div class="flex gap-2 overflow-x-auto no-scrollbar">
      <button
        v-for="t in tabs"
        :key="t"
        @click="activeTab = t"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 shrink-0"
        :class="activeTab === t
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
      >
        {{ t }}
      </button>
    </div>

    <!-- REPORTS TAB -->
    <div v-if="activeTab === 'Reports'" class="space-y-2">
      <div v-if="loadingReports" class="text-center py-8">
        <Loader2 :size="20" class="animate-spin text-gray-500 mx-auto" />
      </div>
      <div v-else-if="reports.length" class="space-y-2">
        <div v-for="r in reports" :key="r.id" class="card space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="text-xs text-gray-500 mb-1">
                Reported by <span class="text-gray-300">{{ r.reporter?.username || 'Unknown' }}</span>
                <span class="text-gray-600 ml-1">{{ formatDate(r.createdAt) }}</span>
              </div>

              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{{ r.targetType }}</span>
                <router-link v-if="r.targetLink" :to="r.targetLink" class="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline">
                  {{ r.targetTitle || '' }}
                </router-link>
                <span v-else class="text-xs font-medium text-gray-400">{{ r.targetTitle || 'Unknown' }}</span>
                <span v-if="!r.targetLink" class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">deleted</span>
              </div>

              <div v-if="r.targetUser" class="flex items-center gap-2 mt-1 p-2 rounded-lg bg-gray-800/50">
                <div class="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {{ (r.targetUser.username || '?')[0].toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-gray-300">{{ r.targetUser.username }}</div>
                  <div class="text-[10px] text-gray-500">{{ r.targetUser.email }}</div>
                </div>
                <span v-if="r.targetUser.bannedUntil" class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                  Banned {{ formatDate(r.targetUser.bannedUntil) }}
                </span>
              </div>

              <p class="text-sm text-gray-300 mt-1">{{ r.reason }}</p>
              <p v-if="r.description" class="text-xs text-gray-500 mt-1">{{ r.description }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-1 border-t border-gray-800/50">
            <template v-if="r.status === 'pending'">
              <button v-if="r.targetUser && !r.targetUser.bannedUntil" @click="banUser(r.targetUser)" class="btn-danger text-xs flex-1 min-h-[36px]">
                <Ban :size="12" /> Ban User
              </button>
              <button v-if="r.targetUser && r.targetUser.bannedUntil" @click="unbanUser(r.targetUser)" class="btn-secondary text-xs flex-1 min-h-[36px]">
                <ShieldCheck :size="12" /> Unban
              </button>
              <button @click="dismissReport(r)" class="btn-secondary text-xs flex-1 min-h-[36px]">
                <EyeOff :size="12" /> Dismiss
              </button>
              <button @click="resolveReport(r)" class="btn text-xs flex-1 min-h-[36px]">
                <CheckCircle :size="12" /> Resolve
              </button>
            </template>
            <template v-else>
              <span class="text-[10px] px-1.5 py-0.5 rounded"
                :class="r.status === 'dismissed' ? 'bg-gray-700 text-gray-400' : 'bg-emerald-500/10 text-emerald-400'">
                {{ r.status }}
              </span>
            </template>
            <button @click="deleteReport(r)" class="btn-ghost text-red-400/70 hover:text-red-400 text-xs shrink-0 px-2 min-h-[36px]" aria-label="Delete report">
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-12 text-gray-500 text-sm">
        <Inbox :size="32" class="mx-auto mb-3 opacity-40" />
        <p>No reports</p>
      </div>
    </div>

    <!-- USERS TAB -->
    <div v-if="activeTab === 'Users'" class="space-y-3">
      <input
        v-model="userSearch"
        @input="debouncedSearchUsers"
        type="text"
        placeholder="Search users..."
        class="input"
      />
      <div v-if="loadingUsers" class="text-center py-8">
        <Loader2 :size="20" class="animate-spin text-gray-500 mx-auto" />
      </div>
      <div v-else-if="users.length" class="space-y-1">
        <div
          v-for="u in users"
          :key="u.id"
          class="card flex items-center gap-3"
        >
          <div class="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
            {{ (u.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ u.username }}</div>
            <div class="text-xs text-gray-500 truncate">{{ u.email }}</div>
            <div v-if="u.bannedUntil" class="text-[10px] text-red-400">Banned until {{ formatDate(u.bannedUntil) }}</div>
          </div>
          <div class="flex gap-1 items-center">
            <button @click="toggleAdmin(u)" class="shrink-0">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-medium"
                :class="u.role === 'admin'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-gray-700 text-gray-400'"
              >
                {{ u.role }}
              </span>
            </button>
            <button v-if="!u.bannedUntil" @click="banUser(u)"
              class="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-500/10" aria-label="Ban user">
              <Ban :size="14" />
            </button>
            <button v-else @click="unbanUser(u)"
              class="text-gray-600 hover:text-emerald-400 transition-colors p-1.5 rounded hover:bg-emerald-500/10" aria-label="Unban user">
              <ShieldCheck :size="14" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-500 text-sm">
        <p>{{ userSearch ? 'No users found' : 'Type to search users' }}</p>
      </div>
    </div>

    <!-- NOTIFICATIONS TAB -->
    <div v-if="activeTab === 'Notifications'" class="space-y-4">
      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold">Send test notification</div>
            <div class="text-[10px] text-gray-500">Verifies push delivery to your own device</div>
          </div>
          <button @click="sendTestNotification" :disabled="testLoading" class="btn text-xs min-h-[36px]">
            <Loader2 v-if="testLoading" :size="12" class="animate-spin" />
            <Bell v-else :size="12" />
            Test push
          </button>
        </div>
        <div class="flex flex-wrap gap-1">
          <span v-for="(s, i) in testStatus" :key="i" class="text-[10px] px-1.5 py-0.5 rounded" :class="s.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : s.type === 'warn' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-700 text-gray-400'">
            {{ s.text }}
          </span>
        </div>
      </div>

      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold">Send to a user</div>
            <div class="text-[10px] text-gray-500">Test push to a specific user</div>
          </div>
        </div>
        <input v-model="testTargetSearch" @input="searchTestTargets" type="text" placeholder="Search user by username or email..." class="input" />
        <div v-if="testTargetResults.length" class="space-y-1 max-h-40 overflow-y-auto">
          <button v-for="u in testTargetResults" :key="u.id" @click="sendTestNotification(u.id)"
            class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left">
            <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold shrink-0">
              {{ (u.username || 'U')[0].toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs truncate">{{ u.username }}</div>
              <div class="text-[10px] text-gray-500 truncate">{{ u.email }}</div>
            </div>
            <Bell :size="12" class="text-gray-500 shrink-0" />
          </button>
        </div>
        <div v-else class="text-[10px] text-gray-500">Type at least 2 characters to search users</div>
      </div>

      <div class="card space-y-3 border-amber-500/30">
        <div>
          <div class="text-sm font-semibold">Broadcast announcement</div>
          <div class="text-[10px] text-gray-500">Sent to all users (except those who opted out). Use sparingly for product updates.</div>
        </div>
        <input v-model="announcementForm.title" type="text" maxlength="80" placeholder="Title, e.g. New: streak battles" class="input" />
        <textarea v-model="announcementForm.message" maxlength="500" rows="3" placeholder="Message body..." class="input resize-none"></textarea>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input v-model="announcementForm.sendPush" type="checkbox" class="accent-emerald-500 w-4 h-4" />
            Also send push notification
          </label>
          <span class="text-[10px] text-gray-500">{{ announcementForm.message.length }}/500</span>
        </div>
        <button @click="sendAnnouncement" :disabled="announceLoading || !announcementForm.title || !announcementForm.message"
          class="btn text-xs min-h-[36px] w-full sm:w-auto">
          <Loader2 v-if="announceLoading" :size="12" class="animate-spin" />
          <Megaphone v-else :size="12" />
          Broadcast
        </button>
        <div v-if="announceResult" class="text-[10px] px-2 py-1.5 rounded bg-emerald-500/10 text-emerald-400">
          Delivered to {{ announceResult.delivered }} users{{ announceResult.pushTargets ? `, push sent to ${announceResult.pushTargets}` : '' }}{{ announceResult.optedOutSkipped ? `, ${announceResult.optedOutSkipped} opted out` : '' }}
        </div>
      </div>
    </div>

    <!-- Ban dialog -->
    <Teleport to="body">
      <div v-if="showBanDialog" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" @click.self="showBanDialog = false">
        <div class="card w-full max-w-sm mx-0 sm:mx-4 space-y-3 rounded-b-none sm:rounded-xl safe-bottom">
          <p class="section-title">Ban {{ banTarget?.username }}</p>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">Duration (days)</label>
            <input v-model.number="banDays" type="number" min="1" max="365" class="input" placeholder="7" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">Reason (optional)</label>
            <input v-model="banReason" class="input" placeholder="Why are you banning this user?" />
          </div>
          <div class="flex gap-2 pt-1">
            <button @click="confirmBan" class="btn-danger flex-1" :disabled="!banDays || banDays < 1">
              <Ban :size="14" /> Ban
            </button>
            <button @click="showBanDialog = false" class="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>
    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Inbox, Loader2, Ban, ShieldCheck, Trash2, EyeOff, CheckCircle, Bell, Megaphone } from 'lucide-vue-next'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const toast = useToast()

const activeTab = ref('Reports')
const tabs = ['Reports', 'Users', 'Notifications']
const adminStats = ref({})
const reports = ref([])
const users = ref([])
const userSearch = ref('')
const loadingReports = ref(false)
const loadingUsers = ref(false)
const testLoading = ref(false)
const testStatus = ref([])
const testTargetSearch = ref('')
const testTargetResults = ref([])
const announceLoading = ref(false)
const confirmDialog = ref(null)
const announceResult = ref(null)
const announcementForm = ref({ title: '', message: '', sendPush: false })

const showBanDialog = ref(false)
const banTarget = ref(null)
const banDays = ref(7)
const banReason = ref('')

const statCards = computed(() => [
  { label: 'Users', value: adminStats.value.totalUsers || 0 },
  { label: 'Habits', value: adminStats.value.totalHabits || 0 },
  { label: 'Tasks', value: adminStats.value.totalTasks || 0 },
  { label: 'Logs', value: adminStats.value.totalLogs || 0 },
  { label: 'Active Today', value: adminStats.value.activeToday || 0 },
  { label: 'New (7d)', value: adminStats.value.newUsersWeek || 0 },
])

async function loadStats() {
  try {
    const res = await api.get('/admin/stats')
    adminStats.value = res.data.stats || res.data
  } catch {
    toast.error('Failed to load stats')
  }
}

async function loadReports() {
  loadingReports.value = true
  try {
    const res = await api.get('/admin/reports')
    reports.value = res.data.reports || res.data || []
  } catch {
    reports.value = []
  } finally {
    loadingReports.value = false
  }
}

let debounceTimer = null
function debouncedSearchUsers() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(searchUsers, 300)
}

async function searchUsers() {
  loadingUsers.value = true
  try {
    const res = await api.get('/admin/users', { params: { q: userSearch.value } })
    users.value = res.data.users || res.data || []
  } catch {
    users.value = []
  } finally {
    loadingUsers.value = false
  }
}

async function toggleAdmin(u) {
  const newRole = u.role === 'admin' ? 'user' : 'admin'
  const ok = await confirmDialog.value?.open({
    title: `Change role?`,
    message: `Set ${u.username} to ${newRole}?`,
    confirmLabel: 'Confirm',
    danger: true,
  })
  if (!ok) return
  try {
    await api.post(`/admin/users/${u.id}/role`, { role: newRole })
    u.role = newRole
    toast.success(`User is now ${newRole}`)
  } catch {
    toast.error('Failed to update role')
  }
}

function banUser(user) {
  banTarget.value = user
  banDays.value = 7
  banReason.value = ''
  showBanDialog.value = true
}

async function confirmBan() {
  if (!banTarget.value || !banDays.value) return
  try {
    await api.post(`/admin/users/${banTarget.value.id}/ban`, {
      days: banDays.value,
      reason: banReason.value || null,
    })
    toast.success(`${banTarget.value.username} banned for ${banDays.value} days`)
    showBanDialog.value = false
    banTarget.value.bannedUntil = new Date(Date.now() + banDays.value * 86400000).toISOString()
    loadReports()
  } catch {
    toast.error('Failed to ban user')
  }
}

async function unbanUser(u) {
  try {
    await api.post(`/admin/users/${u.id}/unban`)
    u.bannedUntil = null
    toast.success(`${u.username} unbanned`)
  } catch {
    toast.error('Failed to unban user')
  }
}

async function dismissReport(r) {
  try {
    await api.post(`/admin/reports/${r.id}/dismiss`)
    r.status = 'dismissed'
    toast.success('Report dismissed')
  } catch {
    toast.error('Failed to dismiss')
  }
}

async function resolveReport(r) {
  try {
    await api.post(`/admin/reports/${r.id}/action`)
    r.status = 'resolved'
    toast.success('Report resolved')
  } catch {
    toast.error('Failed to resolve')
  }
}

async function deleteReport(r) {
  try {
    await api.delete(`/admin/reports/${r.id}`)
    reports.value = reports.value.filter(report => report.id !== r.id)
    toast.success('Report deleted')
  } catch {
    toast.error('Failed to delete report')
  }
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function sendTestNotification(userId = null) {
  testLoading.value = true
  testStatus.value = []
  try {
    const res = await api.post('/admin/test-notification', { userId })
    if (userId) {
      const u = testTargetResults.value.find(x => x.id === userId)
      testStatus.value = [{ type: 'ok', text: `Push sent to ${u ? u.username : 'user'} (in-app + push if subscribed)` }]
    } else {
      testStatus.value = [
        { type: 'ok', text: 'Test notification sent' },
        { type: 'warn', text: 'If you have push enabled, it appears now' },
      ]
    }
    toast.success('Test notification sent')
  } catch (e) {
    testStatus.value = [{ type: 'warn', text: e.response?.data?.error || 'Failed to send' }]
    toast.error('Failed to send test notification')
  } finally {
    testLoading.value = false
  }
}

let testDebounce = null
function searchTestTargets() {
  clearTimeout(testDebounce)
  if (testTargetSearch.value.length < 2) {
    testTargetResults.value = []
    return
  }
  testDebounce = setTimeout(async () => {
    try {
      const res = await api.get('/admin/users', { params: { q: testTargetSearch.value } })
      testTargetResults.value = (res.data.users || res.data || []).slice(0, 6)
    } catch {
      testTargetResults.value = []
    }
  }, 300)
}

async function sendAnnouncement() {
  if (!announcementForm.value.title.trim() || !announcementForm.value.message.trim()) return
  const title = announcementForm.value.title.trim()
  const message = announcementForm.value.message.trim()
  const ok = await confirmDialog.value?.open({
    title: 'Broadcast to all users?',
    message: `"${title}" will be delivered to every user. This cannot be undone.`,
    confirmLabel: 'Broadcast',
    danger: true,
  })
  if (!ok) return

  announceLoading.value = true
  announceResult.value = null
  try {
    const res = await api.post('/admin/announcements', {
      title,
      message,
      sendPush: announcementForm.value.sendPush,
    })
    announceResult.value = res.data
    announcementForm.value.title = ''
    announcementForm.value.message = ''
    announcementForm.value.sendPush = false
    toast.success(`Announcement delivered to ${res.data.delivered} users`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to broadcast')
  } finally {
    announceLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadStats(), loadReports(), searchUsers()])
})
</script>
