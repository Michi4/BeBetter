import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || sessionStorage.getItem('token') || '')

  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
  }

  function setToken(newToken, stayLoggedIn) {
    token.value = newToken
    if (stayLoggedIn) {
      localStorage.setItem('token', newToken)
      sessionStorage.removeItem('token')
    } else {
      sessionStorage.setItem('token', newToken)
      localStorage.removeItem('token')
    }
  }

  async function login(emailOrUsername, password, stayLoggedIn = true) {
    const res = await api.post('/auth/login', { email: emailOrUsername, password })
    setToken(res.data.token, stayLoggedIn)
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
    await fetchUser()
    return res.data
  }

  async function demoLogin() {
    const res = await api.post('/auth/demo')
    setToken(res.data.token, false)
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
    await fetchUser()
    return res.data
  }

  async function register(data) {
    const { stayLoggedIn, ...payload } = data
    const res = await api.post('/auth/register', payload)
    setToken(res.data.token, stayLoggedIn !== false)
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
    await fetchUser()
    return res.data
  }

  async function fetchUser() {
    const currentToken = getToken()
    if (!currentToken) {
      user.value = null
      return
    }
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`
      const res = await api.get('/auth/me')
      user.value = res.data.user || res.data
    } catch (err) {
      if (err.response?.status === 401) {
        // Invalid/expired token: clear the whole session so guards react.
        logout()
        throw err
      }
      // Transient network error: keep the stored session, just surface failure.
      user.value = null
      throw err
    }
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    // Drop any cached API responses from the service worker so the next
    // visitor/account never sees this account's data while offline.
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'clear-data-cache' })
    }
  }

  return { user, token, login, demoLogin, register, fetchUser, logout, isDemo: computed(() => user.value?.isDemo === true) }
})
