<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-8">
    <!-- History Section -->
    <div class="space-y-4">
      <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider">History</h2>
      <div class="flex items-center gap-2">
        <button @click="prevDay" class="btn-ghost p-1"><ChevronLeft :size="18" /></button>
        <input v-model="selectedDate" type="date" class="input w-auto" />
        <button @click="nextDay" class="btn-ghost p-1"><ChevronRight :size="18" /></button>
        <button @click="selectedDate = todayStr()" class="btn-secondary text-xs">Today</button>
        <select v-model="habitFilter" class="input w-auto text-xs">
          <option value="">All habits</option>
          <option v-for="h in habits" :key="h.id" :value="h.id">{{ h.title }}</option>
        </select>
      </div>
      <div class="card space-y-2">
        <h3 class="text-sm font-medium text-gray-400">Completed</h3>
        <div v-for="log in completedLogs" :key="log.id" class="flex items-center gap-2 text-sm">
          <CheckCircle2 :size="14" class="text-emerald-400 flex-shrink-0" />
          <span class="text-gray-300">{{ log.habitTitle || log.title }}</span>
          <span class="text-xs text-gray-500 ml-auto">{{ log.time || '' }}</span>
        </div>
        <p v-if="!completedLogs.length" class="text-xs text-gray-500">No completions</p>
      </div>
      <div class="card space-y-2">
        <h3 class="text-sm font-medium text-gray-400">Scheduled (uncompleted)</h3>
        <div v-for="task in scheduledTasks" :key="task.id" class="flex items-center gap-2 text-sm">
          <Circle :size="14" class="text-gray-600 flex-shrink-0" />
          <span class="text-gray-500">{{ task.title }}</span>
        </div>
        <p v-if="!scheduledTasks.length" class="text-xs text-gray-500">Nothing scheduled</p>
      </div>
    </div>

    <hr class="border-gray-800" />

    <!-- Tasks Section -->
    <div class="space-y-3">
      <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider">Tasks</h2>
      <form @submit.prevent="addTask" class="flex gap-2">
        <input v-model="newTaskTitle" type="text" placeholder="Add a task..." class="input flex-1" />
        <button type="submit" class="btn px-4" :disabled="!newTaskTitle.trim()"><Plus :size="18" /></button>
      </form>
      <div v-if="incompleteTasks.length === 0" class="text-sm text-gray-500">No incomplete tasks</div>
      <div v-for="task in incompleteTasks" :key="task.id" class="space-y-1">
        <div class="card-hover flex items-center gap-3">
          <button @click="completeTask(task)"
            class="w-9 h-9 rounded-full flex items-center justify-center bg-gray-800 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors duration-150">
            <Check :size="18" />
          </button>
          <div class="flex-1 min-w-0" @click="toggleTaskExpand(task.id)">
            <div class="flex items-center gap-2">
              <h4 class="font-medium text-sm truncate">{{ task.title }}</h4>
              <span v-if="task.dueDate" class="text-[10px] px-1.5 py-0.5 rounded"
                :class="getDueDateClass(task.dueDate)">{{ getDueDateLabel(task.dueDate) }}</span>
            </div>
          </div>
          <button @click="toggleTaskExpand(task.id)" class="text-gray-400 hover:text-gray-200 transition-colors duration-150">
            <ChevronDown v-if="expandedTask !== task.id" :size="16" />
            <ChevronUp v-else :size="16" />
          </button>
          <button @click="deleteTask(task)" class="text-gray-600 hover:text-red-400 transition-colors duration-150">
            <X :size="14" />
          </button>
        </div>
        <div v-if="expandedTask === task.id" class="card space-y-3 ml-12">
          <input v-model="editTaskForm.title" class="input" placeholder="Title" />
          <textarea v-model="editTaskForm.description" class="input" placeholder="Description" rows="2"></textarea>
          <input v-model="editTaskForm.dueDate" type="date" class="input" />
          <div class="flex justify-end gap-2">
            <button @click="expandedTask = null" class="btn-secondary text-xs">Cancel</button>
            <button @click="updateTask(task)" class="btn text-xs">Save</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Habits Section -->
    <div class="space-y-3">
      <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider">Habits</h2>
      <div v-if="activeHabits.length === 0" class="text-sm text-gray-500">No active habits</div>
      <HabitCard v-for="h in activeHabits" :key="h.id" :habit="h" @finish="openFinishHabit" />
    </div>

    <!-- Completed Tasks Section -->
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider">Completed Tasks</h2>
        <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{{ completedTasks.length }}</span>
      </div>
      <div v-if="visibleCompletedTasks.length === 0" class="text-sm text-gray-500">No completed tasks</div>
      <div v-for="task in visibleCompletedTasks" :key="task.id" class="card-hover flex items-center gap-3">
        <div class="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400">
          <Check :size="18" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-sm truncate text-gray-400 line-through">{{ task.title }}</h4>
          <p v-if="task.completedAt" class="text-[10px] text-gray-500">
            Completed {{ formatDate(task.completedAt) }}
          </p>
        </div>
      </div>
      <button v-if="completedTasks.length > visibleCompletedTasks.length" @click="loadMoreCompletedTasks"
        class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors duration-150 flex items-center gap-1">
        <ChevronDown :size="12" />
        Load more ({{ completedTasks.length - visibleCompletedTasks.length }} remaining)
      </button>
    </div>

    <!-- Completed Habits Section -->
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider">Completed Habits</h2>
        <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{{ completedHabits.length }}</span>
      </div>
      <div v-if="visibleCompletedHabits.length === 0" class="text-sm text-gray-500">No completed habits</div>
      <div v-for="habit in visibleCompletedHabits" :key="habit.id" class="card-hover flex items-center gap-3">
        <div class="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400">
          <Check :size="18" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-sm truncate text-gray-400 line-through">{{ habit.title }}</h4>
          <p v-if="habit.completedAt" class="text-[10px] text-gray-500">
            Completed {{ formatDate(habit.completedAt) }}
          </p>
        </div>
      </div>
      <button v-if="completedHabits.length > visibleCompletedHabits.length" @click="loadMoreCompletedHabits"
        class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors duration-150 flex items-center gap-1">
        <ChevronDown :size="12" />
        Load more ({{ completedHabits.length - visibleCompletedHabits.length }} remaining)
      </button>
    </div>

    <BeBetterCam :show="!!finishingHabit" @close="finishingHabit = null" @capture="submitHabitProof" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus, Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-vue-next'
