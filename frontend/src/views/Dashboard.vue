<template>
  <div class="page">
    <!-- Stats Row -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="card text-center py-3">
        <div class="text-xl font-bold text-emerald-400">{{ stats.streak || 0 }}</div>
        <div class="text-[10px] text-gray-500 mt-0.5">Streak</div>
      </div>
      <div class="card text-center py-3">
        <div class="text-xl font-bold text-emerald-400">{{ stats.consistency || 0 }}%</div>
        <div class="text-[10px] text-gray-500 mt-0.5">Consistency</div>
      </div>
      <div class="card text-center py-3">
        <div class="text-xl font-bold text-emerald-400">{{ stats.totalCompletions || 0 }}</div>
        <div class="text-[10px] text-gray-500 mt-0.5">Total Done</div>
      </div>
      <div class="card text-center py-3">
        <div class="text-xl font-bold text-emerald-400">{{ stats.today?.done || 0 }}/{{ stats.today?.total || 0 }}</div>
        <div class="text-[10px] text-gray-500 mt-0.5">Today</div>
      </div>
    </div>

    <!-- Contribution Grid -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <h2 class="section-title">Year in Review</h2>
        <div v-if="yearRange.lastYear > yearRange.firstYear" class="flex items-center gap-1">
          <button
            @click="selectedYear--"
            :disabled="selectedYear <= yearRange.firstYear"
            class="touch-target p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft :size="16" />
          </button>
          <span class="text-xs font-medium text-gray-400 min-w-[36px] text-center">{{ selectedYear }}</span>
          <button
            @click="selectedYear++"
            :disabled="selectedYear >= yearRange.lastYear"
            class="touch-target p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight :size="16" />
          </button>
        </div>
        <span v-else class="text-xs font-medium text-gray-400">{{ selectedYear }}</span>
      </div>
      <ContributionGrid :grid="gridDays" :year="selectedYear" @select="selectDay" />
    </div>

    <!-- Quick Add -->
    <form @submit.prevent="handleInput" class="flex items-center gap-2">
      <button
        type="submit"
        class="touch-target shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-gray-800 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
        title="New habit or task"
      >
        <Plus :size="20" />
      </button>
      <input
        v-model="quickTaskInput"
        type="text"
        placeholder="Add a task..."
        class="input flex-1 text-sm"
      />
    </form>

    <!-- New Habit Form -->
    <div v-if="showNewHabitForm" class="card space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">New Habit</h3>
        <button
          @click="showNewHabitForm = false"
          class="touch-target flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X :size="18" />
        </button>
      </div>
      <input v-model="newHabit.title" type="text" placeholder="Habit title" class="input" />
      <RecurrenceBuilder v-model="newHabit.recurrence" />
      <div class="flex justify-end gap-2">
        <button @click="showNewHabitForm = false" class="btn-secondary btn-sm">Cancel</button>
        <button @click="createHabit" class="btn-sm" :disabled="!newHabit.title.trim()">Create</button>
      </div>
    </div>

    <!-- DayDetail Modal -->
    <DayDetail :show="!!selectedDay" :day="selectedDay" @close="selectedDay = null" />

    <!-- Today's Tasks -->
    <div class="space-y-2">
      <h3 class="section-title">Today's Tasks</h3>
      <div v-if="visibleTasks.length === 0" class="text-sm text-gray-500 py-2">No tasks for today</div>
      <TaskCard
        v-for="t in visibleTasks"
        :key="t.id"
        :task="t"
        @complete="completeTask"
        @delete="deleteTask"
        @edit="editTask"
      />
      <button
        v-if="todayTasks.length > 5 && !showAllTasks"
        @click="showAllTasks = true"
        class="touch-target text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
      >
        <ChevronDown :size="14" />
        Show more ({{ todayTasks.length - 5 }} remaining)
      </button>
      <button
        v-if="showAllTasks && todayTasks.length > 5"
        @click="showAllTasks = false"
        class="touch-target text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
      >
        <ChevronUp :size="14" />
        Show less
      </button>
    </div>

    <!-- Today's Habits -->
    <div class="space-y-2">
      <h3 class="section-title">Today's Habits</h3>
      <div v-if="todayHabits.length === 0" class="text-sm text-gray-500 py-2">No habits for today</div>
      <HabitCard
        v-for="h in todayHabits"
        :key="h.id"
        :habit="h"
        @log="logHabit"
        @cam="openCam"
      />
    </div>

    <!-- BeBetterCam -->
    <BeBetterCam :show="!!camHabit" @close="camHabit = null" @capture="submitCamProof" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import ContributionGrid from '../components/ContributionGrid.vue'
import DayDetail from '../components/DayDetail.vue'
import HabitCard from '../components/HabitCard.vue'
import TaskCard from '../components/TaskCard.vue'
import BeBetterCam from '../components/BeBetterCam.vue'
import RecurrenceBuilder from '../components/RecurrenceBuilder.vue'

