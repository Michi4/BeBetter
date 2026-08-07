<template>
  <div class="page pb-32 md:pb-24">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 :size="24" class="animate-spin text-emerald-400" />
    </div>

    <template v-else>
    <!-- Inline Notifications -->
    <NotificationAlerts />

    <!-- Desktop quick input -->
    <div class="hidden md:block card">
      <div class="flex gap-2">
        <button @click="fabMode = 'habit'; showCreateModal = true" class="btn-secondary px-3 shrink-0" title="Create habit or detailed task">
          <Target :size="18" />
        </button>
        <input v-model="quickTaskTitle" @keydown.enter="createQuickTask"
          class="input flex-1" placeholder="Add a quick task..." />
        <button @click="createQuickTask" class="btn px-4" :disabled="!quickTaskTitle.trim()">
          Add
        </button>
      </div>
    </div>

    <!-- Tasks Section -->
    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <h2 class="section-title">Tasks</h2>
        <span v-if="incompleteTasks.length" class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">{{ incompleteTasks.length }}</span>
      </div>
      <div v-if="incompleteTasks.length === 0" class="text-sm text-gray-500 py-2">No incomplete tasks</div>
      <div v-for="task in incompleteTasks" :key="task.id" class="space-y-1" :class="{ 'animate-celebrate': completingTaskId === task.id }">
        <TaskCard :task="task" @complete="completeTask" @delete="deleteTask" @edit="updateTaskFromCard" @convert="convertTask" />
      </div>
      <div v-if="completedTasks.length > 0" class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <button @click="showCompletedTasks = !showCompletedTasks" class="min-h-[44px] w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-400 hover:bg-gray-800/50 transition-colors">
          <div class="flex items-center gap-2">
            <span>Completed Tasks</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{{ completedTasks.length }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click.stop="confirmDeleteAllTasks" class="text-[10px] px-2 py-1 rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors">Clear all</button>
            <ChevronDown :size="16" class="transition-transform duration-200" :class="showCompletedTasks ? 'rotate-180' : ''" />
          </div>
        </button>
        <div v-if="showCompletedTasks" class="border-t border-gray-800">
          <div v-for="task in visibleCompletedTasks" :key="task.id" class="completed-row flex items-center gap-3 px-4 py-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 shrink-0">
              <Check :size="16" />
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-sm truncate text-gray-400 line-through">{{ task.title }}</h4>
              <p v-if="task.completedAt" class="text-[10px] text-gray-500">Completed {{ formatDate(task.completedAt) }}</p>
            </div>
            <button @click="undoCompletedTask(task)" class="delete-btn shrink-0 p-1.5 rounded text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Mark as incomplete">
              <Undo2 :size="13" />
            </button>
            <button @click="deleteCompletedTask(task)" class="delete-btn shrink-0 p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
              <Trash2 :size="13" />
            </button>
          </div>
          <button v-if="completedTasks.length > visibleCompletedTasks.length" @click="loadMoreCompletedTasks" class="min-h-[44px] w-full flex items-center justify-center gap-1 px-4 py-3 text-xs text-emerald-400 hover:bg-gray-800/50 transition-colors">
            <ChevronDown :size="12" /> Load more ({{ completedTasks.length - visibleCompletedTasks.length }} remaining)
          </button>
        </div>
      </div>
    </section>

    <!-- Habits Section -->
    <section class="space-y-3">
      <h2 class="section-title">Habits</h2>
      <div v-if="activeHabits.length === 0" class="text-sm text-gray-500">No active habits</div>

      <!-- Habits with time slots -->
      <template v-if="timedHabits.length">
        <div v-for="h in timedHabits" :key="h.id + '-' + (h.scheduledTime || '')" class="rounded-xl border border-gray-800 bg-gray-900/50" :class="{ 'animate-celebrate': completingHabitId === h.id }">
          <HabitCard :habit="h" :scheduled-time="h.scheduledTime" @finish="completeHabit" @cam="openCamHabit" @undo="undoHabit" />
        </div>
      </template>

      <!-- Unscheduled habits -->
      <div v-for="h in unscheduledHabits" :key="h.id" class="rounded-xl border border-gray-800 bg-gray-900/50" :class="{ 'animate-celebrate': completingHabitId === h.id }">
        <HabitCard :habit="h" @finish="completeHabit" @cam="openCamHabit" @undo="undoHabit" />
      </div>

      <div v-if="completedHabits.length > 0" class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <button @click="showCompletedHabits = !showCompletedHabits" class="min-h-[44px] w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-400 hover:bg-gray-800/50 transition-colors">
          <div class="flex items-center gap-2">
            <span>Completed Habits</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{{ completedHabits.length }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click.stop="confirmDeleteAllHabits" class="text-[10px] px-2 py-1 rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors">Clear all</button>
            <ChevronDown :size="16" class="transition-transform duration-200" :class="showCompletedHabits ? 'rotate-180' : ''" />
          </div>
        </button>
        <div v-if="showCompletedHabits" class="border-t border-gray-800">
          <div v-for="habit in visibleCompletedHabits" :key="habit.id" class="completed-row flex items-center gap-3 px-4 py-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 shrink-0">
              <Check :size="16" />
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-sm truncate text-gray-400 line-through">{{ habit.title }}</h4>
              <p v-if="habit.finishedAt" class="text-[10px] text-gray-500">Finished {{ formatDate(habit.finishedAt) }}</p>
            </div>
            <button @click="undoCompletedHabit(habit)" class="delete-btn shrink-0 p-1.5 rounded text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Mark as not done">
              <Undo2 :size="13" />
            </button>
            <button @click="deleteCompletedHabit(habit)" class="delete-btn shrink-0 p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete habit and all its data">
              <Trash2 :size="13" />
            </button>
          </div>
          <button v-if="completedHabits.length > visibleCompletedHabits.length" @click="loadMoreCompletedHabits" class="min-h-[44px] w-full flex items-center justify-center gap-1 px-4 py-3 text-xs text-emerald-400 hover:bg-gray-800/50 transition-colors">
            <ChevronDown :size="12" /> Load more ({{ completedHabits.length - visibleCompletedHabits.length }} remaining)
          </button>
        </div>
      </div>
    </section>

    <!-- History Section -->
    <section class="space-y-3">
      <h2 class="section-title">History</h2>
      <div class="flex flex-wrap items-center gap-2">
        <button @click="prevDay" class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-800 transition-colors">
          <ChevronLeft :size="18" />
        </button>
        <input v-model="selectedDate" type="date" class="min-h-[44px] flex-1 min-w-0 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        <button @click="nextDay" class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-800 transition-colors">
          <ChevronRight :size="18" />
        </button>
        <button @click="selectedDate = todayStr()" class="min-h-[44px] rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors">
          Today
        </button>
      </div>
      <div v-if="scheduledForDay.length" class="space-y-2">
        <h3 class="text-xs font-medium text-gray-500">Scheduled</h3>
        <div v-for="(h, hi) in scheduledForDay" :key="hi" class="card flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            :class="h.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'">
            <CheckCircle2 v-if="h.completed" :size="16" class="animate-done" />
            <Circle v-else :size="16" />
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-sm truncate" :class="h.completed ? 'text-gray-300' : 'text-gray-500'">{{ h.emoji || '' }} {{ h.title }}</span>
          </div>
          <span v-if="h.scheduledTime" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0">{{ formatTime(h.scheduledTime) }}</span>
          <span v-if="!h.completed && isFutureDay" class="text-[10px] text-gray-600 shrink-0">upcoming</span>
          <span v-else-if="!h.completed" class="text-[10px] text-gray-600 shrink-0">missed</span>
        </div>
      </div>
      <div v-if="historyTasks.length" class="space-y-2">
        <h3 class="text-xs font-medium text-gray-500">Tasks</h3>
        <div v-for="t in historyTasks" :key="t.id" class="card flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-400">
            <Check :size="16" />
          </div>
          <span class="text-sm text-gray-300 truncate">{{ t.title }}</span>
        </div>
      </div>
      <div v-if="!scheduledForDay.length && !historyTasks.length" class="text-sm text-gray-500 py-2">No data for this day</div>
    </section>

    <!-- Mobile floating add button -->
    <div class="fixed bottom-20 left-0 right-0 z-40 flex justify-center md:hidden pointer-events-none">
      <button @click="fabMode = 'task'; showCreateModal = true"
        class="pointer-events-auto touch-target shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 transition-colors active:scale-95">
        <Plus :size="24" />
      </button>
    </div>

    <!-- Clear-all confirmation -->
    <div v-if="clearAllModal" class="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="clearAllModal = null">
      <div class="card w-full max-w-sm mx-0 sm:mx-4 space-y-4 rounded-b-2xl sm:rounded-2xl safe-bottom" style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 20px)" @click.stop>
        <div class="w-11 h-11 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center">
          <AlertTriangle :size="22" />
        </div>
        <div>
          <h3 class="text-base font-bold">{{ clearAllModal.title }}</h3>
          <p class="text-sm text-gray-400 mt-1">{{ clearAllModal.body }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="clearAllModal = null" class="flex-1 btn-secondary">Cancel</button>
          <button @click="clearAllModal.onConfirm" class="flex-1 btn bg-red-600 hover:bg-red-500 text-white">
            <Trash2 :size="14" /> Delete
          </button>
        </div>
      </div>
    </div>

    <CreateModal :show="showCreateModal" :initial-mode="fabMode" :convert-data="convertData"
      @close="showCreateModal = false; convertData = null" @created="handleCreated" @convertToHabit="handleConvertToHabit" />
    <BeBetterCam :show="!!camHabit" @close="camHabit = null" @capture="submitHabitProof" />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, Circle, Check, Trash2, Target, Loader2, Undo2, AlertTriangle } from 'lucide-vue-next'
import HabitCard from '../components/HabitCard.vue'
import TaskCard from '../components/TaskCard.vue'
import BeBetterCam from '../components/BeBetterCam.vue'
import CreateModal from '../components/CreateModal.vue'
import NotificationAlerts from '../components/NotificationAlerts.vue'
import { formatTime } from '../utils/timeFormat'
import { useAuthStore } from '../stores/auth'
import { openDemoPrompt } from '../utils/demoPrompt'

const toast = useToast()
const auth = useAuthStore()

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const scheduledForDay = ref([])
const historyTasks = ref([])
const showCreateModal = ref(false)
const fabMode = ref('task')
const quickTaskTitle = ref('')
const convertData = ref(null)

const completingTaskId = ref(null)
const completingHabitId = ref(null)
const camHabit = ref(null)

const clearAllModal = ref(null)

const todayStr = () => new Date().toISOString().slice(0, 10)

const isFutureDay = computed(() => selectedDate.value > todayStr())

function prevDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = d.toISOString().slice(0, 10)
}

function nextDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = d.toISOString().slice(0, 10)
}

async function loadHistory() {
  try {
    const [dayRes, tasksRes] = await Promise.all([
      api.get('/logs/with-scheduled', { params: { date: selectedDate.value } }).catch(() => ({ data: { scheduled: [] } })),
      api.get('/tasks/completed', { params: { date: selectedDate.value } }).catch(() => ({ data: { logs: [] } })),
    ])

    const scheduledHabits = dayRes.data.scheduled || []
    const loggedIds = new Set()
    const loggedSlots = new Map()

    try {
      const logsForDay = await api.get('/grid/day', { params: { date: selectedDate.value } })
      const completedHabits = logsForDay.data.habits || []
      completedHabits.forEach(h => {
        loggedIds.add(h.habitId || h.id)
        if (h.scheduledTime) {
          const key = `${h.habitId || h.id}-${h.scheduledTime}`
          loggedSlots.set(key, true)
        }
      })
    } catch {}

    scheduledForDay.value = scheduledHabits.map(h => ({
      ...h,
      completed: loggedIds.has(h.id) || (h.scheduledTime && loggedSlots.has(`${h.id}-${h.scheduledTime}`)),
    }))

    historyTasks.value = (tasksRes.data.logs || []).map(l => ({
      ...l,
      title: l.task?.title || 'Task',
    }))
  } catch {
    scheduledForDay.value = []
    historyTasks.value = []
  }
}