import HabitCard from '../components/HabitCard.vue'
import BeBetterCam from '../components/BeBetterCam.vue'

const toast = useToast()

// History
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const habitFilter = ref('')
const historyHabits = ref([])
const logs = ref([])
const historyTasks = ref([])

const todayStr = () => new Date().toISOString().slice(0, 10)

const completedLogs = computed(() => {
  let filtered = logs.value.filter(l => l.completed || l.status === 'done')
  if (habitFilter.value) filtered = filtered.filter(l => l.habitId === habitFilter.value)
  return filtered
})

const scheduledTasks = computed(() => historyTasks.value.filter(t => !t.completed))

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
    const [logsRes, tasksRes, habitsRes] = await Promise.all([
      api.get('/logs', { params: { date: selectedDate.value, withScheduled: true } }),
      api.get('/tasks', { params: { date: selectedDate.value } }),
      api.get('/habits'),
    ])
    logs.value = logsRes.data.logs || logsRes.data || []
    historyTasks.value = (tasksRes.data.tasks || tasksRes.data || [])
    historyHabits.value = (habitsRes.data.habits || habitsRes.data || [])
  } catch { toast.error('Failed to load history') }
}

watch(selectedDate, loadHistory)

// Tasks & Habits
const incompleteTasks = ref([])
const completedTasks = ref([])
const activeHabits = ref([])
const completedHabits = ref([])
const newTaskTitle = ref('')
const expandedTask = ref(null)
const finishingHabit = ref(null)

const editTaskForm = reactive({ title: '', description: '', dueDate: '' })

const completedTasksPage = ref(0)
const completedHabitsPage = ref(0)
const PAGE_SIZE = 10

