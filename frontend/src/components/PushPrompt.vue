<template>
  <div v-if="show && auth.user && isSupported && onDashboard && !auth.isDemo" class="w-full pointer-events-auto">
    <div class="card border border-gray-700 bg-gray-800/95 backdrop-blur-xl shadow-lg">
    <div class="flex items-start gap-3">
      <div class="shrink-0 w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
        <BellRing :size="16" class="text-gray-400" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-200">Stay on track</p>
        <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">
          Enable reminders — works even when the app is closed.
        </p>
      </div>
      <button @click="dismiss" class="shrink-0 p-1 rounded text-gray-500 hover:text-gray-300" aria-label="Dismiss">
        <X :size="14" />
      </button>
    </div>
    <div class="flex gap-2 mt-3">
      <button @click="enablePush" :disabled="loading" class="btn flex-1 text-xs py-2">
        <Loader2 v-if="loading" :size="14" class="animate-spin" />
        <span v-else>Enable</span>
      </button>
      <button @click="dismiss" class="btn-secondary flex-1 text-xs py-2">Later</button>
    </div>
    <p class="text-[10px] text-gray-600 mt-2 min-h-[14px]">{{ platformHint }}</p>
    </div>
    </div>
  <ConfirmDialog ref="confirmDlg" />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import { useToast } from 'vue-toastification'
import { BellRing, Loader2, X } from 'lucide-vue-next'
import ConfirmDialog from './ConfirmDialog.vue'

const auth = useAuthStore()
const toast = useToast()
const route = useRoute()

// First-run onboarding — belongs on the Dashboard, not on every page
// (Admin/Profile/Friends don't need a push upsell mid-content).
const onDashboard = computed(() => route.path === '/dashboard')

// iOS only shows web push in the installed standalone PWA — say so upfront
// instead of letting users hit a dead permission prompt.
const platformHint = computed(() => {
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIOS) return 'A one-time browser permission is required.'
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  return standalone
    ? 'A one-time browser permission is required.'
    : 'iOS: add the app to your Home Screen first (Share → Add to Home Screen) — Safari only delivers push in the installed app.'
})

const show = ref(false)
const loading = ref(false)
const isSupported = ref(false)

const DISMISS_KEY = 'bebetter_push_banner_dismissed'
const confirmDlg = ref(null)

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

onMounted(async () => {
  if (!auth.user) return
  if (auth.isDemo) return
  if (auth.user.role === 'admin') return
  if (localStorage.getItem(DISMISS_KEY)) return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  isSupported.value = true

  try {
    if (Notification.permission === 'denied') return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) {
      // delay a bit so it doesn't pop the instant the dashboard loads
      setTimeout(() => { show.value = true }, 3500)
    }
  } catch {}
})

async function enablePush() {
  loading.value = true
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      localStorage.setItem(DISMISS_KEY, '1')
      show.value = false
      toast.warning('Notification permission denied')
      loading.value = false
      return
    }

    const vapidRes = await api.get('/notifications/vapid-public-key')
    const publicKey = vapidRes.data.publicKey
    if (!publicKey) throw new Error('VAPID key missing on server')

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    const keys = sub.toJSON().keys
    await api.post('/notifications/subscribe', {
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent || '').slice(0, 512) : undefined,
    })

    // Never silently re-enable: if the user turned habit reminders off, ask.
    try {
      const prefsRes = await api.get('/notifications/preferences')
      const prefs = prefsRes.data.preferences
      if (prefs && !prefs.habitRemindersEnabled) {
        const turnOn = await confirmDlg.value?.open({
          title: 'Habit reminders are off',
          message: 'Push is on, but your habit reminders are disabled — so there is nothing to push. Turn habit reminders on too?',
          confirmLabel: 'Turn on',
        })
        if (turnOn) await api.put('/notifications/preferences', { habitRemindersEnabled: true })
      }
    } catch {}

    show.value = false
    toast.success('Push notifications enabled')
  } catch (err) {
    toast.error('Push setup failed: ' + (err.response?.data?.error || err.message))
  }
  loading.value = false
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, '1')
  show.value = false
}
</script>