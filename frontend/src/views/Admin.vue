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
              </div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{{ r.targetType }}</span>
                <router-link v-if="r.targetLink" :to="r.targetLink" class="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline">
                  {{ r.targetTitle || '' }}
                </router-link>
                <span v-else class="text-xs font-medium text-gray-400">{{ r.targetTitle || '' }}</span>
              </div>
              <div v-if="r.targetUser" class="flex items-center gap-2 mt-1 p-2 rounded-lg bg-gray-800/50">
                <div class="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {{ (r.targetUser.username || '?')[0].toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-gray-300">{{ r.targetUser.username }}</div>
                  <div class="text-[10px] text-gray-500">{{ r.targetUser.email }}</div>
                </div>
                <span v-if="r.targetUser.bannedUntil" class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Banned</span>
              </div>
              <p class="text-sm text-gray-300 mt-1">{{ r.reason }}</p>
              <p v-if="r.description" class="text-xs text-gray-500 mt-1">{{ r.description }}</p>
            </div>
            <span class="text-[10px] text-gray-600 shrink-0">{{ formatDate(r.createdAt) }}</span>
          </div>
          <div v-if="r.status === 'pending' && r.targetUser" class="flex gap-2 pt-1">
            <button @click="banUser(r.targetUser)" class="btn-danger text-xs flex-1">
              <Ban :size="12" /> Ban User
            </button>
            <button @click="dismissReport(r)" class="btn-secondary text-xs flex-1">
              <X :size="12" /> Dismiss
            </button>
            <button @click="deleteReport(r)" class="btn-ghost text-red-400 text-xs shrink-0 px-2">
              <Trash2 :size="12" />
            </button>
          </div>
          <div v-else-if="r.status !== 'pending'" class="flex gap-2 pt-1 items-center">
            <span class="text-[10px] px-1.5 py-0.5 rounded"
              :class="r.status === 'dismissed' ? 'bg-gray-700 text-gray-400' : 'bg-emerald-500/10 text-emerald-400'">
              {{ r.status }}
            </span>
            <button @click="deleteReport(r)" class="text-[10px] text-red-400/70 hover:text-red-400 ml-auto">
              <Trash2 :size="10" /> Delete
            </button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-12 text-gray-500 text-sm">
        <Inbox :size="32" class="mx-auto mb-3 opacity-40" />
        <p>No reports</p>
      </div>
    </div>

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
          <div class="flex gap-1">
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
            <button v-if="!u.bannedUntil" @click="banUserFromList(u)"
              class="text-gray-600 hover:text-red-400 transition-colors p-1">
              <Ban :size="12" />
            </button>
            <button v-else @click="unbanUser(u)"
              class="text-gray-600 hover:text-emerald-400 transition-colors p-1">
              <ShieldCheck :size="12" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-500 text-sm">
        <p>{{ userSearch ? 'No users found' : 'Type to search users' }}</p>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Inbox, Loader2, Ban, X, ShieldCheck, Trash2 } from 'lucide-vue-next'

const toast = useToast()

const activeTab = ref('Reports')
const tabs = ['Reports', 'Users']
const adminStats = ref({})
const reports = ref([])
const users = ref([])
const userSearch = ref('')
const loadingReports = ref(false)
const loadingUsers = ref(false)

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

function banUserFromList(u) {
  banTarget.value = u
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
    loadReports()
    searchUsers()
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

onMounted(async () => {
  await Promise.all([loadStats(), loadReports(), searchUsers()])
})
</script>
