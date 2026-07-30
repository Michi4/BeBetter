<template>
  <div class="page">
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
    <div v-if="showNewHabitForm" class="card space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">New Habit</h3>
        <button
          @click="showNewHabitForm = false"
          class="touch-target flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X :size="18" />
        </button>
      </div>
      <HabitForm v-model="newHabit" />
      <div class="flex justify-end gap-2 pt-1">
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
        @finish="logHabit"
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
import HabitForm from '../components/HabitForm.vue'

const toast = useToast()

const quickTaskInput = ref('')
const showNewHabitForm = ref(false)
const showAllTasks = ref(false)
const selectedDay = ref(null)
const camHabit = ref(null)
const isOnVacation = ref(false)

const stats = ref({})
const todayTasks = ref([])
const todayHabits = ref([])
const gridDays = ref([])

const selectedYear = ref(new Date().getFullYear())
const yearRange = ref({ firstYear: new Date().getFullYear(), lastYear: new Date().getFullYear() })

const newHabit = reactive({
  title: '',
  description: '',
  emoji: '🎯',
  schedule: [1, 2, 3, 4, 5, 6, 7],
  verificationType: 'honor',
  wagerDays: 0,
  wagerAmount: 0,
  makePublic: false,
  createPreset: false,
  presetCategory: 'Other',
})

const visibleTasks = computed(() => {
  if (showAllTasks.value || todayTasks.value.length <= 5) return todayTasks.value
  return todayTasks.value.slice(0, 5)
})

async function loadStats() {
  try {
    const [statsRes, overviewRes, habitsRes] = await Promise.all([
      api.get('/logs/with-scheduled'),
      api.get('/stats/overview'),
      api.get('/habits'),
    ])
    stats.value = overviewRes.data
    isOnVacation.value = overviewRes.data.isOnVacation || false

    const today = new Date().toISOString().split('T')[0]
    const dayData = statsRes.data
    todayHabits.value = (dayData.scheduled || []).map(h => ({
      ...h,
      completedToday: h.logged || false,
    }))
  } catch {
    toast.error('Failed to load data')
  }
}

async function loadTasks() {
  try {
    const res = await api.get('/tasks')
    todayTasks.value = (res.data.tasks || []).filter(t => !t.isCompletedToday)
  } catch {
    // silent
  }
}

async function loadYearRange() {
  try {
    const res = await api.get('/grid/years')
    const years = res.data.years || [new Date().getFullYear()]
    yearRange.value = {
      firstYear: Math.min(...years),
      lastYear: Math.max(...years),
    }
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
        days.push({ date: ds, count: (data.habits || 0) + (data.tasks || 0), items: data.items || [], isVacation })
      } else {
        days.push({ date: ds, count: 0, items: [], isVacation })
      }
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
  if (!newHabit.title.trim()) return
  try {
    const payload = {
      title: newHabit.title,
      description: newHabit.description || undefined,
      emoji: newHabit.emoji,
      frequencyType: 'daily',
      daysPerWeek: newHabit.schedule,
      schedule: newHabit.schedule,
      verificationType: newHabit.verificationType,
      makePublic: newHabit.makePublic,
    }
    if (newHabit.wagerDays > 0 && newHabit.wagerAmount > 0) {
      payload.wagerDays = newHabit.wagerDays
      payload.wagerAmount = newHabit.wagerAmount
    }
    const res = await api.post('/habits', payload)

    if (newHabit.createPreset && newHabit.title.trim()) {
      try {
        await api.post('/presets', {
          title: newHabit.title,
          description: newHabit.description || '',
          category: newHabit.presetCategory,
          emoji: newHabit.emoji,
          frequencyType: 'daily',
          daysPerWeek: JSON.stringify(newHabit.schedule),
          verificationType: newHabit.verificationType,
        })
        toast.success('Habit & preset created')
      } catch {
        toast.success('Habit created (preset failed)')
      }
    } else {
      toast.success('Habit created')
    }

    showNewHabitForm.value = false
    Object.assign(newHabit, {
      title: '', description: '', emoji: '🎯',
      schedule: [1, 2, 3, 4, 5, 6, 7],
      verificationType: 'honor', wagerDays: 0, wagerAmount: 0,
      makePublic: false, createPreset: false, presetCategory: 'Other',
    })
    loadStats()
    loadGrid()
  } catch {
    toast.error('Failed to create habit')
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

function editTask(task) {
  todayTasks.value = todayTasks.value.map(t => t.id === task.id ? task : t)
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

async function submitCamProof(blob) {
  if (!camHabit.value) return
  try {
    const form = new FormData()
    form.append('photo', blob, 'proof.jpg')
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
      ...day,
      habits: res.data.habits || [],
      tasks: res.data.tasks || [],
      isOnVacation: res.data.isOnVacation || false,
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
