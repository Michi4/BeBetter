<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold truncate">{{ habit.emoji || '' }} {{ habit.title }}</h1>
    </div>

    <div v-if="!editing" class="space-y-3">
      <div class="card space-y-4">
        <p v-if="habit.description" class="text-sm text-gray-400 leading-relaxed">{{ habit.description }}</p>

        <div class="grid grid-cols-2 gap-3">
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-emerald-400">{{ habit._count?.logs || habit.totalCompletions || 0 }}</div>
            <div class="text-[10px] text-gray-500">Total Done</div>
          </div>
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-amber-400">{{ habit.bestStreak || 0 }}</div>
            <div class="text-[10px] text-gray-500">Best Streak</div>
          </div>
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-gray-300 text-sm">{{ habit.verificationType || 'honor' }}</div>
            <div class="text-[10px] text-gray-500">Verification</div>
          </div>
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-gray-300 text-sm">{{ formatRecurrence(habit) }}</div>
            <div class="text-[10px] text-gray-500">Schedule</div>
          </div>
        </div>

        <div v-if="activeBreak" class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-amber-400">On Pause</p>
              <p class="text-xs text-gray-500">Since {{ formatDate(activeBreak.startDate) }}</p>
              <p v-if="activeBreak.reason" class="text-xs text-gray-500">{{ activeBreak.reason }}</p>
            </div>
            <button @click="endBreak" class="btn-secondary text-xs">
              <Play :size="12" /> Resume
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <button @click="editing = true" class="btn-secondary flex-1 min-w-0">
            <Pencil :size="14" /> Edit
          </button>
          <button v-if="!activeBreak" @click="showBreakForm = !showBreakForm" class="btn-secondary flex-1 min-w-0">
            <Pause :size="14" /> Pause
          </button>
          <button @click="showFinishForm = !showFinishForm" class="btn flex-1 min-w-0">
            <CheckCircle :size="14" /> Finish
          </button>
          <button @click="confirmDelete = true" class="btn-danger flex-1 min-w-0">
            <Trash2 :size="14" /> Delete
          </button>
        </div>
      </div>

      <div v-if="showBreakForm && !activeBreak" class="card space-y-3">
        <p class="section-title">Start Pause</p>
        <div>
          <label class="text-xs font-medium text-gray-400 mb-1 block">Reason (optional)</label>
          <input v-model="breakReason" class="input" placeholder="e.g. Vacation, illness..." />
        </div>
        <div class="flex gap-2">
          <button @click="startBreak" class="btn flex-1">Start Pause</button>
          <button @click="showBreakForm = false" class="btn-secondary flex-1">Cancel</button>
        </div>
      </div>

      <div v-if="showFinishForm" class="card space-y-3">
        <p class="section-title">Finish Habit</p>
        <textarea
          v-model="finishNote"
          class="input min-h-[80px]"
          placeholder="Add a note about completing this habit..."
          rows="3"
        ></textarea>
        <div class="flex gap-2">
          <button @click="finishHabit" class="btn flex-1">
            <CheckCircle :size="14" /> Finish Habit
          </button>
          <button @click="showFinishForm = false" class="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <div v-else class="card space-y-4">
      <p class="section-title">Edit Habit</p>
      <HabitForm v-model="editForm" :showPresetOption="false" />
      <div class="flex gap-2 pt-1">
        <button @click="saveEdit" class="btn flex-1">
          <Save :size="14" /> Save
        </button>
        <button @click="editing = false" class="btn-secondary flex-1">Cancel</button>
      </div>
    </div>

    <div v-if="logs.length" class="space-y-2">
      <p class="section-title">Recent Logs</p>
      <div class="card divide-y divide-gray-800">
        <div v-for="log in logs" :key="log.id" class="flex items-center gap-3 py-3">
          <span class="text-xs text-gray-500 w-16 shrink-0">{{ formatDate(log.completedAt) }}</span>
          <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
            completed
          </span>
          <div v-if="log.photo" class="ml-auto shrink-0">
            <img :src="log.photo" class="w-8 h-8 rounded object-cover" alt="proof" />
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-sm text-gray-500 py-2">No logs yet</div>

    <Teleport to="body">
      <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" @click.self="confirmDelete = false">
        <div class="card w-full max-w-sm mx-0 sm:mx-4 space-y-3 rounded-b-none sm:rounded-xl safe-bottom">
          <p class="section-title">Delete Habit</p>
          <p class="text-sm text-gray-400">Are you sure? This cannot be undone.</p>
          <div class="flex flex-col gap-2">
            <button @click="deleteHabit(false)" class="btn-danger w-full">
              <Trash2 :size="14" /> Delete
            </button>
            <button @click="confirmDelete = false" class="btn-secondary w-full">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { ArrowLeft, Pencil, Save, Pause, Play, CheckCircle, Trash2 } from 'lucide-vue-next'
