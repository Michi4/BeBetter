<template>
  <div class="page pb-32 md:pb-24">
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
      <div v-for="h in activeHabits" :key="h.id" class="rounded-xl border border-gray-800 bg-gray-900/50" :class="{ 'animate-celebrate': completingHabitId === h.id }">
        <HabitCard :habit="h" @finish="completeHabit" @cam="openCamHabit" />
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
        <div v-for="h in scheduledForDay" :key="h.id" class="card flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            :class="h.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'">
            <CheckCircle2 v-if="h.completed" :size="16" class="animate-done" />
            <Circle v-else :size="16" />
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-sm truncate" :class="h.completed ? 'text-gray-300' : 'text-gray-500'">{{ h.emoji || '' }} {{ h.title }}</span>
          </div>
          <span v-if="h.completed" class="text-[10px] text-emerald-400 shrink-0">done</span>
          <span v-else class="text-[10px] text-gray-600 shrink-0">missed</span>
        </div>
      </div>
      <div v-if="historyTasks.length" class="space-y-2">
        <h3 class="text-xs font-medium text-gray-500">Tasks</h3>
        <div v-for="t in historyTasks" :key="t.id" class="card flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-400">
            <Check :size="16" />
          </div>
          <span class="text-sm text-gray-300 truncate">{{ t.emoji || '📝' }} {{ t.title }}</span>
        </div>
      </div>
      <div v-if="!scheduledForDay.length && !historyTasks.length" class="text-sm text-gray-500 py-2">No data for this day</div>
    </section>

    <!-- Mobile floating add button -->
    <div class="fixed bottom-20 left-0 right-0 z-40 flex justify-center md:hidden pointer-events-none">
      <button @click="showCreateModal = true"
        class="pointer-events-auto touch-target shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 transition-colors active:scale-95">
        <Plus :size="24" />
      </button>
    </div>

    <CreateModal :show="showCreateModal" initial-mode="task" :convert-data="convertData"
      @close="showCreateModal = false; convertData = null" @created="handleCreated" @convertToHabit="handleConvertToHabit" />
    <BeBetterCam :show="!!camHabit" @close="camHabit = null" @capture="submitHabitProof" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import api from '../api'
import { useToast } from 'vue-toastification'
import { Plus, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, Circle, Check, Trash2, Target } from 'lucide-vue-next'
import HabitCard from '../components/HabitCard.vue'
import TaskCard from '../components/TaskCard.vue'
import BeBetterCam from '../components/BeBetterCam.vue'
import CreateModal from '../components/CreateModal.vue'

const toast = useToast()

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const scheduledForDay = ref([])
const historyTasks = ref([])
const showCreateModal = ref(false)
const quickTaskTitle = ref('')
const convertData = ref(null)

const completingTaskId = ref(null)
const completingHabitId = ref(null)
const camHabit = ref(null)

const todayStr = () => new Date().toISOString().slice(0, 10)

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

    try {
      const logsForDay = await api.get('/grid/day', { params: { date: selectedDate.value } })
      const completedHabits = logsForDay.data.habits || []
      completedHabits.forEach(h => loggedIds.add(h.habitId || h.id))
    } catch {}

    scheduledForDay.value = scheduledHabits.map(h => ({
      ...h,
      completed: loggedIds.has(h.id),
    }))

    historyTasks.value = (tasksRes.data.logs || []).map(l => ({
      ...l,
      title: l.task?.title || 'Task',
      emoji: l.task?.emoji || '📝',
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

const visibleCompletedTasks = computed(() => completedTasks.value.slice(0, (completedTasksPage.value + 1) * PAGE_SIZE))
const visibleCompletedHabits = computed(() => completedHabits.value.slice(0, (completedHabitsPage.value + 1) * PAGE_SIZE))

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
  } catch {}
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
  try {
    const [tasksRes, habitsRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/habits'),
    ])
    const allTasks = tasksRes.data.tasks || []
    incompleteTasks.value = allTasks.filter(t => !t.isCompletedToday)
    completedTasks.value = allTasks.filter(t => t.isCompletedToday)

    const allHabits = habitsRes.data.habits || []
    activeHabits.value = allHabits.filter(h => h.active !== false).map(h => ({
      ...h, completedToday: false, hasBreak: !!h.breaks?.find(b => !b.endDate),
    }))
    completedHabits.value = allHabits.filter(h => h.active === false)

    const todayLogsRes = await api.get('/logs/today').catch(() => ({ data: { logs: [] } }))
    const loggedIds = new Set((todayLogsRes.data.logs || []).map(l => l.habitId))
    activeHabits.value = activeHabits.value.map(h => ({
      ...h, completedToday: loggedIds.has(h.id),
    }))
  } catch {
    toast.error('Failed to load data')
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

function openCamHabit(habit) { camHabit.value = habit }

async function completeHabit(habit) {
  try {
    await api.post('/logs', { habitId: habit.id })
    completingHabitId.value = habit.id
    activeHabits.value = activeHabits.value.map(h =>
      h.id === habit.id ? { ...h, completedToday: true } : h
    )
    toast.success(`"${habit.title}" completed!`)
    setTimeout(() => { completingHabitId.value = null }, 600)
  } catch (e) {
    if (e.response?.status === 409) toast.info('Already completed today!')
    else toast.error('Failed')
  }
}

async function submitHabitProof(dataUrl) {
  if (!camHabit.value) return
  try {
    const form = new FormData()
    form.append('photo', dataUrl, 'proof.jpg')
    const { data } = await api.post('/upload', form)
    await api.post('/logs', { habitId: camHabit.value.id, photo: data.url })
    activeHabits.value = activeHabits.value.map(h =>
      h.id === camHabit.value.id ? { ...h, completedToday: true } : h
    )
    toast.success('Photo proof submitted!')
    camHabit.value = null
  } catch {
    toast.error('Failed to upload')
  }
}

async function deleteCompletedHabit(habit) {
  if (!confirm(`Delete "${habit.title}" and ALL its data? This cannot be undone.`)) return
  try {
    await api.delete(`/habits/${habit.id}`)
    completedHabits.value = completedHabits.value.filter(h => h.id !== habit.id)
    toast.success(`"${habit.title}" deleted`)
  } catch {
    toast.error('Failed')
  }
}

async function confirmDeleteAllHabits() {
  const count = completedHabits.value.length
  if (!confirm(`Delete ALL ${count} completed habits? This cannot be undone.`)) return
  try {
    await Promise.all(completedHabits.value.map(h => api.delete(`/habits/${h.id}`)))
    completedHabits.value = []
    showCompletedHabits.value = false
    toast.success('All completed habits deleted')
  } catch {
    toast.error('Failed to delete some habits')
  }
}

function loadMoreCompletedTasks() { completedTasksPage.value++ }
function loadMoreCompletedHabits() { completedHabitsPage.value++ }

onMounted(() => { loadAll(); loadHistory() })
</script>
