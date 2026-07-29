<template>
  <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
    <h1 class="text-xl font-bold">Admin</h1>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div v-for="stat in statCards" :key="stat.label" class="card text-center">
        <div class="text-2xl font-bold text-emerald-400">{{ stat.value }}</div>
        <div class="text-[10px] text-gray-500 mt-1">{{ stat.label }}</div>
      </div>
    </div>

    <div class="flex gap-2">
      <button v-for="t in tabs" :key="t" @click="activeTab = t"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
        :class="activeTab === t ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
        {{ t }}
      </button>
    </div>

    <div v-if="activeTab === 'Reports'" class="card space-y-2">
      <div v-for="r in reports" :key="r.id" class="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
        <div>
          <span class="text-xs text-gray-400">{{ r.targetType }}</span>
          <span class="text-sm ml-2">{{ r.reason }}</span>
        </div>
        <span class="text-xs text-gray-500">{{ new Date(r.createdAt).toLocaleDateString() }}</span>
      </div>
      <p v-if="!reports.length" class="text-sm text-gray-500 text-center py-4">No reports</p>
    </div>

    <div v-if="activeTab === 'Users'" class="card space-y-3">
      <input v-model="userSearch" @input="searchUsers" type="text" placeholder="Search users..." class="input" />
      <div class="space-y-1">
        <div v-for="u in users" :key="u.id" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800 transition-colors duration-150">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
              {{ (u.name || 'U')[0].toUpperCase() }}
            </div>
            <div>
              <div class="text-sm">{{ u.name }}</div>
              <div class="text-xs text-gray-500">@{{ u.username }} · {{ u.email }}</div>
            </div>
          </div>
          <span class="text-xs px-1.5 py-0.5 rounded" :class="u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'">{{ u.role }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'

const toast = useToast()
const activeTab = ref('Reports')
const tabs = ['Reports', 'Users']
const adminStats = ref({})
const reports = ref([])
const users = ref([])
const userSearch = ref('')

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

async function loadAdmin() {
  try {
    const [statsRes, reportsRes] = await Promise.all([api.get('/admin/stats'), api.get('/admin/reports')])
    adminStats.value = statsRes.data.stats || statsRes.data
    reports.value = reportsRes.data.reports || reportsRes.data || []
  } catch { toast.error('Failed to load admin data') }
}

async function searchUsers() {
  try {
    const res = await api.get('/admin/users', { params: { q: userSearch.value } })
    users.value = res.data.users || res.data || []
  } catch { users.value = [] }
}

onMounted(loadAdmin)
</script>
