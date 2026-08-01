<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold truncate">{{ habit.emoji || '' }} {{ habit.title }}</h1>
    </div>

    <div v-if="!editing" class="space-y-3">
      <div class="card space-y-4">
        <p v-if="habit.description" class="text-sm text-gray-400 leading-relaxed">{{ habit.description }}</p>

        <!-- Schedule info -->
        <div v-if="habit.schedules?.length" class="space-y-2">
          <div class="text-xs font-medium text-gray-400 flex items-center gap-1.5">
            <Clock :size="12" /> Schedule
          </div>
          <div class="flex flex-wrap gap-2">
            <div v-for="(s, si) in habit.schedules" :key="si"
              class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700">
              <span v-if="s.time" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                {{ formatTime(s.time) }}
              </span>
              <span v-else class="text-[10px] text-gray-500">Any time</span>
              <span class="text-[10px] text-gray-500">{{ formatScheduleDays(s.days) }}</span>
            </div>
          </div>
        </div>

        <!-- Reminder info -->
        <div v-if="habit.reminderMinutes != null && (Array.isArray(habit.reminderMinutes) ? habit.reminderMinutes.length : true)" class="flex items-center gap-2 text-xs text-gray-400">
          <Bell :size="12" class="text-emerald-400" />
          <span>{{ Array.isArray(habit.reminderMinutes) && habit.reminderMinutes.length > 1 ? 'Reminders' : 'Reminder' }}: {{ formatReminder(habit.reminderMinutes) }}</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="text-center p-2 rounded-lg bg-gray-800/50">
            <div class="text-lg font-bold text-emerald-400">{{ habit._count?.logs || logs.length || habit.totalCompletions || 0 }}</div>
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
            <div class="text-[10px] text-gray-500">Recurrence</div>
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

      <!-- Challenge Friends -->
      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <p class="section-title">Challenge Friends</p>
          <button @click="showChallengeForm = !showChallengeForm" class="text-xs text-emerald-400 hover:text-emerald-300">
            {{ showChallengeForm ? 'Cancel' : '+ Challenge' }}
          </button>
        </div>

        <!-- Active challenges for this habit -->
        <div v-if="activeChallenges.length" class="space-y-2">
          <router-link v-for="c in activeChallenges" :key="c.id" :to="`/challenges/${c.id}`"
            class="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              :class="c.creatorId === auth.user?.id ? 'bg-amber-600' : 'bg-emerald-600'">
              {{ (c.opponent?.username || c.creator?.username || '?')[0].toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate">
                vs {{ c.creatorId === auth.user?.id ? c.opponent?.username : c.creator?.username }}
              </p>
              <p class="text-[10px] text-gray-500">{{ c.creatorProgress || 0 }} - {{ c.opponentProgress || 0 }} · {{ c.status }}</p>
            </div>
            <ChevronRight :size="14" class="text-gray-600 shrink-0" />
          </router-link>
        </div>

        <!-- Share invite link -->
        <div v-if="showChallengeForm" class="space-y-3 pt-2 border-t border-gray-800">
          <div>
            <label class="text-xs font-medium text-gray-400 mb-2 block">Challenge a friend</label>
            <input v-model="challengeSearch" @input="searchChallengers" class="input text-xs" placeholder="Search friends..." />
            <div v-if="challengeResults.length" class="space-y-1 mt-2">
              <button v-for="f in challengeResults" :key="f.id" @click="challengeFriend(f)"
                class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left">
                <div class="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-[10px] font-bold">
                  {{ (f.username || 'U')[0].toUpperCase() }}
                </div>
                <span class="text-sm">@{{ f.username }}</span>
                <span class="ml-auto text-[10px] text-amber-400">Challenge</span>
              </button>
            </div>
          </div>

          <div class="border-t border-gray-800 pt-3">
            <label class="text-xs font-medium text-gray-400 mb-2 block">Or share a link — anyone can join</label>
            <div v-if="inviteLink" class="flex gap-2">
              <input :value="inviteLink" readonly class="input text-xs flex-1" />
              <button @click="copyInviteLink" class="btn text-xs whitespace-nowrap">
                <Copy :size="12" /> {{ copied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
            <button v-else @click="generateInviteLink" class="btn-secondary w-full text-xs" :disabled="generatingLink">
              <Loader2 v-if="generatingLink" :size="14" class="animate-spin" />
              <Link v-else :size="14" />
              {{ generatingLink ? 'Generating...' : 'Generate Invite Link' }}
            </button>
            <p v-if="inviteLink" class="text-[10px] text-gray-500 mt-1.5">Link expires in 30 days. Anyone with this link can accept and become your challenge opponent.</p>
          </div>
        </div>
      </div>

      <!-- Accountability Buddy -->
      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <p class="section-title">Accountability Buddies</p>
          <button @click="showBuddyForm = !showBuddyForm" class="text-xs text-emerald-400 hover:text-emerald-300">
            {{ showBuddyForm ? 'Cancel' : '+ Add' }}
          </button>
        </div>
        <div v-if="buddyProgress.length" class="space-y-2">
          <div v-for="b in buddyProgress" :key="b.buddyId" class="p-2 rounded-lg bg-gray-800/50">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
                {{ (b.friend?.username || 'U')[0].toUpperCase() }}
              </div>
              <span class="text-sm flex-1">@{{ b.friend?.username }}</span>
              <span v-if="b.completedToday" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Done today</span>
              <span v-else class="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Not yet</span>
              <button @click="removeBuddyById(b.buddyId)" class="text-[10px] text-red-400 hover:text-red-300">Remove</button>
            </div>
            <div class="flex gap-3 text-[10px] text-gray-500">
              <span>{{ b.totalLogs }} completions</span>
              <span v-if="b.currentStreak > 0" class="text-amber-400">{{ b.currentStreak }}d streak</span>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-gray-500">No accountability partners yet. Add a friend to keep you on track!</p>
        <div v-if="showBuddyForm" class="space-y-2 pt-2 border-t border-gray-800">
          <input v-model="buddySearch" @input="searchBuddies" class="input text-xs" placeholder="Search friends..." />
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
import { useAuthStore } from '../stores/auth'
import { ArrowLeft, Pencil, Save, Pause, Play, CheckCircle, Trash2, ChevronRight, Copy, Link, Loader2, Clock, Bell } from 'lucide-vue-next'
import HabitForm from '../components/HabitForm.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()

const habit = ref({})
const logs = ref([])
const editing = ref(false)
const showBreakForm = ref(false)
const showFinishForm = ref(false)
const finishNote = ref('')
const confirmDelete = ref(false)
const breakReason = ref('')
const showBuddyForm = ref(false)
const buddySearch = ref('')
const buddyResults = ref([])
const buddies = ref([])
const buddyProgress = ref([])

const showChallengeForm = ref(false)
const challengeSearch = ref('')
const challengeResults = ref([])
const activeChallenges = ref([])
const inviteLink = ref('')
const copied = ref(false)
const generatingLink = ref(false)

const activeBreak = computed(() => {
  return habit.value.breaks?.find(b => !b.endDate) || null
})

const editForm = reactive({
  title: '',
  description: '',
  emoji: '🎯',
  schedules: [{ time: null, days: [0, 1, 2, 3, 4, 5, 6] }],
  verificationType: 'honor',
  config: null,
  reminderMinutes: [],
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
    editForm.reminderMinutes = Array.isArray(habit.value.reminderMinutes) ? [...habit.value.reminderMinutes] : (habit.value.reminderMinutes != null ? [habit.value.reminderMinutes] : [])

    if (habit.value.schedules?.length) {
      editForm.schedules = habit.value.schedules.map(s => ({
        time: s.time || null,
        days: Array.isArray(s.days) ? [...s.days] : [0, 1, 2, 3, 4, 5, 6],
      }))
    } else {
      const sched = JSON.parse(typeof habit.value.daysPerWeek === 'string' ? habit.value.daysPerWeek : JSON.stringify(habit.value.daysPerWeek || '[]'))
      editForm.schedules = [{ time: null, days: Array.isArray(sched) && sched.length ? sched : [0, 1, 2, 3, 4, 5, 6] }]
    }

    logs.value = habit.value.logs || []
    buddies.value = habit.value.buddies || []
    buddyProgress.value = habit.value.buddyProgress || []

    loadChallenges()
  } catch {
    toast.error('Failed to load habit')
  }
}

async function loadChallenges() {
  try {
    const res = await api.get('/challenges')
    activeChallenges.value = (res.data.challenges || []).filter(
      c => c.habitId === route.params.id && (c.status === 'active' || c.status === 'pending')
    )
  } catch {}
}

async function saveEdit() {
  if (!editForm.title.trim()) return
  try {
    await api.put(`/habits/${route.params.id}`, {
      title: editForm.title,
      description: editForm.description,
      emoji: editForm.emoji,
      schedules: editForm.schedules,
      verificationType: editForm.verificationType,
      config: editForm.config,
      reminderMinutes: editForm.reminderMinutes.length ? editForm.reminderMinutes : null,
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
  if (h.schedules?.length) {
    const s = h.schedules[0]
    if (!s || !s.days) return 'Daily'
    const days = s.days.sort()
    const all = [0, 1, 2, 3, 4, 5, 6]
    const weekdays = [1, 2, 3, 4, 5]
    const weekends = [0, 6]
    if (JSON.stringify(days) === JSON.stringify(all)) return 'Daily'
    if (JSON.stringify(days) === JSON.stringify(weekdays)) return 'Weekdays'
    if (JSON.stringify(days) === JSON.stringify(weekends)) return 'Weekends'
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days.map(d => dayNames[d]).join(', ')
  }
  if (h.frequencyType === 'daily' || h.frequencyType === 'always') return 'Daily'
  return h.frequencyType || 'Daily'
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function formatScheduleDays(days) {
  if (!days?.length) return ''
  if (days.length === 7) return 'Every day'
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days.map(d => dayNames[d]).join(', ')
}

function formatReminder(min) {
  if (Array.isArray(min)) {
    return min.sort((a, b) => b - a).map(m => m === 0 ? 'At time' : `${m}m before`).join(', ')
  }
  if (min === 0) return 'At time'
  return `${min} min before`
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Buddy search
let buddyTimeout = null
function searchBuddies() {
  clearTimeout(buddyTimeout)
  if (buddySearch.value.length < 2) { buddyResults.value = []; return }
  buddyTimeout = setTimeout(async () => {
    try {
      const res = await api.get('/friends/list')
      const allFriends = res.data.friends || []
      const query = buddySearch.value.toLowerCase()
      const existingIds = new Set(buddyProgress.value.map(b => b.friend?.id))
      buddyResults.value = allFriends
        .filter(f => !existingIds.has(f.id) && f.username?.toLowerCase().includes(query))
        .slice(0, 5)
    } catch { buddyResults.value = [] }
  }, 300)
}

async function addBuddy(friend) {
  try {
    const res = await api.post(`/habits/${route.params.id}/buddy`, { friendId: friend.id })
    buddies.value.push(res.data.buddy)
    buddySearch.value = ''
    buddyResults.value = []
    showBuddyForm.value = false
    toast.success(`${friend.username} added as buddy`)
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to add buddy')
  }
}

async function removeBuddyById(buddyId) {
  try {
    await api.delete(`/habits/${route.params.id}/buddy/${buddyId}`)
    buddyProgress.value = buddyProgress.value.filter(b => b.buddyId !== buddyId)
    buddies.value = buddies.value.filter(b => b.id !== buddyId)
    toast.success('Buddy removed')
  } catch {
    toast.error('Failed to remove buddy')
  }
}

// Challenge search
let challengeTimeout = null
function searchChallengers() {
  clearTimeout(challengeTimeout)
  if (challengeSearch.value.length < 2) { challengeResults.value = []; return }
  challengeTimeout = setTimeout(async () => {
    try {
      const res = await api.get('/friends/list')
      const allFriends = res.data.friends || []
      const query = challengeSearch.value.toLowerCase()
      const alreadyChallenged = new Set(activeChallenges.value.map(c => c.opponentId))
      challengeResults.value = allFriends
        .filter(f => !alreadyChallenged.has(f.id) && f.id !== auth.user?.id && f.username?.toLowerCase().includes(query))
        .slice(0, 5)
    } catch { challengeResults.value = [] }
  }, 300)
}

async function challengeFriend(friend) {
  try {
    await api.post('/challenges', {
      habitId: route.params.id,
      opponentId: friend.id,
    })
    toast.success(`Challenge sent to ${friend.username}!`)
    challengeSearch.value = ''
    challengeResults.value = []
    showChallengeForm.value = false
    loadChallenges()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to create challenge')
  }
}

async function generateInviteLink() {
  generatingLink.value = true
  try {
    const res = await api.post('/challenges/invite-link', { habitId: route.params.id })
    const token = res.data.token
    const base = window.location.origin
    inviteLink.value = `${base}/challenges/invite/${token}`
  } catch (e) {
    toast.error('Failed to generate link')
  } finally {
    generatingLink.value = false
  }
}

function copyInviteLink() {
  navigator.clipboard.writeText(inviteLink.value).then(() => {
    copied.value = true
    toast.success('Link copied!')
    setTimeout(() => { copied.value = false }, 2000)
  }).catch(() => {
    toast.error('Failed to copy')
  })
}

onMounted(loadHabit)
</script>
