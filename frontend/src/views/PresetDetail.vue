<template>
  <div class="page">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 :size="24" class="animate-spin text-gray-500" />
    </div>
    <div v-else-if="notFound" class="card text-center py-12">
      <AlertCircle :size="40" class="mx-auto text-red-400 mb-4" />
      <h2 class="text-xl font-bold mb-2">Preset not found</h2>
      <p class="text-sm text-gray-400 mb-4">This preset may have been deleted or the link is invalid.</p>
      <router-link to="/presets" class="btn">Browse Presets</router-link>
    </div>
    <template v-else>
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold truncate">{{ preset.title }}</h1>
    </div>

    <div class="card space-y-4">
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span class="px-1.5 py-0.5 rounded bg-gray-800">{{ preset.category }}</span>
        <span>by {{ preset.author?.username || preset.authorName || 'Unknown' }}</span>
      </div>

      <p v-if="preset.description" class="text-sm text-gray-400 leading-relaxed">{{ preset.description }}</p>

      <div v-if="preset.verificationType" class="text-xs text-gray-500">
        <span class="text-gray-600">Verification:</span>
        <span class="text-gray-400 ml-1">{{ preset.verificationType }}</span>
      </div>

      <div class="text-xs text-gray-500">
        <span class="text-gray-600">Schedule:</span>
        <span class="text-gray-400 ml-1">{{ formatRecurrence(preset) }}</span>
      </div>

      <div class="flex items-center gap-3 text-xs text-gray-500">
        <span class="flex items-center gap-1"><Heart :size="12" /> {{ preset.likes || 0 }}</span>
        <span class="flex items-center gap-1"><GitFork :size="12" /> {{ preset.forks || 0 }}</span>
        <span class="flex items-center gap-1"><Users :size="12" /> {{ preset.usages || 0 }}</span>
      </div>

      <div class="flex flex-wrap gap-2 pt-1">
        <button @click="likePreset" class="btn flex-1 min-w-0">
          <Heart :size="14" :class="isLiked ? 'fill-current' : ''" />
          {{ isLiked ? 'Unlike' : 'Like' }}
        </button>
        <button @click="forkPreset" class="btn-secondary flex-1 min-w-0">
          <GitFork :size="14" /> Fork
        </button>
        <button @click="shareLink" class="btn-secondary shrink-0 px-3">
          <Share2 :size="14" />
        </button>
      </div>

      <div class="flex gap-2">
        <button v-if="preset.isUsing" @click="stopUsing" class="btn-danger flex-1">
          <Square :size="14" /> Stop Using
        </button>
        <button v-else @click="usePreset" class="btn flex-1">
          <Play :size="14" /> Use This
        </button>
        <button @click="showReport = true" class="btn-ghost text-red-400 text-xs shrink-0">
          <Flag :size="14" /> Report
        </button>
      </div>

      <!-- Edit/Delete for author/admin -->
      <div v-if="isAuthor" class="flex gap-2 pt-2 border-t border-gray-800">
        <button v-if="!editing" @click="startEdit" class="btn-secondary flex-1 min-w-0">
          <Pencil :size="14" /> Edit
        </button>
        <button @click="confirmDelete = true" class="btn-danger flex-1 min-w-0">
          <Trash2 :size="14" /> Delete
        </button>
      </div>

      <!-- Edit form -->
      <div v-if="editing" class="space-y-3 pt-2 border-t border-gray-800">
        <p class="section-title">Edit Preset</p>
        <input v-model="editForm.title" class="input" placeholder="Title" />
        <textarea v-model="editForm.description" class="input min-h-[80px]" placeholder="Description" rows="3"></textarea>
        <div>
          <label class="text-xs font-medium text-gray-400 mb-1 block">Category</label>
          <select v-model="editForm.category" class="input">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="flex gap-2 pt-1">
          <button @click="saveEdit" class="btn flex-1"><Save :size="14" /> Save</button>
          <button @click="editing = false" class="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="leaderboard.length" class="space-y-2">
      <p class="section-title">Leaderboard</p>
      <div class="card divide-y divide-gray-800">
        <div v-for="(entry, i) in leaderboard" :key="i" class="flex items-center gap-3 py-3">
          <span class="w-6 text-center text-sm font-medium text-gray-500">{{ i + 1 }}</span>
          <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
            {{ (entry.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ entry.username }}</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-sm font-medium text-emerald-400">{{ entry.completions || 0 }}</div>
            <div class="text-[10px] text-gray-600">uses</div>
          </div>
          <div v-if="entry.bestStreak" class="text-right shrink-0">
            <div class="text-sm font-medium text-amber-400">{{ entry.bestStreak }}d</div>
            <div class="text-[10px] text-gray-600">best</div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <!-- Report modal -->
      <div v-if="showReport" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" @click.self="showReport = false" role="dialog" aria-modal="true">
        <div class="card w-full max-w-sm mx-0 sm:mx-4 space-y-3 rounded-b-none sm:rounded-xl safe-bottom">
          <p class="section-title">Report Preset</p>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">Reason</label>
            <select v-model="reportReason" class="input">
              <option value="">Select a reason...</option>
              <option value="spam">Spam</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="misleading">Misleading</option>
              <option value="offensive">Offensive</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-400 mb-1 block">Details (optional)</label>
            <textarea v-model="reportDetails" class="input min-h-[80px]" placeholder="Provide more details..." rows="3"></textarea>
          </div>
          <div class="flex gap-2 pt-1">
            <button @click="submitReport" class="btn-danger flex-1" :disabled="!reportReason">
              <Flag :size="14" /> Submit Report
            </button>
            <button @click="showReport = false" class="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div v-if="confirmDelete" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" @click.self="confirmDelete = false" role="dialog" aria-modal="true">
        <div class="card w-full max-w-sm mx-0 sm:mx-4 space-y-3 rounded-b-none sm:rounded-xl safe-bottom">
          <p class="section-title">Delete Preset</p>
          <p class="text-sm text-gray-400">Are you sure? This cannot be undone.</p>
          <div class="flex gap-2">
            <button @click="deletePreset" class="btn-danger flex-1"><Trash2 :size="14" /> Delete</button>
            <button @click="confirmDelete = false" class="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../stores/auth'
import { ArrowLeft, Heart, GitFork, Play, Square, Flag, Share2, Users, Pencil, Save, Trash2, Loader2, AlertCircle } from 'lucide-vue-next'
import { formatRecurrence as formatRecurrenceUtil } from '../utils/scheduleFormat'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()

const preset = ref({})
const leaderboard = ref([])
const isLiked = ref(false)
const editing = ref(false)
const showReport = ref(false)
const confirmDelete = ref(false)
const reportReason = ref('')
const reportDetails = ref('')
const loading = ref(true)
const notFound = ref(false)

const categories = ['Fitness', 'Health', 'Learning', 'Productivity', 'Mindfulness', 'Social', 'Other']

const editForm = reactive({ title: '', description: '', category: 'Other' })

const isAuthor = computed(() => auth.user && preset.value.authorId === auth.user.id)

async function loadPreset() {
  loading.value = true
  notFound.value = false
  try {
    const res = await api.get(`/presets/${route.params.id}`)
    const p = res.data.preset || {}
    p.likes = p.likesCount || p.likes || 0
    p.forks = p.forksCount || p.forks || 0
    p.usages = p.usagesCount || p.usages || 0
    preset.value = p
    leaderboard.value = res.data.leaderboard || []
    isLiked.value = res.data.isLiked || false
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

async function likePreset() {
  try {
    const res = await api.post(`/presets/${route.params.id}/like`)
    isLiked.value = res.data.liked
    preset.value.likes = res.data.likesCount
  } catch {
    toast.error('Failed')
  }
}

async function forkPreset() {
  try {
    await api.post(`/presets/${route.params.id}/fork`)
    toast.success('Preset forked')
    loadPreset()
  } catch {
    toast.error('Failed')
  }
}

async function usePreset() {
  try {
    await api.post(`/presets/${route.params.id}/use`)
    toast.success('Preset added to your habits')
    router.push('/dashboard')
  } catch {
    toast.error('Failed')
  }
}

async function stopUsing() {
  try {
    await api.post(`/presets/${route.params.id}/stop-using`)
    toast.success('Stopped using preset')
    loadPreset()
  } catch {
    toast.error('Failed')
  }
}

function startEdit() {
  editForm.title = preset.value.title || ''
  editForm.description = preset.value.description || ''
  editForm.category = preset.value.category || 'Other'
  editing.value = true
}

async function saveEdit() {
  if (!editForm.title.trim()) return
  try {
    await api.put(`/presets/${route.params.id}`, {
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
    })
    editing.value = false
    toast.success('Preset updated')
    loadPreset()
  } catch {
    toast.error('Failed to update preset')
  }
}

async function deletePreset() {
  try {
    await api.delete(`/presets/${route.params.id}`)
    toast.success('Preset deleted')
    router.push('/presets')
  } catch {
    toast.error('Failed to delete preset')
  }
}

function shareLink() {
  const url = `${window.location.origin}/presets/${route.params.id}`
  if (navigator.share) {
    navigator.share({ title: preset.value.title, url }).catch(() => {})
  } else {
    navigator.clipboard.writeText(url)
    toast.success('Link copied!')
  }
}

async function submitReport() {
  if (!reportReason.value) return
  try {
    await api.post(`/presets/${route.params.id}/report`, {
      reason: reportReason.value,
      description: reportDetails.value,
    })
    showReport.value = false
    reportReason.value = ''
    reportDetails.value = ''
    toast.success('Report submitted')
  } catch {
    toast.error('Failed to submit report')
  }
}

function formatRecurrence(r) {
  if (!r) return 'Daily'
  if (Array.isArray(r.schedules) && r.schedules.length > 0) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const allDays = new Set()
    for (const s of r.schedules) {
      if (Array.isArray(s.days)) s.days.forEach(d => allDays.add(d))
    }
    if (allDays.size === 7) return 'Daily'
    return `Weekly (${[...allDays].sort().map(d => days[d]).filter(Boolean).join(', ')})`
  }
  return formatRecurrenceUtil(r)
}

onMounted(loadPreset)
</script>
