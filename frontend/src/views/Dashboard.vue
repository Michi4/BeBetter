<template>
  <div class="page pb-32 md:pb-24">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 :size="24" class="animate-spin text-emerald-400" />
    </div>

    <template v-else>
    <!-- Inline Notifications -->
    <NotificationAlerts />

    <!-- Demo Banner -->
    <div v-if="auth.isDemo" class="card bg-emerald-500/10 border border-emerald-500/20">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <FlaskConical :size="18" class="text-emerald-400 shrink-0" />
          <div>
            <p class="text-sm font-medium text-emerald-300">You're in the demo account</p>
            <p class="text-xs text-emerald-400/80">Shared public account - data resets hourly. Sign up to save your own streaks.</p>
          </div>
        </div>
        <router-link to="/register" class="text-xs text-emerald-300 hover:text-emerald-100 transition-colors">Sign up free</router-link>
      </div>
    </div>

    <!-- Vacation Banner -->
    <div v-if="isOnVacation" class="card bg-amber-500/10 border border-amber-500/20">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Palmtree :size="18" class="text-amber-400 shrink-0" />
          <div>
            <p class="text-sm font-medium text-amber-300">You're on vacation</p>
            <p class="text-xs text-amber-400/70">No habits scheduled. Enjoy your break!</p>
          </div>
        </div>
        <button @click="endVacation" class="text-xs text-amber-400 hover:text-amber-300 transition-colors">End early</button>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="card text-center py-3">
        <div class="text-xl font-bold text-emerald-400">{{ stats.activeStreak || 0 }}</div>
        <div class="text-[10px] text-gray-500 mt-0.5">Streak</div>
      </div>
      <div class="card text-center py-3">
        <div class="text-xl font-bold text-emerald-400">{{ stats.consistency || 0 }}%</div>
        <div class="text-[10px] text-gray-500 mt-0.5">Consistency</div>
      </div>
      <div class="card text-center py-3">
        <div class="text-xl font-bold text-emerald-400">{{ stats.totalLogs || 0 }}</div>
        <div class="text-[10px] text-gray-500 mt-0.5">Total Done</div>
      </div>
      <div class="card text-center py-3">
        <div class="text-xl font-bold text-emerald-400">{{ stats.todayLogs || 0 }}</div>
        <div class="text-[10px] text-gray-500 mt-0.5">Today</div>
      </div>
    </div>

    <!-- Contribution Grid -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <h2 class="section-title">Year in Review</h2>
        <div v-if="yearRange.lastYear > yearRange.firstYear" class="flex items-center gap-1">
          <button @click="selectedYear--" :disabled="selectedYear <= yearRange.firstYear"
            class="touch-target p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft :size="16" />
          </button>
          <span class="text-xs font-medium text-gray-400 min-w-[36px] text-center">{{ selectedYear }}</span>
          <button @click="selectedYear++" :disabled="selectedYear >= yearRange.lastYear"
            class="touch-target p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight :size="16" />
          </button>
        </div>
        <span v-else class="text-xs font-medium text-gray-400">{{ selectedYear }}</span>
      </div>
      <ContributionGrid :grid="gridDays" :year="selectedYear" @select="selectDay" />
    </div>

    <!-- Quick Create (Task + Habit) - desktop only, mobile uses the floating button -->
    <div class="card space-y-3 hidden md:block">
      <h3 class="section-title">Quick Create</h3>
      <div class="flex gap-2">
        <input v-model="quickTaskTitle" @keydown.enter="createQuickTask"
          class="input flex-1" placeholder="Add a quick task..." />
        <button @click="createQuickTask" class="btn px-4" :disabled="!quickTaskTitle.trim()">
          Add
        </button>
      </div>
      <div class="flex items-center gap-3">
        <button @click="createInitialMode = 'task'; showCreateModal = true"
          class="flex-1 flex items-center justify-center gap-2 btn-secondary px-3 py-2.5">
          <Plus :size="16" /> New Task
        </button>
        <button @click="createInitialMode = 'habit'; showCreateModal = true"
          class="flex-1 flex items-center justify-center gap-2 btn px-3 py-2.5">
          <Target :size="16" /> New Habit
        </button>
      </div>
    </div>

    <!-- Today's Tasks -->
    <div class="space-y-2">
      <h3 class="section-title">Today's Tasks</h3>
      <div v-if="visibleTasks.length === 0" class="text-sm text-gray-500 py-2">No tasks for today</div>
      <TaskCard v-for="t in visibleTasks" :key="t.id" :task="t"
        @complete="completeTask" @delete="deleteTask" @edit="editTask" @convert="convertTask" />
      <button v-if="todayTasks.length > 5 && !showAllTasks" @click="showAllTasks = true"
        class="touch-target text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
        <ChevronDown :size="14" /> Show more ({{ todayTasks.length - 5 }} remaining)
      </button>
      <button v-if="showAllTasks && todayTasks.length > 5" @click="showAllTasks = false"
        class="touch-target text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
        <ChevronUp :size="14" /> Show less
      </button>
    </div>

    <!-- Overdue Habits -->
    <div v-if="overdueHabits.length" class="space-y-2">
      <h3 class="section-title text-red-400/80">Overdue</h3>
      <HabitCard v-for="h in overdueHabits" :key="'overdue-' + h.id + '-' + (h.scheduledTime || '')"
        :habit="h" :scheduled-time="h.scheduledTime"
        @finish="logHabit" @cam="openCam" />
    </div>

    <!-- Now Habits -->
    <div v-if="nowHabits.length" class="space-y-2">
      <h3 class="section-title">Now</h3>
      <HabitCard v-for="h in nowHabits" :key="'now-' + h.id + '-' + (h.scheduledTime || '')"
        :habit="h" :scheduled-time="h.scheduledTime"
        @finish="logHabit" @cam="openCam" />
    </div>

    <!-- Upcoming Habits -->
    <div v-if="upcomingHabits.length" class="space-y-2">
      <h3 class="section-title">Upcoming</h3>
      <HabitCard v-for="h in upcomingHabits" :key="'up-' + h.id + '-' + (h.scheduledTime || '')"
        :habit="h" :scheduled-time="h.scheduledTime"
        @finish="logHabit" @cam="openCam" />
    </div>

    <!-- Unscheduled Habits -->
    <div v-if="unscheduledHabits.length" class="space-y-2">
      <h3 class="section-title">Today's Habits</h3>
      <HabitCard v-for="h in unscheduledHabits" :key="'un-' + h.id"
        :habit="h"
        @finish="logHabit" @cam="openCam" />
    </div>

    <!-- DayDetail Modal -->
    <DayDetail :show="!!selectedDay" :day="selectedDay" @close="selectedDay = null" />
    <BeBetterCam :show="!!camHabit" @close="camHabit = null" @capture="submitCamProof" />

    <!-- Mobile floating add button (above bottom nav) -->
    <div class="fixed bottom-20 left-0 right-0 z-40 flex justify-center md:hidden pointer-events-none">
      <button @click="createInitialMode = 'task'; showCreateModal = true"
        class="pointer-events-auto touch-target shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 transition-colors active:scale-95">
        <Plus :size="24" />
      </button>
    </div>

    <!-- Create Modal -->
    <CreateModal :show="showCreateModal" :initial-mode="createInitialMode" :convert-data="convertData"
      @close="showCreateModal = false; convertData = null" @created="handleCreated" @convertToHabit="handleConvertToHabit" />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Target, Loader2, FlaskConical, Palmtree } from 'lucide-vue-next'
