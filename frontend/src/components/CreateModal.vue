<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="$emit('close')" @keydown.escape="$emit('close')" ref="modalEl" tabindex="-1">
      <div class="card w-full max-w-md mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto rounded-b-2xl sm:rounded-2xl safe-bottom relative" style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 24px)" @click.stop>
        <button @click="$emit('close')" class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-700/50 hover:bg-gray-600/60 flex items-center justify-center text-gray-400 hover:text-white transition-all">
          <X :size="16" :stroke-width="2.5" />
        </button>

        <h3 class="text-lg font-bold mb-4 pr-10">Create New</h3>

        <div class="flex gap-1 p-1 bg-gray-800/50 rounded-xl mb-5">
          <button @click="switchMode('task')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="mode === 'task' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'">
            <div class="flex items-center justify-center gap-2">
              <ListTodo :size="16" />
              Task
            </div>
          </button>
          <button @click="switchMode('habit')" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="mode === 'habit' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'">
            <div class="flex items-center justify-center gap-2">
              <Target :size="16" />
              Habit
            </div>
          </button>
        </div>

        <!-- Task form -->
        <div v-if="mode === 'task'" class="space-y-4">
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1.5 block">What do you need to do?</label>
            <input ref="taskInput" v-model="taskForm.title" @keydown.enter="createTask"
              class="input" placeholder="Task title" autofocus />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1.5 block">Description (optional)</label>
            <textarea v-model="taskForm.description" class="input min-h-[60px]" placeholder="Add details..." rows="2"></textarea>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1.5 block">Due date &amp; time (optional)</label>
            <input v-model="taskForm.dueDate" type="datetime-local" class="input text-sm" />
          </div>

          <!-- Set time toggle for tasks -->
          <div>
            <button type="button" @click="taskForm.setScheduledTime = !taskForm.setScheduledTime"
              class="flex items-center gap-2 text-xs transition-colors"
              :class="taskForm.setScheduledTime ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'">
              <Clock :size="14" />
              {{ taskForm.setScheduledTime ? 'Scheduled for ' + (taskForm.scheduledTime ? formatTime(taskForm.scheduledTime) : 'selected time') : 'Set a time' }}
            </button>
            <p v-if="taskForm.setScheduledTime" class="text-[10px] text-gray-600 mt-1">One-time only — you'll be reminded this once, not every week.</p>
          </div>
          <div v-if="taskForm.setScheduledTime" class="space-y-2 pl-5 border-l-2 border-gray-700">
            <TimeInput v-model="taskForm.scheduledTime" class="flex-1" />
            <div>
              <label class="text-[10px] text-gray-500 mb-1 block">Reminders</label>
              <div v-if="taskForm.reminderMinutes && taskForm.reminderMinutes.length" class="flex flex-wrap gap-1 mb-1.5">
                <span v-for="(m, i) in taskForm.reminderMinutes" :key="i"
                  class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                  {{ m === 0 ? 'At time' : m + 'm' }}
                  <button @click="removeTaskReminder(i)" class="hover:text-red-400"><X :size="8" /></button>
                </span>
              </div>
              <div class="flex flex-wrap gap-1">
                <button v-for="p in reminderPresets" :key="p.value" type="button" @click="addTaskReminder(p.value)"
                  class="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                  :class="isTaskReminderActive(p.value) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
                  {{ p.label }}
                </button>
                <input v-model="customTaskReminderInput" type="number" min="1" max="1440" placeholder="Custom"
                  class="input text-[10px] w-16" @keydown.enter="addCustomTaskReminder" />
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-1">
            <button @click="switchToHabit" class="btn-secondary flex-1 text-xs">
              <ArrowRightLeft :size="14" /> Convert to Habit
            </button>
          </div>
          <div class="pt-2">
            <button @click="createTask" class="btn w-full" :disabled="!taskForm.title.trim()">
              <Plus :size="16" /> Create Task
            </button>
          </div>
        </div>

        <!-- Habit form -->
        <div v-if="mode === 'habit'" class="space-y-4">
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1.5 block">What habit do you want to build?</label>
            <input ref="habitInput" v-model="habitForm.title"
              class="input" placeholder="Habit title" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1.5 block">Description (optional)</label>
            <textarea v-model="habitForm.description" class="input min-h-[60px]" placeholder="Why is this important?" rows="2"></textarea>
          </div>
          <div class="flex items-center gap-3">
            <input v-model="habitForm.emoji" class="input w-16 text-center text-lg" placeholder="🎯" maxlength="2" />
            <div class="flex-1 text-xs text-gray-500">
              Pick an emoji to represent this habit
            </div>
          </div>

          <!-- Schedule (new schedules format) -->
          <div>
            <RecurrenceBuilder v-model="habitForm.schedules" />
          </div>

          <!-- Advanced -->
          <div>
            <button type="button" @click="showAdvanced = !showAdvanced"
              class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              <ChevronDown :size="14" class="transition-transform duration-200" :class="showAdvanced ? 'rotate-180' : ''" />
              {{ showAdvanced ? 'Hide advanced' : 'Show advanced' }}
            </button>
          </div>

          <div v-if="showAdvanced" class="space-y-3 pt-2 border-t border-gray-800">
            <div>
              <label class="text-xs font-medium text-gray-400 mb-1 block">Verification</label>
              <div class="flex gap-2">
                <button type="button" @click="habitForm.verificationType = 'honor'"
                  class="flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                  :class="habitForm.verificationType === 'honor' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
                  <div class="flex items-center justify-center gap-1.5"><Shield :size="14" /> Honor</div>
                </button>
                <button type="button" @click="habitForm.verificationType = 'photo'"
                  class="flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                  :class="habitForm.verificationType === 'photo' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
                  <div class="flex items-center justify-center gap-1.5"><Camera :size="14" /> Photo</div>
                </button>
              </div>
            </div>

            <!-- Reminder -->
            <div>
              <label class="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Bell :size="12" /> Reminders
              </label>
              <div v-if="habitForm.reminderMinutes && habitForm.reminderMinutes.length" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(m, i) in habitForm.reminderMinutes" :key="i"
                  class="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                  {{ m === 0 ? 'At time' : m + 'm before' }}
                  <button @click="removeHabitReminder(i)" class="hover:text-red-400"><X :size="10" /></button>
                </span>
              </div>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <button v-for="p in reminderPresets" :key="p.value" type="button" @click="addHabitReminder(p.value)"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                  :class="isHabitReminderActive(p.value) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
                  {{ p.label }}
                </button>
              </div>
              <div class="flex gap-1.5">
                <input v-model="customReminderInput" type="number" min="1" max="1440" placeholder="Custom"
                  class="input text-xs flex-1" @keydown.enter="addCustomHabitReminder" />
                <button type="button" @click="addCustomHabitReminder" class="btn-secondary text-xs px-3"
                  :disabled="!customReminderInput || customReminderInput < 1">
                  <Plus :size="12" />
                </button>
              </div>
              <p class="text-[10px] text-gray-600 mt-1">Add multiple reminders. Last custom value is remembered.</p>
            </div>

            <!-- Publish as preset -->
            <button type="button" @click="habitForm.makePublic = !habitForm.makePublic"
              class="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left"
              :class="habitForm.makePublic ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'">
              <div class="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                :class="habitForm.makePublic ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-600'">
                <Check v-if="habitForm.makePublic" :size="12" :stroke-width="3" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium" :class="habitForm.makePublic ? 'text-emerald-300' : 'text-gray-300'">Publish as public preset</div>
                <div class="text-[10px] text-gray-500">Others can discover and use this habit template</div>
              </div>
              <Globe :size="16" :class="habitForm.makePublic ? 'text-emerald-400' : 'text-gray-600'" class="shrink-0" />
            </button>

            <!-- Accountability buddies -->
            <div class="space-y-2">
              <label class="text-xs font-medium text-gray-400 block">Accountability Buddies</label>
              <div v-if="selectedBuddies.length" class="flex flex-wrap gap-2">
                <span v-for="b in selectedBuddies" :key="b.id"
                  class="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                  {{ b.username }}
                  <button @click="removeBuddy(b)" class="ml-1 hover:text-red-400"><X :size="10" /></button>
                </span>
              </div>
              <input v-model="buddySearch" @input="searchBuddies" class="input text-xs" placeholder="Search friends to add as buddies..." />
              <div v-if="buddyResults.length" class="space-y-1">
                <button v-for="f in buddyResults" :key="f.id" @click="addBuddy(f)"
                  class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left">
                  <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold">
                    {{ (f.username || 'U')[0].toUpperCase() }}
                  </div>
                  <span class="text-sm">@{{ f.username }}</span>
                </button>
              </div>
            </div>

            <!-- Challenge invite friends -->
            <div class="space-y-2">
              <label class="text-xs font-medium text-gray-400 block">Challenge Friends</label>
              <div v-if="selectedChallengers.length" class="flex flex-wrap gap-2">
                <span v-for="c in selectedChallengers" :key="c.id"
                  class="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                  {{ c.username }}
                  <button @click="removeChallenger(c)" class="ml-1 hover:text-red-400"><X :size="10" /></button>
                </span>
              </div>
              <input v-model="challengerSearch" @input="searchChallengers" class="input text-xs" placeholder="Search friends to challenge..." />
              <div v-if="challengerResults.length" class="space-y-1">
                <button v-for="f in challengerResults" :key="f.id" @click="addChallenger(f)"
                  class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left">
                  <div class="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-[10px] font-bold">
                    {{ (f.username || 'U')[0].toUpperCase() }}
                  </div>
                  <span class="text-sm">@{{ f.username }}</span>
                </button>
              </div>
              <div v-if="selectedChallengers.length" class="mt-2">
                <label class="text-xs font-medium text-gray-400 mb-1 block">Challenge end date (optional)</label>
                <input v-model="challengeEndDate" type="date" class="input text-xs" />
              </div>
            </div>
          </div>

          <div class="pt-2">
            <button @click="createHabit" class="btn w-full" :disabled="!habitForm.title.trim()">
              <Target :size="16" /> Create Habit
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, nextTick, watch } from 'vue'
import { Plus, X, ListTodo, Target, ChevronDown, Shield, Camera, Check, Globe, ArrowRightLeft, Clock, Bell } from 'lucide-vue-next'
import api from '../api'
import RecurrenceBuilder from './RecurrenceBuilder.vue'
import TimeInput from './TimeInput.vue'
import { formatTime } from '../utils/timeFormat'

