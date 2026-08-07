import { ref, onMounted, watch } from 'vue'

const isDark = ref(true)

function setThemeClasses(light) {
  document.documentElement.classList.toggle('light', !!light)
  document.documentElement.classList.toggle('dark', !light)
}

function initTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'light') {
    isDark.value = false
    setThemeClasses(true)
  } else if (saved === 'dark') {
    isDark.value = true
    setThemeClasses(false)
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark.value = prefersDark
    setThemeClasses(!prefersDark)
  }
}

function toggleTheme() {
  isDark.value = !isDark.value
  setThemeClasses(!isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function useTheme() {
  onMounted(() => {
    // Only init once
    if (!document.documentElement.classList.contains('light') && !document.documentElement.classList.contains('dark')) {
      initTheme()
    }
  })

  // Watch for system theme changes
  onMounted(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('theme')) {
        isDark.value = e.matches
        setThemeClasses(!e.matches)
      }
    }
    mediaQuery.addEventListener('change', handler)
  })

  return {
    isDark,
    toggleTheme,
  }
}

export { useTheme, isDark, toggleTheme }