watch(selectedDate, loadHistory)

const incompleteTasks = ref([])
const completedTasks = ref([])
const activeHabits = ref([])
const completedHabits = ref([])

const showCompletedTasks = ref(false)
const showCompletedHabits = ref(false)

const completedTasksPage = ref(0)
const completedHabitsPage = ref(0)
const PAGE_SIZE = 10
const loading = ref(true)

const visibleCompletedTasks = computed(() => completedTasks.value.slice(0, (completedTasksPage.value + 1) * PAGE_SIZE))
const visibleCompletedHabits = computed(() => completedHabits.value.slice(0, (completedHabitsPage.value + 1) * PAGE_SIZE))

const timedHabits = computed(() => activeHabits.value.filter(h => h.scheduledTime))
const unscheduledHabits = computed(() => activeHabits.value.filter(h => !h.scheduledTime))

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function updateTaskFromCard(task) {
  try {
    await api.put(`/tasks/${task.id}`, { title: task.title, description: task.description || undefined, dueDate: task.dueDate || undefined })
    incompleteTasks.value = incompleteTasks.value.map(t => t.id === task.id ? { ...t, title: task.title, description: task.description, dueDate: task.dueDate } : t)
    toast.success('Task updated')
  } catch {
    toast.error('Failed to update task')
  }
}