const props = defineProps({
  show: Boolean,
  initialMode: { type: String, default: 'task' },
  convertData: { type: Object, default: null },
})

const emit = defineEmits(['close', 'created', 'convertToHabit'])

const modalEl = ref(null)
const mode = ref(props.initialMode)
const showAdvanced = ref(false)

const reminderPresets = [
  { label: 'At time', value: 0 },
  { label: '5m', value: 5 },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
]

const customReminderInput = ref('')
const customTaskReminderInput = ref('')

const taskForm = reactive({
  title: '', description: '', dueDate: '',
  setScheduledTime: false, scheduledTime: '', scheduledDays: [1, 2, 3, 4, 5], reminderMinutes: [],
})
const habitForm = reactive({
  title: '', description: '', emoji: '🎯',
  schedules: [{ time: null, days: [0, 1, 2, 3, 4, 5, 6] }],
  verificationType: 'honor', makePublic: false, reminderMinutes: [],
})

function switchMode(next) {
  if (next === mode.value) return
  if (next === 'task') {
    taskForm.title = habitForm.title
    taskForm.description = habitForm.description
    taskForm.reminderMinutes = [...habitForm.reminderMinutes]
  } else {
    habitForm.title = taskForm.title
    habitForm.description = taskForm.description
    habitForm.reminderMinutes = [...taskForm.reminderMinutes]
  }
  mode.value = next
}