import HabitForm from '../components/HabitForm.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const habit = ref({})
const logs = ref([])
const editing = ref(false)
const showBreakForm = ref(false)
const showFinishForm = ref(false)
const finishNote = ref('')
const confirmDelete = ref(false)
const breakReason = ref('')

const activeBreak = computed(() => {
  return habit.value.breaks?.find(b => !b.endDate) || null
})

const editForm = reactive({
  title: '',
  description: '',
  emoji: '🎯',
  schedule: [1, 2, 3, 4, 5, 6, 7],
  verificationType: 'honor',
  config: null,
})

async function loadHabit() {
  try {
    const res = await api.get(`/habits/${route.params.id}`)
    habit.value = res.data.habit || res.data
    editForm.title = habit.value.title
    editForm.description = habit.value.description || ''
    editForm.emoji = habit.value.emoji || '🎯'
    editForm.verificationType = habit.value.verificationType || 'honor'
    editForm.config = habit.value.config || null

    const sched = JSON.parse(typeof habit.value.daysPerWeek === 'string' ? habit.value.daysPerWeek : JSON.stringify(habit.value.daysPerWeek || '[]'))
    editForm.schedule = Array.isArray(sched) ? sched : [1, 2, 3, 4, 5, 6, 7]

    logs.value = habit.value.logs || []
  } catch {
    toast.error('Failed to load habit')
  }
}

async function saveEdit() {
  if (!editForm.title.trim()) return
  try {
    await api.put(`/habits/${route.params.id}`, {
      title: editForm.title,
      description: editForm.description,
      emoji: editForm.emoji,
      frequencyType: 'daily',
      schedule: editForm.schedule,
      daysPerWeek: editForm.schedule,
      verificationType: editForm.verificationType,
      config: editForm.config,
    })
    editing.value = false
    toast.success('Habit updated')
    loadHabit()
  } catch {
    toast.error('Failed to update habit')
  }
}

async function startBreak() {
  try {
    const payload = {}
    if (breakReason.value.trim()) payload.reason = breakReason.value.trim()
    await api.post(`/habits/${route.params.id}/break/start`, payload)
    toast.success('Pause started')
    showBreakForm.value = false
    breakReason.value = ''
    loadHabit()
  } catch {
    toast.error('Failed to start pause')
  }
}

async function endBreak() {
  try {
    await api.post(`/habits/${route.params.id}/break/end`)
    toast.success('Pause ended')
    loadHabit()
  } catch {
    toast.error('Failed to end pause')
  }
}

async function finishHabit() {
  try {
    await api.post(`/habits/${route.params.id}/finish`, { note: finishNote.value })
    toast.success('Habit finished')
    router.push('/dashboard')
  } catch {
    toast.error('Failed to finish habit')
  }
}

async function deleteHabit() {
  try {
    await api.delete(`/habits/${route.params.id}`)
    toast.success('Habit deleted')
    router.push('/dashboard')
  } catch {
    toast.error('Failed to delete habit')
  }
}

function formatRecurrence(h) {
  if (!h) return 'Daily'
  if (h.frequencyType === 'daily' || h.frequencyType === 'always') return 'Daily'
  const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'))
  if (h.frequencyType === 'days_per_week' || h.frequencyType === 'x_per_week') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const names = sched.map(d => dayNames[d]).filter(Boolean)
    if (names.length === 7) return 'Daily'
    if (names.length === 5 && sched.every(d => d >= 1 && d <= 5)) return 'Weekdays'
    if (names.length === 2 && sched.includes(0) && sched.includes(6)) return 'Weekends'
    return names.join(', ')
  }
  return h.frequencyType || 'Daily'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(loadHabit)
</script>
