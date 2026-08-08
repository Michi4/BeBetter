<template>
  <div>
    <!-- Edit mode -->
    <div v-if="editing" class="rounded-xl border border-emerald-500/30 bg-gray-800/80 p-4 space-y-3">
      <input v-model="editForm.title" class="input" placeholder="Title" ref="titleInput" />
      <textarea v-model="editForm.description" class="input min-h-[60px]" placeholder="Description" rows="2"></textarea>
      <input v-model="editForm.dueDate" type="datetime-local" class="input text-sm" />
      <div>
        <button type="button" @click="editForm.setScheduledTime = !editForm.setScheduledTime"
          class="flex items-center gap-2 text-xs transition-colors"
          :class="editForm.setScheduledTime ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'">
          <Clock :size="14" />
          {{ editForm.setScheduledTime ? 'Scheduled for ' + (editForm.scheduledTime ? formatTime(editForm.scheduledTime) : 'selected time') : 'Set a time' }}
        </button>
      </div>
      <div v-if="editForm.setScheduledTime" class="space-y-2 pl-4 border-l-2 border-gray-700">
        <TimeInput v-model="editForm.scheduledTime" class="flex-1" />
        <div>
          <label class="text-[10px] text-gray-500 mb-1 block">Reminders</label>
          <div v-if="editForm.reminderMinutes.length" class="flex flex-wrap gap-1 mb-1.5">
            <span v-for="(m, i) in editForm.reminderMinutes" :key="i"
              class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
              {{ m === 0 ? 'At time' : m + 'm' }}
              <button @click="editForm.reminderMinutes.splice(i, 1)" class="hover:text-red-400"><X :size="8" /></button>
            </span>
          </div>
          <div class="flex flex-wrap gap-1">
            <button v-for="p in reminderPresets" :key="p.value" type="button" @click="toggleReminder(p.value)"
              class="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
              :class="isReminderActive(p.value) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
              {{ p.label }}
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 pt-1">
        <button @click="saveEdit" class="btn flex-1 text-xs">Save</button>
        <button @click="cancelEdit" class="btn-secondary flex-1 text-xs">Cancel</button>
        <button @click="$emit('delete', task)" class="btn-secondary flex-1 text-xs !text-red-400 hover:!text-red-300">
          <Trash2 :size="14" /> Delete
        </button>
      </div>
      <button @click="convertToHabit" class="btn-secondary w-full text-xs">
        <ArrowRightLeft :size="14" /> Convert to Habit
      </button>
    </div>

    <!-- Normal mode -->
    <div v-else class="flex items-center gap-3 group" @contextmenu.prevent="showContextMenu" @touchstart="startLongPress" @touchend="cancelLongPress" @touchmove="cancelLongPress">
      <!-- Checkbox -->
      <button v-bind="completeTap" @click.stop.prevent
        class="shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all duration-200"
        :class="task.completed
          ? 'bg-emerald-500 border-emerald-500 text-white scale-110 animate-check'
          : 'border-gray-600 hover:border-emerald-400 hover:bg-emerald-500/10 text-transparent hover:text-emerald-400/40'">
        <Check :size="16" :stroke-width="3" />
      </button>

      <!-- Body -->
      <div class="flex-1 min-w-0 cursor-pointer" @click="startEdit">
        <div class="flex items-center gap-2">
          <h4 class="font-medium text-sm truncate" :class="task.completed ? 'text-gray-400 line-through' : ''">{{ task.title }}</h4>
          <span v-if="task.scheduledTime" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium shrink-0">
            {{ formatTime(task.scheduledTime) }}
          </span>
          <span v-if="task.scheduledDays?.length" class="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 shrink-0">
            {{ formatDays(task.scheduledDays) }}
          </span>
          <span v-if="task.dueDate" class="text-[10px] px-1.5 py-0.5 rounded shrink-0"
            :class="dueDateClass">{{ dueDateLabel }}</span>
        </div>
        <p v-if="task.description && !task.completed" class="text-xs text-gray-500 mt-0.5 truncate">{{ task.description }}</p>
      </div>

      <!-- Context menu -->
      <Teleport to="body">
        <div v-if="showMenu" class="fixed inset-0 z-50" @click="showMenu = false">
          <div class="absolute bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[180px] py-1"
            :style="menuPos">
            <button @click.stop="startEdit(); showMenu = false"
              class="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition-colors">
              <Pencil :size="14" /> Edit
            </button>
            <button @click.stop="$emit('convert', task); showMenu = false"
              class="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition-colors">
              <ArrowRightLeft :size="14" /> Convert to Habit
            </button>
            <button @click.stop="$emit('delete', task); showMenu = false"
              class="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
              <Trash2 :size="14" /> Delete
            </button>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { Check, X, Pencil, ArrowRightLeft, Trash2, Clock } from 'lucide-vue-next'