const selectedBuddies = ref([])
const buddySearch = ref('')
const buddyResults = ref([])
const selectedChallengers = ref([])
const challengerSearch = ref('')
const challengerResults = ref([])
const challengeEndDate = ref('')

watch(() => props.show, (val) => {
  if (val) {
    mode.value = props.initialMode
    showAdvanced.value = false
    taskForm.title = ''
    taskForm.description = ''
    taskForm.dueDate = ''
    taskForm.setScheduledTime = false
    taskForm.scheduledTime = ''
    taskForm.scheduledDays = [1, 2, 3, 4, 5]
    taskForm.reminderMinutes = []
    habitForm.title = ''
    habitForm.description = ''
    habitForm.emoji = '🎯'
    habitForm.schedules = [{ time: null, days: [0, 1, 2, 3, 4, 5, 6] }]
    habitForm.verificationType = 'honor'
    habitForm.makePublic = false
    habitForm.reminderMinutes = []
    selectedBuddies.value = []
    buddySearch.value = ''
    buddyResults.value = []
    selectedChallengers.value = []
    challengerSearch.value = ''
    challengerResults.value = []
    challengeEndDate.value = ''
    const lastReminder = localStorage.getItem('bebetter_lastReminder')
    customReminderInput.value = lastReminder || ''
    customTaskReminderInput.value = lastReminder || ''
    if (props.convertData) {
      mode.value = 'habit'
      habitForm.title = props.convertData.title || ''
      habitForm.description = props.convertData.description || ''
    }
    nextTick(() => {
      modalEl.value?.focus()
    })
  }
})

