<template>
  <div class="page">
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

      <select v-model="habitFilter" class="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500">
        <option value="">All habits</option>
        <option v-for="h in habits" :key="h.id" :value="h.id">{{ h.title }}</option>
      </select>

      <!-- Completed Logs Card -->
      <div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
        <h3 class="text-sm font-medium text-gray-400">Completed</h3>
        <div v-if="completedLogs.length === 0" class="text-xs text-gray-500">No completions</div>
        <div v-for="log in completedLogs" :key="log.id" class="flex items-center gap-2 text-sm">
          <CheckCircle2 :size="14" class="text-emerald-400 flex-shrink-0 animate-done" />
          <span class="text-gray-300 truncate">{{ log.habitTitle || log.title }}</span>
          <span class="text-xs text-gray-500 ml-auto shrink-0">{{ log.time || '' }}</span>
        </div>
      </div>

      <!-- Scheduled (uncompleted) Card -->
      <div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
        <h3 class="text-sm font-medium text-gray-400">Scheduled (uncompleted)</h3>
        <div v-if="scheduledTasks.length === 0" class="text-xs text-gray-500">Nothing scheduled</div>
        <div v-for="task in scheduledTasks" :key="task.id" class="flex items-center gap-2 text-sm">
          <Circle :size="14" class="text-gray-600 flex-shrink-0" />
          <span class="text-gray-500 truncate">{{ task.title }}</span>
        </div>
      </div>
    </section>

    <!-- Tasks Section -->
    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <h2 class="section-title">Tasks</h2>
        <span v-if="incompleteTasks.length" class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">{{ incompleteTasks.length }}</span>
      </div>

      <form @submit.prevent="addTask" class="flex gap-2">
        <input
          v-model="newTaskTitle"
          type="text"
          placeholder="Add a task..."
          class="min-h-[44px] flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          :disabled="!newTaskTitle.trim()"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus :size="18" />
        </button>
      </form>

      <!-- Incomplete Tasks -->
      <div v-if="incompleteTasks.length === 0" class="text-sm text-gray-500 py-2">No incomplete tasks</div>
      <div v-for="task in incompleteTasks" :key="task.id" class="space-y-1" :class="{ 'animate-celebrate': completingTaskId === task.id }">
        <TaskCard :task="task" @complete="completeTask" @delete="deleteTask" @edit="openEditTask" />

        <!-- Edit Panel -->
        <div v-if="expandedTask === task.id" class="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-3 ml-9">
          <input
            v-model="editTaskForm.title"
            class="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Title"
          />
          <textarea
            v-model="editTaskForm.description"
            class="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            placeholder="Description"
            rows="2"
          ></textarea>
          <input
            v-model="editTaskForm.dueDate"
            type="date"
            class="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div class="flex flex-col sm:flex-row justify-between gap-2">
            <button
              @click="convertToHabit(task)"
              class="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <RefreshCw :size="14" />
              Convert to Habit
            </button>
            <div class="flex gap-2">
              <button
                @click="expandedTask = null"
                class="min-h-[44px] flex-1 sm:flex-none rounded-lg bg-gray-800 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                @click="updateTask(task)"
                class="min-h-[44px] flex-1 sm:flex-none rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Completed Tasks (collapsible) -->
      <div v-if="completedTasks.length > 0" class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <button
          @click="showCompletedTasks = !showCompletedTasks"
          class="min-h-[44px] w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-400 hover:bg-gray-800/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span>Completed Tasks</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{{ completedTasks.length }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click.stop="confirmDeleteAllTasks"
              class="text-[10px] px-2 py-1 rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete all completed tasks"
            >
              Clear all
            </button>
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
              <p v-if="task.completedAt" class="text-[10px] text-gray-500">
                Completed {{ formatDate(task.completedAt) }}
              </p>
            </div>
            <button
              @click="deleteCompletedTask(task)"
              class="delete-btn shrink-0 p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete"
            >
              <Trash2 :size="13" />
            </button>
          </div>
          <button
            v-if="completedTasks.length > visibleCompletedTasks.length"
            @click="loadMoreCompletedTasks"
            class="min-h-[44px] w-full flex items-center justify-center gap-1 px-4 py-3 text-xs text-emerald-400 hover:bg-gray-800/50 transition-colors"
          >
            <ChevronDown :size="12" />
            Load more ({{ completedTasks.length - visibleCompletedTasks.length }} remaining)
          </button>
        </div>
      </div>
    </section>

    <!-- Habits Section -->
    <section class="space-y-3">
      <h2 class="section-title">Habits</h2>
      <div v-if="activeHabits.length === 0" class="text-sm text-gray-500">No active habits</div>
      <div v-for="h in activeHabits" :key="h.id" class="rounded-xl border border-gray-800 bg-gray-900/50" :class="{ 'animate-celebrate': completingHabitId === h.id }">
        <HabitCard :habit="h" @finish="openFinishHabit" />
      </div>

      <!-- Completed Habits (collapsible) -->
      <div v-if="completedHabits.length > 0" class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <button
          @click="showCompletedHabits = !showCompletedHabits"
          class="min-h-[44px] w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-400 hover:bg-gray-800/50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span>Completed Habits</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{{ completedHabits.length }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click.stop="confirmDeleteAllHabits"
              class="text-[10px] px-2 py-1 rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete all completed habits and their stats"
            >
              Clear all
            </button>
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
              <p v-if="habit.completedAt" class="text-[10px] text-gray-500">
                Completed {{ formatDate(habit.completedAt) }}
              </p>
            </div>
            <button
              @click="deleteCompletedHabit(habit)"
              class="delete-btn shrink-0 p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete habit and all its data"
            >
              <Trash2 :size="13" />
            </button>
          </div>
          <button
            v-if="completedHabits.length > visibleCompletedHabits.length"
            @click="loadMoreCompletedHabits"
            class="min-h-[44px] w-full flex items-center justify-center gap-1 px-4 py-3 text-xs text-emerald-400 hover:bg-gray-800/50 transition-colors"
          >
            <ChevronDown :size="12" />
            Load more ({{ completedHabits.length - visibleCompletedHabits.length }} remaining)
          </button>
        </div>
      </div>
    </section>

    <BeBetterCam :show="!!finishingHabit" @close="finishingHabit = null" @capture="submitHabitProof" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus, Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, Circle, RefreshCw, Trash2 } from 'lucide-vue-next'
