<template>
  <div v-if="show && auth.user && isSupported" class="card border border-emerald-500/30 bg-emerald-500/5">
    <div class="flex items-start gap-3">
      <div class="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
        <BellRing :size="20" class="text-emerald-400" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-100">Never miss a habit</p>
        <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">
          Turn on push notifications to get reminders at your scheduled times — even when the phone is locked or the app is in the background.
        </p>
      </div>
    </div>
    <div class="flex gap-2 mt-3">
      <button @click="enablePush" :disabled="loading" class="btn flex-1 text-xs py-2">
        <Loader2 v-if="loading" :size="14" class="animate-spin" />
        <BellRing v-else :size="14" />
        {{ loading ? 'Setting up...' : 'Enable notifications' }}
      </button>
      <button @click="dismiss" class="btn-secondary flex-1 text-xs py-2">Not now</button>
    </div>
    <p class="text-[10px] text-gray-500 mt-2">
      A one-time browser permission is required — iOS Safari: add the app to your Home Screen for full background delivery on standalone.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import { useToast } from 'vue-toastification'
import { BellRing, Loader2 } from 'lucide-vue-next'

const auth = useAuthStore()
const toast = useToast()

const show = ref(false)
const loading = ref(false)
const isSupported = ref(false)

const DISMISS_KEY = 'bebetter_push_banner_dismissed'

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
  if (localStorage.getItem(DISMISS_KEY)) return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  isSupported.value = true

  try {
    if (Notification.permission === 'denied') return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    show.value = !sub
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
    })

    // Ensure in-app reminder toggles are enabled so reminders flow
    try {
      const prefsRes = await api.get('/notifications/preferences')
      const prefs = prefsRes.data.preferences
      if (prefs && !prefs.habitRemindersEnabled) {
        await api.put('/notifications/preferences', { ...prefs, habitRemindersEnabled: true })
      }
    } catch {}

    show.value = false
    toast.success('Push notifications enabled')
  } catch (err) {
    console.error(err)
    toast.error('Push setup failed: ' + (err.response?.data?.error || err.message))
  }
  loading.value = false
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, '1')
  show.value = false
}
</script>