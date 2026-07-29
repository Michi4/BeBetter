<template>
  <div class="page">
    <div class="flex items-center gap-2">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold truncate">{{ preset.title }}</h1>
    </div>

    <div class="card space-y-4">
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span class="px-1.5 py-0.5 rounded bg-gray-800">{{ preset.category }}</span>
        <span>by {{ preset.author?.name || preset.authorName || 'Unknown' }}</span>
      </div>

      <p v-if="preset.description" class="text-sm text-gray-400 leading-relaxed">{{ preset.description }}</p>

      <div class="text-xs text-gray-500">
        <span class="text-gray-600">Schedule:</span>
        <span class="text-gray-400 ml-1">{{ formatRecurrence(preset.recurrence) }}</span>
      </div>

      <div class="flex items-center gap-3 text-xs text-gray-500">
        <span class="flex items-center gap-1"><Heart :size="12" /> {{ preset.likes || 0 }}</span>
        <span class="flex items-center gap-1"><GitFork :size="12" /> {{ preset.forks || 0 }}</span>
      </div>

      <div class="flex flex-wrap gap-2 pt-1">
        <button @click="likePreset" class="btn flex-1 min-w-0">
          <Heart :size="14" :class="preset.liked ? 'fill-current' : ''" />
          {{ preset.liked ? 'Unlike' : 'Like' }}
        </button>
        <button @click="forkPreset" class="btn-secondary flex-1 min-w-0">
          <GitFork :size="14" /> Fork
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
    </div>

    <div v-if="preset.leaderboard?.length" class="space-y-2">
      <p class="section-title">Leaderboard</p>
      <div class="card divide-y divide-gray-800">
        <div v-for="(entry, i) in preset.leaderboard" :key="i" class="flex items-center gap-3 py-3">
          <span class="w-6 text-center text-sm font-medium text-gray-500">{{ i + 1 }}</span>
          <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
            {{ (entry.name || entry.username || 'U')[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ entry.name || entry.username }}</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-sm font-medium text-emerald-400">{{ entry.score || 0 }}</div>
            <div class="text-[10px] text-gray-600">completions</div>
          </div>
          <div v-if="entry.streak" class="text-right shrink-0">
            <div class="text-sm font-medium text-amber-400">{{ entry.streak }}d</div>
            <div class="text-[10px] text-gray-600">streak</div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showReport" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" @click.self="showReport = false">
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
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { useToast } from 'vue-toastification'
import { ArrowLeft, Heart, GitFork, Play, Square, Flag } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const preset = ref({})
const showReport = ref(false)
const reportReason = ref('')
const reportDetails = ref('')

async function loadPreset() {
  try {
    const res = await api.get(`/presets/${route.params.id}`)
    preset.value = res.data.preset || res.data
  } catch {
    toast.error('Preset not found')
  }
}

async function likePreset() {
  try {
    await api.post(`/presets/${route.params.id}/like`)
    loadPreset()
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
    await api.post(`/presets/${route.params.id}/fork`)
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

async function submitReport() {
  if (!reportReason.value) return
  try {
    await api.post(`/presets/${route.params.id}/report`, {
      reason: reportReason.value,
      details: reportDetails.value
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

onMounted(loadPreset)
</script>
