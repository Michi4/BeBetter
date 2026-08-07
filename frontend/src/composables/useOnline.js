import { ref, onMounted, onUnmounted } from 'vue'

const online = ref(navigator.onLine)

let onlineHandler = null
let offlineHandler = null

export function useOnline() {
  onMounted(() => {
    onlineHandler = () => { online.value = navigator.onLine }
    offlineHandler = () => { online.value = navigator.onLine }
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
  })
  onUnmounted(() => {
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
  })
  return { online }
}