async function handleCreated(type, data) {
  if (type !== 'task' && auth.isDemo && data.makePublic) {
    showCreateModal.value = false
    convertData.value = null
    openDemoPrompt()
    return
  }
  if (type === 'task') {
    try {
      const res = await api.post('/tasks', { title: data.title, description: data.description, emoji: data.emoji, dueDate: data.dueDate || undefined })
      incompleteTasks.value.unshift(res.data.task || res.data)
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
      loadAll()
    } catch {
      toast.error('Failed to create habit')
    }
  }
  showCreateModal.value = false
  convertData.value = null
}

function handleConvertToHabit() {
  showCreateModal.value = false
  convertData.value = null
}

async function convertTask(task) {
  try {
    await api.delete(`/tasks/${task.id}`)
    incompleteTasks.value = incompleteTasks.value.filter(t => t.id !== task.id)
    convertData.value = { title: task.title, description: task.description }
    showCreateModal.value = true
    toast.info('Task removed. Create a habit instead!')
  } catch {
    toast.error('Failed to remove task')
  }
}

async function createQuickTask() {
  if (!quickTaskTitle.value.trim()) return
  try {
    const res = await api.post('/tasks', { title: quickTaskTitle.value.trim() })
    incompleteTasks.value.unshift(res.data.task || res.data)
    quickTaskTitle.value = ''
    toast.success('Task created')
  } catch {
    toast.error('Failed to create task')
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [tasksRes, habitsRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/habits'),
    ])
    const allTasks = tasksRes.data.tasks || []
    incompleteTasks.value = allTasks.filter(t => !t.isCompletedToday)
    completedTasks.value = allTasks.filter(t => t.isCompletedToday)

    const allHabits = habitsRes.data.habits || []
    const todayLogsRes = await api.get('/logs/today').catch(() => ({ data: { logs: [] } }))
    const logs = todayLogsRes.data.logs || []

    const expanded = []
    for (const h of allHabits.filter(h => h.active !== false)) {
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
    activeHabits.value = expanded
    completedHabits.value = allHabits.filter(h => h.active === false)
  } catch {
    toast.error('Failed to load data')
  } finally {
    loading.value = false
  }
}

async function completeTask(task) {
  try {
    await api.post(`/tasks/${task.id}/complete`)
    completingTaskId.value = task.id
    toast.success(`"${task.title}" done!`)
    setTimeout(() => {
      completingTaskId.value = null
      incompleteTasks.value = incompleteTasks.value.filter(t => t.id !== task.id)
      completedTasks.value.unshift({ ...task, isCompletedToday: true, completedAt: new Date().toISOString() })
      loadHistory()
    }, 600)
  } catch {
    toast.error('Failed')
  }
}

async function deleteTask(task) {
  try {
    await api.delete(`/tasks/${task.id}`)
    incompleteTasks.value = incompleteTasks.value.filter(t => t.id !== task.id)
    toast.success('Task deleted')
  } catch {
    toast.error('Failed')
  }
}

async function undoCompletedTask(task) {
  try {
    await api.delete(`/tasks/${task.id}/uncomplete`)
    completedTasks.value = completedTasks.value.filter(t => t.id !== task.id)
    incompleteTasks.value.unshift({ ...task, isCompletedToday: false, completedAt: null })
    loadHistory()
    toast.info(`"${task.title}" moved back to tasks`)
  } catch {
    toast.error('Failed')
  }
}

