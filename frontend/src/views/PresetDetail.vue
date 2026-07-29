<template>
  <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
    <div class="flex items-center gap-3">
      <button @click="$router.back()" class="btn-ghost p-1"><ArrowLeft :size="18" /></button>
      <h1 class="text-xl font-bold">{{ preset.title }}</h1>
    </div>

    <div class="card space-y-3">
      <p class="text-sm text-gray-400">{{ preset.description }}</p>
      <div class="flex items-center gap-3 text-xs text-gray-500">
        <span class="px-1.5 py-0.5 rounded bg-gray-800">{{ preset.category }}</span>
        <span>by {{ preset.author?.name || preset.authorName || 'Unknown' }}</span>
      </div>
      <div class="text-xs text-gray-500">
        Recurrence: {{ formatRecurrence(preset.recurrence) }}
      </div>
      <div class="flex gap-2">
        <button @click="likePreset" class="btn text-xs">
          <Heart :size="14" /> {{ preset.liked ? 'Unlike' : 'Like' }} ({{ preset.likes || 0 }})
        </button>
        <button @click="forkPreset" class="btn-secondary text-xs"><GitFork :size="14" /> Fork ({{ preset.forks || 0 }})</button>
        <button @click="usePreset" class="btn text-xs"><Play :size="14" /> Use</button>
        <button @click="showReport = true" class="btn-ghost text-xs text-red-400">Report</button>
      </div>
    </div>

    <div v-if="preset.leaderboard?.length" class="card">
      <h3 class="text-sm font-medium text-gray-400 mb-3">Leaderboard</h3>
      <div v-for="(entry, i) in preset.leaderboard" :key="i" class="flex items-center gap-2 text-sm py-1">
        <span class="w-5 text-center text-gray-500">{{ i + 1 }}</span>
        <span class="text-gray-300">{{ entry.name || entry.username }}</span>
        <span class="text-emerald-400 ml-auto">{{ entry.score || 0 }}</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showReport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="showReport = false">
        <div class="card w-full max-w-sm mx-4 space-y-3">
          <h3 class="font-semibold">Report Preset</h3>
          <textarea v-model="reportReason" class="input" placeholder="Reason..." rows="3"></textarea>
          <div class="flex gap-2">
            <button @click="submitReport" class="btn-danger text-xs">Report</button>
            <button @click="showReport = false" class="btn-secondary text-xs">Cancel</button>
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
import { ArrowLeft, Heart, GitFork, Play } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const preset = ref({})
const showReport = ref(false)
const reportReason = ref('')

async function loadPreset() {
  try {
    const res = await api.get(`/presets/${route.params.id}`)
    preset.value = res.data.preset || res.data
  } catch { toast.error('Preset not found') }
}

async function likePreset() {
  try {
    await api.post(`/presets/${route.params.id}/like`)
    loadPreset()
  } catch { toast.error('Failed') }
}

async function forkPreset() {
  try {
    await api.post(`/presets/${route.params.id}/fork`)
    toast.success('Preset forked')
    loadPreset()
  } catch { toast.error('Failed') }
}

async function usePreset() {
  try {
    await api.post(`/presets/${route.params.id}/fork`)
    toast.success('Preset added to your habits')
    router.push('/dashboard')
  } catch { toast.error('Failed') }
}

async function submitReport() {
  try {
    await api.post(`/presets/${route.params.id}/report`, { reason: reportReason.value })
    showReport.value = false
    toast.success('Reported')
  } catch { toast.error('Failed') }
}

function formatRecurrence(r) {
  if (!r) return 'Daily'
  if (r.type === 'daily') return 'Daily'
  if (r.type === 'weekdays') return 'Weekdays'
  if (r.type === 'weekly') return 'Weekly'
  return r.type
}

onMounted(loadPreset)
</script>
