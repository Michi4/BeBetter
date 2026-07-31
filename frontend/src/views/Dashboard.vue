<template>
  <div class="page pb-32 md:pb-24">
    <!-- Vacation Banner -->
    <div v-if="isOnVacation" class="card bg-amber-500/10 border border-amber-500/20">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">🏖️</span>
          <div>
            <p class="text-sm font-medium text-amber-300">You're on vacation</p>
            <p class="text-xs text-amber-400/70">No habits scheduled. Enjoy your break!</p>
          </div>
        </div>
        <button @click="endVacation" class="text-xs text-amber-400 hover:text-amber-300 transition-colors">End early</button>
      </div>
    </div>

    <!-- Desktop quick input -->
    <div class="hidden md:block card">
      <div class="flex gap-2">
        <button @click="showCreateModal = true" class="btn-secondary px-3 shrink-0" title="Create habit or detailed task">
          <Target :size="18" />
        </button>
        <input v-model="quickTaskTitle" @keydown.enter="createQuickTask"
          class="input flex-1" placeholder="Add a quick task..." />
        <button @click="createQuickTask" class="btn px-4" :disabled="!quickTaskTitle.trim()">
          Add
        </button>
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

    <!-- Today's Habits -->
    <div class="space-y-2">
      <h3 class="section-title">Today's Habits</h3>
      <div v-if="todayHabits.length === 0" class="text-sm text-gray-500 py-2">No habits for today</div>
      <HabitCard v-for="h in todayHabits" :key="h.id" :habit="h"
        @finish="logHabit" @cam="openCam" />
    </div>

    <!-- DayDetail Modal -->
    <DayDetail :show="!!selectedDay" :day="selectedDay" @close="selectedDay = null" />
    <BeBetterCam :show="!!camHabit" @close="camHabit = null" @capture="submitCamProof" />

    <!-- Mobile floating add button (above bottom nav) -->
    <div class="fixed bottom-20 left-0 right-0 z-40 flex justify-center md:hidden pointer-events-none">
      <button @click="showCreateModal = true"
        class="pointer-events-auto touch-target shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 transition-colors active:scale-95">
        <Plus :size="24" />
      </button>
    </div>

    <!-- Create Modal -->
    <CreateModal :show="showCreateModal" initial-mode="task" :convert-data="convertData"
      @close="showCreateModal = false; convertData = null" @created="handleCreated" @convertToHabit="handleConvertToHabit" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Target } from 'lucide-vue-next'
import ContributionGrid from '../components/ContributionGrid.vue'
import DayDetail from '../components/DayDetail.vue'
import HabitCard from '../components/HabitCard.vue'
import TaskCard from '../components/TaskCard.vue'
import BeBetterCam from '../components/BeBetterCam.vue'
import CreateModal from '../components/CreateModal.vue'

const toast = useToast()

const showAllTasks = ref(false)
const selectedDay = ref(null)
const camHabit = ref(null)
const isOnVacation = ref(false)
const showCreateModal = ref(false)
const quickTaskTitle = ref('')
const convertData = ref(null)

const stats = ref({})
const todayTasks = ref([])
const todayHabits = ref([])
const gridDays = ref([])

const selectedYear = ref(new Date().getFullYear())
const yearRange = ref({ firstYear: new Date().getFullYear(), lastYear: new Date().getFullYear() })

const visibleTasks = computed(() => {
  if (showAllTasks.value || todayTasks.value.length <= 5) return todayTasks.value
  return todayTasks.value.slice(0, 5)
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
    todayHabits.value = (habitsRes.data.habits || []).map(h => ({
      ...h, completedToday: false, hasBreak: !!h.breaks?.find(b => !b.endDate),
    }))

    const todayLogsRes = await api.get('/logs/today').catch(() => ({ data: { logs: [] } }))
    const loggedIds = new Set((todayLogsRes.data.logs || []).map(l => l.habitId))
    todayHabits.value = todayHabits.value.map(h => ({
      ...h, completedToday: loggedIds.has(h.id),
    }))
  } catch {
    toast.error('Failed to load data')
  }
}

async function loadTasks() {
  try {
    const res = await api.get('/tasks')
    todayTasks.value = (res.data.tasks || []).filter(t => !t.isCompletedToday)
  } catch {}
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
    const vacationDays = gridRes.data.vacationDays || []
    const days = []
    const cur = new Date(from + 'T12:00:00Z')
    const end = new Date(to + 'T12:00:00Z')
    while (cur <= end) {
      const ds = cur.toISOString().slice(0, 10)
      const data = gridRaw[ds]
      const isVacation = vacationDays.includes(ds)
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
  if (type === 'task') {
    try {
      const res = await api.post('/tasks', { title: data.title, description: data.description, emoji: data.emoji, dueDate: data.dueDate || undefined })
      todayTasks.value.unshift(res.data.task || res.data)
      toast.success('Task created')
    } catch {
      toast.error('Failed to create task')
    }
  } else {
    try {
      const payload = {
        title: data.title, description: data.description || undefined, emoji: data.emoji,
        frequencyType: 'daily', schedule: data.schedule, verificationType: data.verificationType,
        makePublic: data.makePublic,
      }
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
    showCreateModal.value = true
    toast.info('Task removed. Create a habit instead!')
  } catch {}
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
    await api.put(`/tasks/${task.id}`, { title: task.title, description: task.description || undefined, dueDate: task.dueDate || undefined })
    todayTasks.value = todayTasks.value.map(t => t.id === task.id ? { ...t, title: task.title, description: task.description, dueDate: task.dueDate } : t)
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
    await api.post('/logs', { habitId: habit.id })
    todayHabits.value = todayHabits.value.map(h =>
      h.id === habit.id ? { ...h, completedToday: true } : h
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
    const form = new FormData()
    form.append('photo', dataUrl, 'proof.jpg')
    const { data } = await api.post('/upload', form)
    await api.post('/logs', { habitId: camHabit.value.id, photo: data.url })
    todayHabits.value = todayHabits.value.map(h =>
      h.id === camHabit.value.id ? { ...h, completedToday: true } : h
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
      ...day, habits: res.data.habits || [], tasks: res.data.tasks || [], isOnVacation: res.data.isOnVacation || false,
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

onMounted(() => {
  loadStats()
  loadTasks()
  loadYearRange()
  loadGrid()
})
</script>