async function deleteCompletedTask(task) {
  try {
    await api.delete(`/tasks/${task.id}`)
    completedTasks.value = completedTasks.value.filter(t => t.id !== task.id)
    loadHistory()
    toast.success('Task deleted')
  } catch {
    toast.error('Failed')
  }
}

async function confirmDeleteAllTasks() {
  clearAllModal.value = {
    title: `Delete ${completedTasks.value.length} completed tasks?`,
    body: 'This permanently removes the tasks and their completion history from the grid, streaks and stats. This cannot be undone.',
    onConfirm: async () => {
      clearAllModal.value = null
      try {
        await Promise.all(completedTasks.value.map(t => api.delete(`/tasks/${t.id}`)))
        completedTasks.value = []
        showCompletedTasks.value = false
        toast.success('All completed tasks deleted')
      } catch {
        toast.error('Failed to delete some tasks')
      }
    },
  }
}

function openCamHabit(habit) { camHabit.value = habit }

async function completeHabit(habit) {
  try {
    const payload = { habitId: habit.id }
    if (habit.scheduledTime) payload.scheduledTime = habit.scheduledTime
    await api.post('/logs', payload)
    completingHabitId.value = habit.id
    activeHabits.value = activeHabits.value.map(h =>
      h.id === habit.id && h.scheduledTime === habit.scheduledTime ? { ...h, completedToday: true } : h
    )
    toast.success(`"${habit.title}" completed!`)
    setTimeout(() => { completingHabitId.value = null }, 600)
  } catch (e) {
    if (e.response?.status === 409) toast.info('Already completed today!')
    else toast.error('Failed')
  }
}

async function undoHabit(habit, scheduledTime) {
  try {
    await api.delete('/logs/habit/' + habit.id + '/today', { params: { scheduledTime: scheduledTime || undefined } })
    activeHabits.value = activeHabits.value.map(h =>
      h.id === habit.id && (h.scheduledTime || null) === (scheduledTime || null)
        ? { ...h, completedToday: false } : h
    )
    loadHistory()
    toast.info(`"${habit.title}" marked as not done`)
  } catch {
    toast.error('Failed')
  }
}

async function undoCompletedHabit(habit) {
  try {
    await api.delete('/logs/habit/' + habit.id + '/today')
    completedHabits.value = completedHabits.value.filter(h => h.id !== habit.id)
    const fresh = await api.get('/habits')
    activeHabits.value = fresh.data.habits || []
    toast.info(`"${habit.title}" marked as not done`)
  } catch {
    toast.error('Failed')
  }
}

async function submitHabitProof(dataUrl) {
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
    activeHabits.value = activeHabits.value.map(h =>
      h.id === camHabit.value.id && h.scheduledTime === camHabit.value.scheduledTime
        ? { ...h, completedToday: true } : h
    )
    toast.success('Photo proof submitted!')
    camHabit.value = null
  } catch {
    toast.error('Failed to upload')
  }
}

async function deleteCompletedHabit(habit) {
  clearAllModal.value = {
    title: `Delete "${habit.title}"?`,
    body: 'This permanently removes the habit and ALL its data from the grid, streaks and stats. This cannot be undone.',
    onConfirm: async () => {
      clearAllModal.value = null
      try {
        await api.delete(`/habits/${habit.id}`)
        completedHabits.value = completedHabits.value.filter(h => h.id !== habit.id)
        loadHistory()
        toast.success(`"${habit.title}" deleted`)
      } catch {
        toast.error('Failed to delete habit')
      }
    },
  }
}

async function confirmDeleteAllHabits() {
  const count = completedHabits.value.length
  clearAllModal.value = {
    title: `Delete all ${count} completed habits?`,
    body: 'This permanently removes the habits, their logs and contribution history from the grid, streaks and stats. This cannot be undone.',
    onConfirm: async () => {
      clearAllModal.value = null
      try {
        await Promise.all(completedHabits.value.map(h => api.delete(`/habits/${h.id}`)))
        completedHabits.value = []
        showCompletedHabits.value = false
        toast.success('All completed habits deleted')
      } catch {
        toast.error('Failed to delete some habits')
      }
    },
  }
}

function loadMoreCompletedTasks() { completedTasksPage.value++ }
function loadMoreCompletedHabits() { completedHabitsPage.value++ }

onMounted(() => { loadAll(); loadHistory() })
</script>