import HabitCard from '../components/HabitCard.vue'
import TaskCard from '../components/TaskCard.vue'
import BeBetterCam from '../components/BeBetterCam.vue'

const toast = useToast()

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const habitFilter = ref('')
const historyHabits = ref([])
const logs = ref([])
const historyTasks = ref([])

const completingTaskId = ref(null)
const completingHabitId = ref(null)

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
    historyTasks.value = tasksRes.data.tasks || tasksRes.data || []
    historyHabits.value = habitsRes.data.habits || habitsRes.data || []
  } catch {
    toast.error('Failed to load history')
  }
}

watch(selectedDate, loadHistory)

const incompleteTasks = ref([])
const completedTasks = ref([])
const activeHabits = ref([])
const completedHabits = ref([])
const newTaskTitle = ref('')
const expandedTask = ref(null)
const finishingHabit = ref(null)
const showCompletedTasks = ref(false)
const showCompletedHabits = ref(false)

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

function openEditTask(task) {
  expandedTask.value = task.id
  editTaskForm.title = task.title
  editTaskForm.description = task.description || ''
  editTaskForm.dueDate = task.dueDate ? task.dueDate.slice(0, 10) : ''
}

async function convertToHabit(task) {
  try {
    await api.post('/habits', { title: task.title, description: task.description || '', recurrence: { type: 'daily' } })
    await api.delete(`/tasks/${task.id}`)
    incompleteTasks.value = incompleteTasks.value.filter(t => t.id !== task.id)
    expandedTask.value = null
    toast.success('Converted to habit')
    loadAll()
  } catch {
    toast.error('Failed to convert')
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
    await api.post(`/tasks/${task.id}/complete`)
    completingTaskId.value = task.id
    toast.success(`"${task.title}" done!`)
    setTimeout(() => {
      completingTaskId.value = null
      incompleteTasks.value = incompleteTasks.value.filter(t => t.id !== task.id)
      completedTasks.value.unshift({ ...task, completed: true, completedAt: new Date().toISOString() })
    }, 600)
  } catch {
    toast.error('Failed')
  }
}

async function updateTask(task) {
  try {
    const payload = {
      title: editTaskForm.title,
      description: editTaskForm.description || undefined,
      isScheduled: !!editTaskForm.dueDate,
    }
    if (editTaskForm.dueDate) payload.dueDate = editTaskForm.dueDate
    await api.put(`/tasks/${task.id}`, payload)
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
    await api.delete(`/tasks/${task.id}`)
    incompleteTasks.value = incompleteTasks.value.filter(t => t.id !== task.id)
    toast.success('Task deleted')
  } catch {
    toast.error('Failed')
  }
}

async function deleteCompletedTask(task) {
  try {
    await api.delete(`/tasks/${task.id}`)
    completedTasks.value = completedTasks.value.filter(t => t.id !== task.id)
    toast.success('Task deleted')
  } catch {
    toast.error('Failed')
  }
}

async function confirmDeleteAllTasks() {
  if (!confirm(`Delete all ${completedTasks.value.length} completed tasks? This cannot be undone.`)) return
  try {
    await Promise.all(completedTasks.value.map(t => api.delete(`/tasks/${t.id}`)))
    completedTasks.value = []
    showCompletedTasks.value = false
    toast.success('All completed tasks deleted')
  } catch {
    toast.error('Failed to delete some tasks')
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
    await api.post(`/habits/${habit.id}/finish`, payload)
    completingHabitId.value = habit.id
    toast.success(`"${habit.title}" completed!`)
    setTimeout(() => {
      completingHabitId.value = null
      loadAll()
    }, 600)
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

async function deleteCompletedHabit(habit) {
  if (!confirm(`Delete "${habit.title}" and ALL its data (stats, logs, streaks, pauses)? This cannot be undone.`)) return
  try {
    await api.delete(`/habits/${habit.id}?deleteLogs=true`)
    completedHabits.value = completedHabits.value.filter(h => h.id !== habit.id)
    toast.success(`"${habit.title}" deleted with all data`)
  } catch {
    toast.error('Failed')
  }
}

async function confirmDeleteAllHabits() {
  const count = completedHabits.value.length
  if (!confirm(`Delete ALL ${count} completed habits and ALL their data (stats, logs, streaks, pauses, wagers)? This cannot be undone.`)) return
  try {
    await Promise.all(completedHabits.value.map(h => api.delete(`/habits/${h.id}?deleteLogs=true`)))
    completedHabits.value = []
    showCompletedHabits.value = false
    toast.success('All completed habits deleted with their data')
  } catch {
    toast.error('Failed to delete some habits')
  }
}

function loadMoreCompletedTasks() { completedTasksPage.value++ }
function loadMoreCompletedHabits() { completedHabitsPage.value++ }

onMounted(() => { loadAll(); loadHistory() })
</script>
