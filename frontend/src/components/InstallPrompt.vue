<template>
  <div v-if="visible" class="card">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
        <Smartphone :size="16" class="text-emerald-400" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-200">Install BeBetter</p>
        <p class="text-[11px] text-gray-500">{{ hint }}</p>
      </div>
      <button v-if="canInstall" @click="install" class="btn text-xs px-3 py-1.5 shrink-0">Install</button>
      <button @click="dismiss" class="p-2 rounded-lg text-gray-500 hover:text-gray-300 shrink-0 touch-target" aria-label="Dismiss install hint">
        <X :size="14" />
      </button>
    </div>
    <div v-if="isIos && !canInstall" class="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
      <Share :size="12" class="shrink-0" />
      <span>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Smartphone, X, Share } from 'lucide-vue-next'

const KEY = 'bebetter_install_dismissed'
const visible = ref(false)
const deferred = ref(null)

const isIos = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '')
})
const isStandalone = computed(() => {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(display-mode: standalone)')?.matches
    || window.navigator.standalone === true
})
const canInstall = computed(() => !!deferred.value)
const hint = computed(() => {
  if (canInstall.value) return 'One tap — works offline, opens fullscreen.'
  if (isIos.value) return 'Add it to your home screen for the full app feel.'
  return 'Use your browser menu → Add to Home screen.'
})

function onPrompt(e) {
  e.preventDefault()
  deferred.value = e
  maybeShow()
}

function maybeShow() {
  try {
    if (localStorage.getItem(KEY)) return
    if (isStandalone.value) return
    // iOS has no install prompt event — show the manual hint instead
    if (isIos.value || deferred.value) visible.value = true
  } catch { /* private mode etc — stay hidden */ }
}

async function install() {
  if (!deferred.value) return
  try {
    deferred.value.prompt()
    const { outcome } = await deferred.value.userChoice
    if (outcome === 'accepted') dismiss(true)
  } catch { /* ignore */ }
  deferred.value = null
}

function dismiss(permanent = true) {
  visible.value = false
  try { if (permanent) localStorage.setItem(KEY, '1') } catch {}
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onPrompt)
  // Give the page a beat to settle before showing anything
  setTimeout(maybeShow, 2500)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onPrompt)
})
</script>
