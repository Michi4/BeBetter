<template>
  <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
    <div class="flex items-center gap-3">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold">{{ habit.title }}</h1>
    </div>

    <div class="card space-y-4">
      <div v-if="!editing">
        <p v-if="habit.description" class="text-sm text-gray-400 mb-3">{{ habit.description }}</p>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-gray-500">Streak:</span> <span class="text-emerald-400 font-medium">{{ habit.currentStreak || 0 }} days</span></div>
          <div><span class="text-gray-500">Best:</span> <span class="text-emerald-400 font-medium">{{ habit.bestStreak || 0 }} days</span></div>
          <div><span class="text-gray-500">Total:</span> <span class="text-emerald-400 font-medium">{{ habit.totalCompletions || 0 }}</span></div>
          <div><span class="text-gray-500">Verification:</span> <span class="text-gray-300">{{ habit.verificationType || 'none' }}</span></div>
        </div>
        <div class="mt-3">
          <span class="text-xs text-gray-500">Recurrence:</span>
          <span class="text-xs text-gray-300 ml-1">{{ formatRecurrence(habit.recurrence) }}</span>
        </div>
        <div class="mt-4 flex gap-2">
          <button @click="editing = true" class="btn-secondary text-xs">Edit</button>
          <button @click="showBreakOptions = !showBreakOptions" class="btn-secondary text-xs">
            {{ habit.onBreak ? 'End Break' : 'Start Break' }}
          </button>
          <button @click="showFinishForm = !showFinishForm" class="btn text-xs">Finish with Note</button>
          <button @click="confirmDelete = true" class="btn-danger text-xs">Delete</button>
        </div>
      </div>

      <div v-else class="space-y-3">
        <input v-model="editForm.title" class="input" placeholder="Title" />
        <input v-model="editForm.description" class="input" placeholder="Description" />
        <RecurrenceBuilder v-model="editForm.recurrence" />
        <select v-model="editForm.verificationType" class="input">
          <option value="none">No verification</option>
          <option value="photo">Photo verification</option>
        </select>
        <div class="flex gap-2">
          <button @click="saveEdit" class="btn text-xs">Save</button>
          <button @click="editing = false" class="btn-secondary text-xs">Cancel</button>
        </div>
      </div>

      <div v-if="showBreakOptions" class="space-y-2">
        <div v-if="habit.onBreak">
          <button @click="endBreak" class="btn text-xs">End Break Now</button>
        </div>
        <div v-else class="flex gap-2">
          <button @click="startBreak(7)" class="btn-secondary text-xs">1 week</button>
          <button @click="startBreak(14)" class="btn-secondary text-xs">2 weeks</button>
          <button @click="startBreak(30)" class="btn-secondary text-xs">1 month</button>
          <button @click="startBreak(90)" class="btn-secondary text-xs">3 months</button>
        </div>
      </div>

      <div v-if="showFinishForm" class="space-y-2">
        <textarea v-model="finishNote" class="input" placeholder="Note about finishing this habit..." rows="3"></textarea>
        <div class="flex gap-2">
          <button @click="finishHabit" class="btn text-xs">Finish</button>
          <button @click="showFinishForm = false" class="btn-secondary text-xs">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="logs.length" class="card">
      <h3 class="text-sm font-medium text-gray-400 mb-3">Recent Logs</h3>
      <div class="space-y-1">
        <div v-for="log in logs" :key="log.id" class="flex items-center justify-between text-sm py-1">
          <span class="text-gray-400">{{ formatDate(log.date || log.createdAt) }}</span>
          <span :class="log.status === 'done' || log.completed ? 'text-emerald-400' : 'text-gray-500'">{{ log.status || (log.completed ? 'done' : 'missed') }}</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="confirmDelete = false">
        <div class="card w-full max-w-sm mx-4 space-y-3">
          <h3 class="font-semibold">Delete Habit</h3>
          <p class="text-sm text-gray-400">Are you sure? This cannot be undone.</p>
          <div class="flex gap-2">
            <button @click="deleteHabit(false)" class="btn-danger text-xs">Delete</button>
            <button @click="deleteHabit(true)" class="btn-secondary text-xs">Delete with History</button>
            <button @click="confirmDelete = false" class="btn-ghost text-xs">Cancel</button>
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
import { ArrowLeft } from 'lucide-vue-next'
import RecurrenceBuilder from '../components/RecurrenceBuilder.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const habit = ref({})
const logs = ref([])
const editing = ref(false)
const showBreakOptions = ref(false)
const showFinishForm = ref(false)
const finishNote = ref('')
const confirmDelete = ref(false)
const editForm = reactive({ title: '', description: '', recurrence: { type: 'daily' }, verificationType: 'none' })

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
  } catch { toast.error('Failed to load habit') }
}

async function saveEdit() {
  try {
    await api.put(`/habits/${route.params.id}`, editForm)
    editing.value = false
    toast.success('Habit updated')
    loadHabit()
  } catch { toast.error('Failed') }
}

async function startBreak(days) {
  try {
    await api.post(`/habits/${route.params.id}/break/start`, { days })
    toast.success('Break started')
    loadHabit()
  } catch { toast.error('Failed') }
}

async function endBreak() {
  try {
    await api.post(`/habits/${route.params.id}/break/end`)
    toast.success('Break ended')
    loadHabit()
  } catch { toast.error('Failed') }
}

async function finishHabit() {
  try {
    await api.post(`/habits/${route.params.id}/finish`, { note: finishNote.value })
    toast.success('Habit finished')
    router.push('/dashboard')
  } catch { toast.error('Failed') }
}

async function deleteHabit(withHistory) {
  try {
    await api.delete(`/habits/${route.params.id}`, { data: { withHistory } })
    toast.success('Habit deleted')
    router.push('/dashboard')
  } catch { toast.error('Failed') }
}

function formatRecurrence(r) {
  if (!r) return 'Daily'
  if (r.type === 'daily') return 'Daily'
  if (r.type === 'weekdays') return 'Weekdays'
  if (r.type === 'weekends') return 'Weekends'
  if (r.type === 'weekly') return `Weekly (${(r.days || []).map(d => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).join(', ')})`
  if (r.type === 'interval') return `Every ${r.intervalDays} days`
  return r.type
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(loadHabit)
</script>
