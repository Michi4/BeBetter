import { ref, onMounted, onUnmounted } from 'vue'

const online = ref(navigator.onLine)

// Module-level singleton with consumer ref-counting — like useTheme. Listeners
// are only removed when the LAST consumer unmounts, so one component leaving
// never kills online/offline tracking for everyone else.
let consumers = 0

function attach() {
  if (consumers > 0) return
  window.addEventListener('online', sync)
  window.addEventListener('offline', sync)
}

function detach() {
  window.removeEventListener('online', sync)
  window.removeEventListener('offline', sync)
}

function sync() {
  online.value = navigator.onLine
}

export function useOnline() {
  onMounted(() => {
    consumers++
    attach()
  })
  onUnmounted(() => {
    consumers = Math.max(0, consumers - 1)
    if (consumers === 0) detach()
  })
  return { online }
}