import { ref, onMounted, onUnmounted } from 'vue'

const isDark = ref(true)

function isLightDom() {
  return document.documentElement.classList.contains('light')
}

function setThemeClasses(light) {
  document.documentElement.classList.toggle('light', !!light)
  document.documentElement.classList.toggle('dark', !light)
}

function persistedTheme() {
  return localStorage.getItem('theme')
}

function applyTheme(light) {
  setThemeClasses(light)
  localStorage.setItem('theme', light ? 'light' : 'dark')
  isDark.value = !light
}

// Make sure the DOM reflects the stored/system theme and the ref matches it.
// Runs on every mount so navigation can never leave the toggle out of sync.
function initTheme() {
  const saved = persistedTheme()
  const light =
    saved === 'light'
      ? true
      : saved === 'dark'
        ? false
        : !window.matchMedia('(prefers-color-scheme: dark)').matches
  setThemeClasses(light)
  isDark.value = !light
}

function toggleTheme() {
  applyTheme(!isLightDom())
}

let mediaQuery = null
let systemHandler = null
let consumers = 0

function attachSystemListener() {
  if (mediaQuery) return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemHandler = (e) => {
    // Only follow the system when the user hasn't chosen explicitly.
    if (!persistedTheme()) {
      setThemeClasses(!e.matches)
      isDark.value = e.matches
    }
  }
  mediaQuery.addEventListener('change', systemHandler)
}

function detachSystemListener() {
  if (mediaQuery && systemHandler) {
    mediaQuery.removeEventListener('change', systemHandler)
    mediaQuery = null
    systemHandler = null
  }
}

function useTheme() {
  onMounted(() => {
    initTheme()
    consumers++
    attachSystemListener()
  })
  onUnmounted(() => {
    consumers = Math.max(0, consumers - 1)
    if (consumers === 0) detachSystemListener()
  })

  return {
    isDark,
    toggleTheme,
  }
}

export { useTheme, isDark, toggleTheme }