import { formatTime } from '../utils/timeFormat'
import TimeInput from './TimeInput.vue'
import { useTap } from '../utils/tapTrigger'

const props = defineProps({ task: { type: Object, required: true } })
const emit = defineEmits(['complete', 'delete', 'edit', 'convert'])

const showMenu = ref(false)
const menuPos = ref({ top: '50%', left: '50%' })
const editing = ref(false)
const titleInput = ref(null)
const editForm = reactive({ title: '', description: '', dueDate: '', setScheduledTime: false, scheduledTime: '', reminderMinutes: [] })
let longPressTimer = null

const completeTap = useTap(() => emit('complete', props.task))

const dayAbbr = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const reminderPresets = [
  { label: 'At time', value: 0 },
  { label: '5m', value: 5 },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
]

function formatDays(days) {
  if (typeof days === 'string') {
    try { days = JSON.parse(days) } catch { return '' }
  }
  if (!Array.isArray(days) || !days.length) return ''
  if (days.length === 7) return 'Daily'
  if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'
  return days.map(d => dayAbbr[d]).join(' ')
}

function showContextMenu(e) {
  menuPos.value = { top: e.clientY + 'px', left: Math.min(e.clientX, window.innerWidth - 200) + 'px' }
  showMenu.value = true
}

function startLongPress(e) {
  longPressTimer = setTimeout(() => {
    const touch = e.touches[0]
    menuPos.value = { top: touch.clientY + 'px', left: Math.min(touch.clientX, window.innerWidth - 200) + 'px' }
    showMenu.value = true
  }, 500)
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}

function startEdit() {
  editForm.title = props.task.title
  editForm.description = props.task.description || ''
  editForm.dueDate = props.task.dueDate ? toLocalDateTime(props.task.dueDate) : ''
  editForm.scheduledTime = props.task.scheduledTime || ''
  editForm.setScheduledTime = !!props.task.scheduledTime
  editForm.reminderMinutes = Array.isArray(props.task.reminderMinutes) ? [...props.task.reminderMinutes] : []
  editing.value = true
  nextTick(() => titleInput.value?.focus())
}

function toLocalDateTime(iso) {
  const d = new Date(iso)
  const s = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${s(d.getMonth() + 1)}-${s(d.getDate())}T${s(d.getHours())}:${s(d.getMinutes())}`
}

function cancelEdit() {
  editing.value = false
}

function toggleReminder(val) {
  const i = editForm.reminderMinutes.indexOf(val)
  if (i >= 0) editForm.reminderMinutes.splice(i, 1)
  else {
    editForm.reminderMinutes.push(val)
    editForm.reminderMinutes.sort((a, b) => b - a)
  }
}

function isReminderActive(val) {
  return editForm.reminderMinutes.includes(val)
}

function saveEdit() {
  if (!editForm.title.trim()) return
  const payload = {
    ...props.task,
    title: editForm.title,
    description: editForm.description,
    dueDate: editForm.dueDate || null,
  }
  if (editForm.setScheduledTime && editForm.scheduledTime) {
    payload.scheduledTime = editForm.scheduledTime
    payload.reminderMinutes = editForm.reminderMinutes.length ? editForm.reminderMinutes : undefined
  } else {
    payload.scheduledTime = null
    payload.reminderMinutes = undefined
  }
  emit('edit', payload)
  editing.value = false
}

function convertToHabit() {
  editing.value = false
  emit('convert', props.task)
}

const dueDateClass = computed(() => {
  if (!props.task.dueDate) return ''
  const d = new Date(props.task.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (d < today) return 'bg-red-500/10 text-red-400'
  if (d.toDateString() === today.toDateString()) return 'bg-emerald-500/10 text-emerald-400'
  return 'bg-gray-700/50 text-gray-400'
})

const dueDateLabel = computed(() => {
  if (!props.task.dueDate) return ''
  const d = new Date(props.task.dueDate)
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d - today) / 86400000)
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  const timePart = hasTime ? ` ${formatTime(`${d.getHours()}`.padStart(2, '0') + ':' + `${d.getMinutes()}`.padStart(2, '0'))}` : ''
  const overdue = d < now
  let base
  if (diff < 0) base = `${Math.abs(diff)}d overdue`
  else if (diff === 0) base = 'Today'
  else if (diff === 1) base = 'Tomorrow'
  else base = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (overdue && diff === 0 && hasTime) base = 'Overdue'
  return base + timePart
})
</script>
