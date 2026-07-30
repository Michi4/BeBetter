<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60" @click.self="$emit('close')">
      <div class="card w-full max-w-md mx-0 sm:mx-4 max-h-[85vh] overflow-y-auto rounded-b-none sm:rounded-xl safe-bottom">
        <!-- Tabs -->
        <div class="flex gap-1 p-1 bg-gray-800/50 rounded-xl mb-4">
          <button @click="mode = 'task'" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="mode === 'task' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'">
            <div class="flex items-center justify-center gap-2">
              <ListTodo :size="16" />
              Task
            </div>
          </button>
          <button @click="mode = 'habit'" class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="mode === 'habit' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'">
            <div class="flex items-center justify-center gap-2">
              <Target :size="16" />
              Habit
            </div>
          </button>
        </div>

        <!-- Task form -->
        <div v-if="mode === 'task'" class="space-y-4">
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">What do you need to do?</label>
            <input ref="taskInput" v-model="taskForm.title" @keydown.enter="createTask"
              class="input" placeholder="Task title" autofocus />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">Description (optional)</label>
            <textarea v-model="taskForm.description" class="input min-h-[60px]" placeholder="Add details..." rows="2"></textarea>
          </div>
          <div class="flex items-center gap-3">
            <input v-model="taskForm.emoji" class="input w-16 text-center text-lg" placeholder="📝" maxlength="2" />
            <div class="flex-1">
              <label class="text-xs font-medium text-gray-400 mb-1 block">Due date (optional)</label>
              <input v-model="taskForm.dueDate" type="date" class="input text-sm" />
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="switchToHabit" class="btn-secondary flex-1 text-xs">
              <ArrowRightLeft :size="14" /> Convert to Habit
            </button>
          </div>
          <button @click="createTask" class="btn w-full" :disabled="!taskForm.title.trim()">
            <Plus :size="16" /> Create Task
          </button>
        </div>

        <!-- Habit form -->
        <div v-if="mode === 'habit'" class="space-y-4">
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">What habit do you want to build?</label>
            <input ref="habitInput" v-model="habitForm.title"
              class="input" placeholder="Habit title" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">Description (optional)</label>
            <textarea v-model="habitForm.description" class="input min-h-[60px]" placeholder="Why is this important?" rows="2"></textarea>
          </div>
          <div class="flex items-center gap-3">
            <input v-model="habitForm.emoji" class="input w-16 text-center text-lg" placeholder="🎯" maxlength="2" />
            <div class="flex-1 text-xs text-gray-500">
              Pick an emoji to represent this habit
            </div>
          </div>

          <!-- Schedule -->
          <div>
            <label class="text-xs font-medium text-gray-400 mb-2 block">Schedule</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="p in schedulePresets" :key="p.value" type="button" @click="selectSchedule(p)"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="scheduleType === p.value ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
                {{ p.label }}
              </button>
            </div>
            <div v-if="scheduleType === 'weekly'" class="flex gap-2 mt-2">
              <button v-for="(day, i) in weekDays" :key="i" type="button" @click="toggleDay(i)"
                class="w-9 h-9 rounded-full text-xs font-medium transition-colors min-h-[36px]"
                :class="habitForm.schedule.includes(i) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
                {{ day }}
              </button>
            </div>
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
            <div>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <button type="button" @click="habitForm.makePublic = !habitForm.makePublic"
                  class="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  :class="habitForm.makePublic ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-600'">
                  <Check :size="12" :stroke-width="3" />
                </button>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-gray-300">Publish as public preset</div>
                  <div class="text-[10px] text-gray-500">Others can discover and use this habit template</div>
                </div>
                <Globe :size="16" class="text-gray-600 shrink-0" />
              </div>
            </div>
          </div>

          <button @click="createHabit" class="btn w-full" :disabled="!habitForm.title.trim()">
            <Target :size="16" /> Create Habit
          </button>
        </div>

        <!-- Close button -->
        <button @click="$emit('close')" class="absolute top-3 right-3 text-gray-400 hover:text-gray-200 transition-colors">
          <X :size="18" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, nextTick, watch } from 'vue'
import { Plus, X, ListTodo, Target, ChevronDown, Shield, Camera, Check, Globe, ArrowRightLeft } from 'lucide-vue-next'

const props = defineProps({
  show: Boolean,
  initialMode: { type: String, default: 'task' },
})

const emit = defineEmits(['close', 'created', 'convertToHabit'])

const mode = ref(props.initialMode)
const showAdvanced = ref(false)

const taskForm = reactive({ title: '', description: '', emoji: '📝', dueDate: '' })
const habitForm = reactive({
  title: '', description: '', emoji: '🎯',
  schedule: [1, 2, 3, 4, 5, 6, 7],
  verificationType: 'honor', makePublic: false,
})

const scheduleType = ref('daily')
const schedulePresets = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Custom', value: 'weekly' },
]
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

watch(() => props.show, (val) => {
  if (val) {
    mode.value = props.initialMode
    showAdvanced.value = false
    taskForm.title = ''
    taskForm.description = ''
    taskForm.emoji = '📝'
    taskForm.dueDate = ''
    habitForm.title = ''
    habitForm.description = ''
    habitForm.emoji = '🎯'
    habitForm.schedule = [1, 2, 3, 4, 5, 6, 7]
    habitForm.verificationType = 'honor'
    habitForm.makePublic = false
    scheduleType.value = 'daily'
    nextTick(() => {
      if (mode.value === 'task') {
        document.querySelector('[ref="taskInput"]')?.focus()
      }
    })
  }
})

function selectSchedule(p) {
  scheduleType.value = p.value
  if (p.value === 'daily') habitForm.schedule = [1, 2, 3, 4, 5, 6, 7]
  else if (p.value === 'weekdays') habitForm.schedule = [1, 2, 3, 4, 5]
  else if (p.value === 'weekends') habitForm.schedule = [0, 6]
  else habitForm.schedule = []
}

function toggleDay(i) {
  const idx = habitForm.schedule.indexOf(i)
  if (idx >= 0) habitForm.schedule.splice(idx, 1)
  else habitForm.schedule.push(i)
}

function createTask() {
  if (!taskForm.title.trim()) return
  emit('created', 'task', { ...taskForm })
}

function createHabit() {
  if (!habitForm.title.trim()) return
  emit('created', 'habit', { ...habitForm })
}

function switchToHabit() {
  habitForm.title = taskForm.title
  habitForm.description = taskForm.description
  mode.value = 'habit'
}
</script>
