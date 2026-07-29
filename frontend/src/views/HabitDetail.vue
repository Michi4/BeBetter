<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold truncate">{{ habit.title }}</h1>
    </div>

    <div v-if="!editing" class="space-y-3">
      <div class="card space-y-4">
        <p v-if="habit.description" class="text-sm text-gray-400 leading-relaxed">{{ habit.description }}</p>

        <div class="grid grid-cols-2 gap-3">
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-emerald-400">{{ habit.currentStreak || 0 }}</div>
            <div class="text-[10px] text-gray-500">Current Streak</div>
          </div>
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-amber-400">{{ habit.bestStreak || 0 }}</div>
            <div class="text-[10px] text-gray-500">Best Streak</div>
          </div>
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-emerald-400">{{ habit.totalCompletions || 0 }}</div>
            <div class="text-[10px] text-gray-500">Total Done</div>
          </div>
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-gray-300 text-sm">{{ habit.verificationType || 'None' }}</div>
            <div class="text-[10px] text-gray-500">Verification</div>
          </div>
        </div>

        <div class="text-xs text-gray-500">
          <span class="text-gray-600">Schedule:</span>
          <span class="text-gray-400 ml-1">{{ formatRecurrence(habit.recurrence) }}</span>
        </div>

        <div v-if="habit.onBreak" class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-amber-400">On Break</p>
              <p v-if="habit.breakEndDate" class="text-xs text-gray-500">Until {{ formatDate(habit.breakEndDate) }}</p>
            </div>
            <button @click="endBreak" class="btn-secondary text-xs">
              <Play :size="12" /> End Break
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <button @click="editing = true" class="btn-secondary flex-1 min-w-0">
            <Pencil :size="14" /> Edit
          </button>
          <button v-if="!habit.onBreak" @click="showBreakForm = !showBreakForm" class="btn-secondary flex-1 min-w-0">
            <Pause :size="14" /> Break
          </button>
          <button @click="showFinishForm = !showFinishForm" class="btn flex-1 min-w-0">
            <CheckCircle :size="14" /> Finish
          </button>
          <button @click="confirmDelete = true" class="btn-danger flex-1 min-w-0">
            <Trash2 :size="14" /> Delete
          </button>
        </div>
      </div>

      <div v-if="showBreakForm && !habit.onBreak" class="card space-y-3">
        <p class="section-title">Start Break</p>
        <div>
          <label class="text-xs font-medium text-gray-400 mb-1 block">End date (optional)</label>
          <input v-model="breakEndDate" type="date" class="input" />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-400 mb-1 block">Reason (optional)</label>
          <input v-model="breakReason" class="input" placeholder="e.g. Vacation, illness..." />
        </div>
        <div class="flex gap-2">
          <button @click="startBreak" class="btn flex-1">Start Break</button>
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

    <div v-else class="card space-y-3">
      <p class="section-title">Edit Habit</p>
      <input v-model="editForm.title" class="input" placeholder="Title" />
      <textarea v-model="editForm.description" class="input min-h-[80px]" placeholder="Description" rows="3"></textarea>
      <RecurrenceBuilder v-model="editForm.recurrence" />
      <div>
        <label class="text-xs font-medium text-gray-400 mb-1 block">Verification</label>
        <select v-model="editForm.verificationType" class="input">
          <option value="none">No verification</option>
          <option value="photo">Photo verification</option>
        </select>
      </div>
      <div class="flex gap-2">
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
          <span class="text-xs text-gray-500 w-16 shrink-0">{{ formatDate(log.date || log.createdAt) }}</span>
          <span
            class="text-xs font-medium px-1.5 py-0.5 rounded"
            :class="(log.status === 'done' || log.completed)
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-gray-800 text-gray-500'"
          >
            {{ log.status || (log.completed ? 'done' : 'missed') }}
          </span>
          <div v-if="log.proofUrl" class="ml-auto shrink-0">
            <img :src="log.proofUrl" class="w-8 h-8 rounded object-cover" alt="proof" />
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" @click.self="confirmDelete = false">
        <div class="card w-full max-w-sm mx-0 sm:mx-4 space-y-3 rounded-b-none sm:rounded-xl safe-bottom">
          <p class="section-title">Delete Habit</p>
          <p class="text-sm text-gray-400">Are you sure? This cannot be undone.</p>
          <div class="flex flex-col gap-2">
            <button @click="deleteHabit(false)" class="btn-danger w-full">
              <Trash2 :size="14" /> Delete
            </button>
            <button @click="deleteHabit(true)" class="btn w-full bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30">
              <Trash2 :size="14" /> Delete with History
            </button>
            <button @click="confirmDelete = false" class="btn-secondary w-full">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { ArrowLeft, Pencil, Save, Pause, Play, CheckCircle, Trash2 } from 'lucide-vue-next'
import RecurrenceBuilder from '../components/RecurrenceBuilder.vue'

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
const breakEndDate = ref('')
const breakReason = ref('')

const editForm = reactive({
  title: '',
  description: '',
  recurrence: { type: 'daily' },
  verificationType: 'none'
})

async function loadHabit() {
  try {
    const res = await api.get(`/habits/${route.params.id}`)
    habit.value = res.data.habit || res.data
    editForm.title = habit.value.title
    editForm.description = habit.value.description || ''
    editForm.recurrence = habit.value.recurrence || { type: 'daily' }
    editForm.verificationType = habit.value.verificationType || 'none'

    const logRes = await api.get('/logs', { params: { habitId: route.params.id } })
    logs.value = logRes.data.logs || logRes.data || []
  } catch {
    toast.error('Failed to load habit')
  }
}

async function saveEdit() {
  if (!editForm.title.trim()) return
  try {
    await api.put(`/habits/${route.params.id}`, editForm)
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
    if (breakEndDate.value) payload.endDate = breakEndDate.value
    if (breakReason.value.trim()) payload.reason = breakReason.value.trim()
    await api.post(`/habits/${route.params.id}/break/start`, payload)
    toast.success('Break started')
    showBreakForm.value = false
    breakEndDate.value = ''
    breakReason.value = ''
    loadHabit()
  } catch {
    toast.error('Failed to start break')
  }
}

async function endBreak() {
  try {
    await api.post(`/habits/${route.params.id}/break/end`)
    toast.success('Break ended')
    loadHabit()
  } catch {
    toast.error('Failed to end break')
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

async function deleteHabit(withHistory) {
  try {
    const params = withHistory ? { deleteLogs: 'true' } : {}
    await api.delete(`/habits/${route.params.id}`, { params })
    toast.success('Habit deleted')
    router.push('/dashboard')
  } catch {
    toast.error('Failed to delete habit')
  }
}

function formatRecurrence(r) {
  if (!r) return 'Daily'
  if (r.type === 'daily') return 'Daily'
  if (r.type === 'weekdays') return 'Weekdays'
  if (r.type === 'weekends') return 'Weekends'
  if (r.type === 'weekly') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return `Weekly (${(r.days || []).map(d => days[d]).join(', ')})`
  }
  if (r.type === 'interval') return `Every ${r.intervalDays} days`
  return r.type
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(loadHabit)
</script>
