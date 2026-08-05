import { ref, onMounted, watch } from 'vue'

const isDark = ref(true)

function initTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'light') {
    isDark.value = false
    document.documentElement.classList.add('light')
  } else if (saved === 'dark') {
    isDark.value = true
    document.documentElement.classList.remove('light')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark.value = prefersDark
    document.documentElement.classList.toggle('light', !prefersDark)
  }
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('light', !isDark.value)
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
        document.documentElement.classList.toggle('light', !e.matches)
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