const toast = useToast()

const quickTaskInput = ref('')
const showNewHabitForm = ref(false)
const showAllTasks = ref(false)
const selectedDay = ref(null)
const camHabit = ref(null)

const stats = ref({})
const todayTasks = ref([])
const todayHabits = ref([])
const gridDays = ref([])

const selectedYear = ref(new Date().getFullYear())
const yearRange = ref({ firstYear: new Date().getFullYear(), lastYear: new Date().getFullYear() })

const newHabit = reactive({ title: '', recurrence: { type: 'daily' } })

const visibleTasks = computed(() => {
  if (showAllTasks.value || todayTasks.value.length <= 5) return todayTasks.value
  return todayTasks.value.slice(0, 5)
})

async function loadStats() {
  try {
    const [statsRes, tasksRes, habitsRes] = await Promise.all([
      api.get('/stats'),
      api.get('/tasks/today'),
      api.get('/habits'),
    ])
    stats.value = statsRes.data
    todayTasks.value = (tasksRes.data.tasks || []).filter(t => !t.completed)
    todayHabits.value = habitsRes.data.habits || []
  } catch {
    toast.error('Failed to load data')
  }
}

async function loadYearRange() {
  try {
    const res = await api.get('/grid/years')
    yearRange.value = res.data
    if (selectedYear.value < res.data.firstYear) selectedYear.value = res.data.firstYear
    if (selectedYear.value > res.data.lastYear) selectedYear.value = res.data.lastYear
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
    const gridRaw = gridRes.data.grid || []
    const map = {}
    gridRaw.forEach(d => { map[d.date] = d })
    const days = []
    const cur = new Date(from + 'T12:00:00Z')
    const end = new Date(to + 'T12:00:00Z')
    while (cur <= end) {
      const ds = cur.toISOString().slice(0, 10)
      const data = map[ds]
      days.push(data || { date: ds, scheduled: 0, completed: 0, ratio: null, habits: [], tasks: [] })
      cur.setDate(cur.getDate() + 1)
    }
    gridDays.value = days
  } catch {
    toast.error('Failed to load grid')
  }
}

watch(selectedYear, loadGrid)

function handleInput() {
  if (quickTaskInput.value.trim()) {
    createQuickTask()
  } else {
    showNewHabitForm.value = !showNewHabitForm.value
  }
}

async function createQuickTask() {
  if (!quickTaskInput.value.trim()) return
  try {
    const res = await api.post('/tasks', { title: quickTaskInput.value.trim(), isScheduled: false })
    todayTasks.value.unshift(res.data.task || res.data)
    quickTaskInput.value = ''
    toast.success('Task created')
  } catch {
    toast.error('Failed to create task')
  }
}

async function createHabit() {
  try {
    await api.post('/habits', {
      title: newHabit.title,
      recurrence: newHabit.recurrence
    })
    showNewHabitForm.value = false
    newHabit.title = ''
    newHabit.recurrence = { type: 'daily' }
    toast.success('Habit created')
    loadStats()
    loadGrid()
  } catch {
    toast.error('Failed to create habit')
  }
}

async function completeTask(task) {
  try {
    await api.post(`/tasks/${task.id}/complete`)
    task.completed = true
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

function editTask(task) {
  todayTasks.value = todayTasks.value.map(t => t.id === task.id ? task : t)
}

function openCam(habit) {
  camHabit.value = habit
}

async function logHabit(habit) {
  try {
    await api.post('/logs', { habitId: habit.id, status: 'completed' })
    toast.success('Habit completed!')
    loadStats()
    loadGrid()
  } catch (e) {
    if (e.response?.status === 409) toast.info('Already completed today!')
    else toast.error('Failed')
  }
}

async function submitCamProof(blob) {
  if (!camHabit.value) return
  try {
    const form = new FormData()
    form.append('file', blob, 'proof.jpg')
    const { data } = await api.post('/upload', form)
    await api.post('/logs', { habitId: camHabit.value.id, status: 'completed', proofUrl: data.url })
    toast.success('Photo proof submitted!')
    camHabit.value = null
    loadStats()
    loadGrid()
  } catch {
    toast.error('Failed to upload')
  }
}

async function selectDay(day) {
  if (day.scheduled === 0 && (!day.tasks || day.tasks.length === 0)) {
    try {
      const res = await api.get('/logs', { params: { date: day.date, withScheduled: true } })
      const d = res.data
      selectedDay.value = {
        ...day,
        habits: d.scheduled || d.habits || [],
        tasks: d.tasks || [],
        completed: (d.logs || []).length,
        total: (d.scheduled || []).length + (d.tasks || []).length
      }
    } catch {
      selectedDay.value = day
    }
  } else {
    selectedDay.value = day
  }
}

onMounted(() => {
  loadStats()
  loadYearRange()
  loadGrid()
})
</script>