import ContributionGrid from '../components/ContributionGrid.vue'
import DayDetail from '../components/DayDetail.vue'
import HabitCard from '../components/HabitCard.vue'
import TaskCard from '../components/TaskCard.vue'
import BeBetterCam from '../components/BeBetterCam.vue'
import CreateModal from '../components/CreateModal.vue'
import NotificationAlerts from '../components/NotificationAlerts.vue'
import { useAuthStore } from '../stores/auth'
import { openDemoPrompt } from '../utils/demoPrompt'

const auth = useAuthStore()
const toast = useToast()

const showAllTasks = ref(false)
const selectedDay = ref(null)
const camHabit = ref(null)
const isOnVacation = ref(false)
const showCreateModal = ref(false)
const createInitialMode = ref('task')
const quickTaskTitle = ref('')
const convertData = ref(null)

const stats = ref({})
const todayTasks = ref([])
const todayHabits = ref([])
const gridDays = ref([])
const loading = ref(true)

const selectedYear = ref(new Date().getFullYear())
const yearRange = ref({ firstYear: new Date().getFullYear(), lastYear: new Date().getFullYear() })

const visibleTasks = computed(() => {
  if (showAllTasks.value || todayTasks.value.length <= 5) return todayTasks.value
  return todayTasks.value.slice(0, 5)
})

function getCurrentTimeMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function timeToMinutes(t) {
  if (!t) return -1
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const unscheduledHabits = computed(() => todayHabits.value.filter(h => !h.scheduledTime))
const overdueHabits = computed(() => {
  const now = getCurrentTimeMinutes()
  return todayHabits.value.filter(h => h.scheduledTime && timeToMinutes(h.scheduledTime) < now - 30 && !h.completedToday && !h.hasBreak)
})
const nowHabits = computed(() => {
  const now = getCurrentTimeMinutes()
  return todayHabits.value.filter(h => {
    if (!h.scheduledTime || h.hasBreak) return false
    const t = timeToMinutes(h.scheduledTime)
    return t >= now - 30 && t <= now + 30
  })
})
const upcomingHabits = computed(() => {
  const now = getCurrentTimeMinutes()
  return todayHabits.value.filter(h => h.scheduledTime && timeToMinutes(h.scheduledTime) > now + 30 && !h.completedToday && !h.hasBreak)
})

async function createQuickTask() {
  if (!quickTaskTitle.value.trim()) return
  try {
    const res = await api.post('/tasks', { title: quickTaskTitle.value.trim() })
    todayTasks.value.unshift(res.data.task || res.data)
    quickTaskTitle.value = ''
    toast.success('Task created')
  } catch {
    toast.error('Failed to create task')
  }
}

async function loadStats() {
  try {
    const [overviewRes, habitsRes] = await Promise.all([
      api.get('/stats/overview'),
      api.get('/habits/scheduled'),
    ])
    stats.value = overviewRes.data
    isOnVacation.value = overviewRes.data.isOnVacation || false

    const rawHabits = habitsRes.data.habits || []
    const todayLogsRes = await api.get('/logs/today').catch(() => ({ data: { logs: [] } }))
    const logs = todayLogsRes.data.logs || []

    const expanded = []
    for (const h of rawHabits) {
      const sched = h.schedules
      if (sched && sched.length && sched.some(s => s.time)) {
        const today = new Date().getDay()
        for (const s of sched) {
          if (s.time && s.days.includes(today)) {
            const logForSlot = logs.find(l => l.habitId === h.id && l.scheduledTime === s.time)
            expanded.push({
              ...h,
              scheduledTime: s.time,
              completedToday: !!logForSlot,
              hasBreak: !!h.breaks?.find(b => !b.endDate),
            })
          }
        }
      } else {
        const hasLog = logs.some(l => l.habitId === h.id)
        expanded.push({
          ...h,
          scheduledTime: null,
          completedToday: hasLog,
          hasBreak: !!h.breaks?.find(b => !b.endDate),
        })
      }
    }
    todayHabits.value = expanded
  } catch {
    toast.error('Failed to load data')
  }
}

async function loadTasks() {
  try {
    const res = await api.get('/tasks')
    todayTasks.value = (res.data.tasks || []).filter(t => !t.isCompletedToday && t.isDueToday !== false)
  } catch {
    toast.error('Failed to load tasks')
  }
}

async function loadYearRange() {
  try {
    const res = await api.get('/grid/years')
    const years = res.data.years || [new Date().getFullYear()]
    yearRange.value = { firstYear: Math.min(...years), lastYear: Math.max(...years) }
    if (selectedYear.value < yearRange.value.firstYear) selectedYear.value = yearRange.value.firstYear
    if (selectedYear.value > yearRange.value.lastYear) selectedYear.value = yearRange.value.lastYear
  } catch {
    yearRange.value = { firstYear: new Date().getFullYear(), lastYear: new Date().getFullYear() }
  }
}

async function loadGrid() {
  try {
    const year = selectedYear.value
    const from = `${year}-01-01`
    const to = `${year}-12-31`
    const gridRes = await api.get('/grid', { params: { from, to } })
    const gridRaw = gridRes.data.grid || {}
    const vacationSet = new Set(gridRes.data.vacationDays || [])
    const days = []
    const cur = new Date(from + 'T12:00:00Z')
    const end = new Date(to + 'T12:00:00Z')
    while (cur <= end) {
      const ds = cur.toISOString().slice(0, 10)
      const data = gridRaw[ds]
      const isVacation = vacationSet.has(ds)
      if (data) {
        days.push({ date: ds, count: (data.completed || 0), items: data.items || [], isVacation, scheduled: data.scheduled || 0, completed: data.completed || 0, habits: data.habits || 0, tasks: data.tasks || 0 })
      } else {
        days.push({ date: ds, count: 0, items: [], isVacation, scheduled: 0, completed: 0, habits: 0, tasks: 0 })
      }
      cur.setDate(cur.getDate() + 1)
    }
    gridDays.value = days
  } catch {
    toast.error('Failed to load grid')
  }
}

watch(selectedYear, loadGrid)

async function handleCreated(type, data) {
  if (type !== 'task' && auth.isDemo && data.makePublic) {
    showCreateModal.value = false
    openDemoPrompt()
    return
  }
  if (type === 'task') {    try {
      const payload = { title: data.title, description: data.description, emoji: data.emoji, dueDate: data.dueDate || undefined }
      if (data.scheduledTime) payload.scheduledTime = data.scheduledTime
      if (data.scheduledDays?.length) payload.scheduledDays = data.scheduledDays
      if (data.reminderMinutes != null) payload.reminderMinutes = data.reminderMinutes
      const res = await api.post('/tasks', payload)
      todayTasks.value.unshift(res.data.task || res.data)
      toast.success('Task created')
    } catch {
      toast.error('Failed to create task')
    }
  } else {
    try {
      const payload = {
        title: data.title, description: data.description || undefined, emoji: data.emoji,
        schedules: data.schedules, verificationType: data.verificationType,
        makePublic: data.makePublic,
      }
      if (data.reminderMinutes != null) payload.reminderMinutes = data.reminderMinutes
      if (data.buddyIds?.length) payload.buddyIds = data.buddyIds
      if (data.challengeFriendIds?.length) {
        payload.challengeFriendIds = data.challengeFriendIds
        if (data.challengeEndDate) payload.endDate = data.challengeEndDate
      }
      await api.post('/habits', payload)
      toast.success('Habit created')
      loadStats()
    } catch {
      toast.error('Failed to create habit')
    }
  }
  showCreateModal.value = false
}

function handleConvertToHabit() {
  showCreateModal.value = false
}

async function convertTask(task) {
  try {
    await api.delete(`/tasks/${task.id}`)
    todayTasks.value = todayTasks.value.filter(t => t.id !== task.id)
    convertData.value = { title: task.title, description: task.description }
    createInitialMode.value = 'habit'
    showCreateModal.value = true
    toast.info('Task removed. Create a habit instead!')
  } catch {
    toast.error('Failed to remove task')
  }
}

async function completeTask(task) {
  try {
    await api.post(`/tasks/${task.id}/complete`)
    todayTasks.value = todayTasks.value.filter(t => t.id !== task.id)
    toast.success('Task completed')
    loadStats()
    loadGrid()
  } catch {
    toast.error('Failed')
  }
}

async function deleteTask(task) {
  try {
    await api.delete(`/tasks/${task.id}`)
    todayTasks.value = todayTasks.value.filter(t => t.id !== task.id)
    toast.success('Task deleted')
  } catch {
    toast.error('Failed')
  }
}

async function editTask(task) {
  try {
    const payload = {
      title: task.title,
      description: task.description || undefined,
      dueDate: task.dueDate || undefined,
      scheduledTime: task.scheduledTime || undefined,
    }
    if (task.reminderMinutes != null) payload.reminderMinutes = task.reminderMinutes
    await api.put(`/tasks/${task.id}`, payload)
    todayTasks.value = todayTasks.value.map(t => t.id === task.id ? { ...t, title: task.title, description: task.description, dueDate: task.dueDate, scheduledTime: task.scheduledTime, reminderMinutes: task.reminderMinutes } : t)
    toast.success('Task updated')
  } catch {
    toast.error('Failed to update')
  }
}

function openCam(habit) {
  camHabit.value = habit
}

async function logHabit(habit) {
  try {
    const payload = { habitId: habit.id }
    if (habit.scheduledTime) payload.scheduledTime = habit.scheduledTime
    await api.post('/logs', payload)
    todayHabits.value = todayHabits.value.map(h =>
      h.id === habit.id && h.scheduledTime === habit.scheduledTime
        ? { ...h, completedToday: true } : h
    )
    toast.success('Habit completed!')
    loadStats()
    loadGrid()
  } catch (e) {
    if (e.response?.status === 409) toast.info('Already completed today!')
    else toast.error('Failed')
  }
}

async function submitCamProof(dataUrl) {
  if (!camHabit.value) return
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const form = new FormData()
    form.append('photo', blob, 'proof.jpg')
    const { data } = await api.post('/upload', form)
    const payload = { habitId: camHabit.value.id, photo: data.url }
    if (camHabit.value.scheduledTime) payload.scheduledTime = camHabit.value.scheduledTime
    await api.post('/logs', payload)
    todayHabits.value = todayHabits.value.map(h =>
      h.id === camHabit.value.id && h.scheduledTime === camHabit.value.scheduledTime
        ? { ...h, completedToday: true } : h
    )
    toast.success('Photo proof submitted!')
    camHabit.value = null
    loadStats()
    loadGrid()
  } catch {
    toast.error('Failed to upload')
  }
}

async function selectDay(day) {
  try {
    const res = await api.get('/grid/day', { params: { date: day.date } })
    selectedDay.value = {
      ...day, habits: res.data.habits || [], tasks: res.data.tasks || [],
      scheduledHabits: res.data.scheduledHabits || [], isOnVacation: res.data.isOnVacation || false,
    }
  } catch {
    selectedDay.value = day
  }
}

async function endVacation() {
  try {
    await api.post('/vacation/end')
    isOnVacation.value = false
    toast.success('Vacation ended')
    loadStats()
    loadTasks()
  } catch {
    toast.error('Failed to end vacation')
  }
}

onMounted(async () => {
  loading.value = true
  await Promise.all([
    loadStats(),
    loadTasks(),
    loadYearRange(),
    loadGrid(),
  ])
  loading.value = false
})
</script>
