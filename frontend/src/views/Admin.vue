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
                Reported by <span class="text-gray-300">{{ r.reporter?.name || r.reporterName || 'Unknown' }}</span>
              </div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{{ r.targetType }}</span>
                <span class="text-xs font-medium text-gray-400">{{ r.targetTitle || r.targetName || '' }}</span>
              </div>
              <p class="text-sm text-gray-300">{{ r.reason }}</p>
              <p v-if="r.details" class="text-xs text-gray-500 mt-1">{{ r.details }}</p>
            </div>
            <span class="text-[10px] text-gray-600 shrink-0">{{ formatDate(r.createdAt) }}</span>
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
            {{ (u.name || 'U')[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ u.name }}</div>
            <div class="text-xs text-gray-500 truncate">@{{ u.username }} &middot; {{ u.email }}</div>
          </div>
          <button
            @click="toggleAdmin(u)"
            class="shrink-0"
          >
            <span
              class="text-[10px] px-1.5 py-0.5 rounded font-medium"
              :class="u.role === 'admin'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-gray-700 text-gray-400'"
            >
              {{ u.role }}
            </span>
          </button>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-500 text-sm">
        <p>{{ userSearch ? 'No users found' : 'Type to search users' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Inbox, Loader2 } from 'lucide-vue-next'

const toast = useToast()

const activeTab = ref('Reports')
const tabs = ['Reports', 'Users']
const adminStats = ref({})
const reports = ref([])
const users = ref([])
const userSearch = ref('')
const loadingReports = ref(false)
const loadingUsers = ref(false)

const statCards = computed(() => [
  { label: 'Users', value: adminStats.value.totalUsers || 0 },
  { label: 'Habits', value: adminStats.value.totalHabits || 0 },
  { label: 'Tasks', value: adminStats.value.totalTasks || 0 },
  { label: 'Logs', value: adminStats.value.totalLogs || 0 },
  { label: 'Active Streaks', value: adminStats.value.activeStreaks || 0 },
  { label: 'Presets', value: adminStats.value.totalPresets || 0 },
  { label: 'Reports', value: adminStats.value.totalReports || 0 },
  { label: 'Active Breaks', value: adminStats.value.activeBreaks || 0 },
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
    await api.put(`/admin/users/${u.id}`, { role: newRole })
    u.role = newRole
    toast.success(`User is now ${newRole}`)
  } catch {
    toast.error('Failed to update role')
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