let buddyTimeout = null
function searchBuddies() {
  clearTimeout(buddyTimeout)
  if (buddySearch.value.length < 2) { buddyResults.value = []; return }
  buddyTimeout = setTimeout(async () => {
    try {
      const res = await api.get('/friends/list')
      const allFriends = res.data.friends || []
      const query = buddySearch.value.toLowerCase()
      const existingIds = new Set(selectedBuddies.value.map(b => b.id))
      buddyResults.value = allFriends
        .filter(f => !existingIds.has(f.id) && f.username?.toLowerCase().includes(query))
        .slice(0, 5)
    } catch { buddyResults.value = [] }
  }, 300)
}

function addBuddy(friend) {
  selectedBuddies.value.push(friend)
  buddySearch.value = ''
  buddyResults.value = []
}

function removeBuddy(friend) {
  selectedBuddies.value = selectedBuddies.value.filter(b => b.id !== friend.id)
}

let challengerTimeout = null
function searchChallengers() {
  clearTimeout(challengerTimeout)
  if (challengerSearch.value.length < 2) { challengerResults.value = []; return }
  challengerTimeout = setTimeout(async () => {
    try {
      const res = await api.get('/friends/list')
      const allFriends = res.data.friends || []
      const query = challengerSearch.value.toLowerCase()
      const existingIds = new Set(selectedChallengers.value.map(c => c.id))
      challengerResults.value = allFriends
        .filter(f => !existingIds.has(f.id) && f.username?.toLowerCase().includes(query))
        .slice(0, 5)
    } catch { challengerResults.value = [] }
  }, 300)
}

function addChallenger(friend) {
  selectedChallengers.value.push(friend)
  challengerSearch.value = ''
  challengerResults.value = []
}

function removeChallenger(friend) {
  selectedChallengers.value = selectedChallengers.value.filter(c => c.id !== friend.id)
}

function isHabitReminderActive(val) {
  return (habitForm.reminderMinutes || []).includes(val)
}
function addHabitReminder(val) {
  if (!habitForm.reminderMinutes) habitForm.reminderMinutes = []
  if (habitForm.reminderMinutes.includes(val)) {
    habitForm.reminderMinutes = habitForm.reminderMinutes.filter(v => v !== val)
  } else {
    habitForm.reminderMinutes.push(val)
    habitForm.reminderMinutes.sort((a, b) => b - a)
  }
}
function removeHabitReminder(i) {
  habitForm.reminderMinutes.splice(i, 1)
}
function addCustomHabitReminder() {
  const val = parseInt(customReminderInput.value)
  if (!val || val < 0) return
  if (!habitForm.reminderMinutes) habitForm.reminderMinutes = []
  if (!habitForm.reminderMinutes.includes(val)) {
    habitForm.reminderMinutes.push(val)
    habitForm.reminderMinutes.sort((a, b) => b - a)
  }
  localStorage.setItem('bebetter_lastReminder', String(val))
  customReminderInput.value = ''
}

function isTaskReminderActive(val) {
  return (taskForm.reminderMinutes || []).includes(val)
}
function addTaskReminder(val) {
  if (!taskForm.reminderMinutes) taskForm.reminderMinutes = []
  if (taskForm.reminderMinutes.includes(val)) {
    taskForm.reminderMinutes = taskForm.reminderMinutes.filter(v => v !== val)
  } else {
    taskForm.reminderMinutes.push(val)
    taskForm.reminderMinutes.sort((a, b) => b - a)
  }
}
function removeTaskReminder(i) {
  taskForm.reminderMinutes.splice(i, 1)
}
function addCustomTaskReminder() {
  const val = parseInt(customTaskReminderInput.value)
  if (!val || val < 0) return
  if (!taskForm.reminderMinutes) taskForm.reminderMinutes = []
  if (!taskForm.reminderMinutes.includes(val)) {
    taskForm.reminderMinutes.push(val)
    taskForm.reminderMinutes.sort((a, b) => b - a)
  }
  localStorage.setItem('bebetter_lastReminder', String(val))
  customTaskReminderInput.value = ''
}

function createTask() {
  if (!taskForm.title.trim()) return
  const data = { ...taskForm, setScheduledTime: undefined }
  delete data.setScheduledTime
  delete data.scheduledDays
  if (!taskForm.setScheduledTime) {
    delete data.scheduledTime
    delete data.reminderMinutes
  }
  emit('created', 'task', data)
}

function createHabit() {
  if (!habitForm.title.trim()) return
  emit('created', 'habit', {
    ...habitForm,
    buddyIds: selectedBuddies.value.map(b => b.id),
    challengeFriendIds: selectedChallengers.value.map(c => c.id),
    challengeEndDate: challengeEndDate.value || undefined,
  })
}

function switchToHabit() {
  habitForm.title = taskForm.title
  habitForm.description = taskForm.description
  mode.value = 'habit'
}
</script>