const visibleCompletedTasks = computed(() => completedTasks.value.slice(0, (completedTasksPage.value + 1) * PAGE_SIZE))
const visibleCompletedHabits = computed(() => completedHabits.value.slice(0, (completedHabitsPage.value + 1) * PAGE_SIZE))

const habits = computed(() => historyHabits.value)

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

function getDueDateClass(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d < today) return 'bg-red-500/10 text-red-400'
  if (d.toDateString() === today.toDateString()) return 'bg-emerald-500/10 text-emerald-400'
  return 'bg-gray-700/50 text-gray-400'
}

function getDueDateLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d - today) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toggleTaskExpand(taskId) {
  if (expandedTask.value === taskId) {
    expandedTask.value = null
  } else {
    const task = incompleteTasks.value.find(t => t.id === taskId)
    if (task) {
      editTaskForm.title = task.title
      editTaskForm.description = task.description || ''
      editTaskForm.dueDate = task.dueDate ? task.dueDate.slice(0, 10) : ''
    }
    expandedTask.value = taskId
  }
}

async function loadAll() {
  try {
    const [tasksRes, habitsRes, completedTasksRes, completedHabitsRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/habits'),
      api.get('/tasks', { params: { completed: true } }),
      api.get('/habits', { params: { includeInactive: true } }),
    ])
    const allTasks = tasksRes.data.tasks || tasksRes.data || []
    incompleteTasks.value = allTasks.filter(t => !t.completed)
    completedTasks.value = (completedTasksRes.data.tasks || completedTasksRes.data || []).filter(t => t.completed)

    const allHabits = habitsRes.data.habits || habitsRes.data || []
    activeHabits.value = allHabits.filter(h => h.active !== false)
    completedHabits.value = allHabits.filter(h => h.active === false)
  } catch {
    toast.error('Failed to load data')
  }
}

async function addTask() {
  if (!newTaskTitle.value.trim()) return
  try {
    const res = await api.post('/tasks', { title: newTaskTitle.value.trim(), isScheduled: false })
    incompleteTasks.value.unshift(res.data.task || res.data)
    newTaskTitle.value = ''
    toast.success('Task created')
  } catch {
    toast.error('Failed to create task')
  }
}

async function completeTask(task) {
  try {
    await api.post(`/api/tasks/${task.id}/complete`)
    incompleteTasks.value = incompleteTasks.value.filter(t => t.id !== task.id)
    completedTasks.value.unshift({ ...task, completed: true, completedAt: new Date().toISOString() })
    toast.success('Task completed')
  } catch {
    toast.error('Failed')
  }
}

async function updateTask(task) {
  try {
    const payload = {
      title: editTaskForm.title,
      description: editTaskForm.description || undefined,
      isScheduled: !!editTaskForm.dueDate
    }
    if (editTaskForm.dueDate) payload.dueDate = editTaskForm.dueDate
    await api.put(`/api/tasks/${task.id}`, payload)
    task.title = editTaskForm.title
    task.description = editTaskForm.description
    task.dueDate = editTaskForm.dueDate || null
    expandedTask.value = null
    toast.success('Task updated')
  } catch {
    toast.error('Failed to update task')
  }
}

async function deleteTask(task) {
  try {
    await api.delete(`/api/tasks/${task.id}`)
    incompleteTasks.value = incompleteTasks.value.filter(t => t.id !== task.id)
    toast.success('Task deleted')
  } catch {
    toast.error('Failed')
  }
}

function openFinishHabit(habit) {
  if (habit.verificationType === 'photo') {
    finishingHabit.value = habit
  } else {
    finishHabit(habit)
  }
}

async function finishHabit(habit, proofUrl) {
  try {
    const payload = proofUrl ? { proofUrl } : {}
    await api.post(`/api/habits/${habit.id}/finish`, payload)
    toast.success('Habit completed!')
    loadAll()
  } catch {
    toast.error('Failed')
  }
}

function submitHabitProof(dataUrl) {
  if (finishingHabit.value) {
    finishHabit(finishingHabit.value, dataUrl)
    finishingHabit.value = null
  }
}

function loadMoreCompletedTasks() { completedTasksPage.value++ }
function loadMoreCompletedHabits() { completedHabitsPage.value++ }

onMounted(() => { loadAll(); loadHistory() })
</script>
