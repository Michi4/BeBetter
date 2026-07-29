import { defineStore } from 'pinia'
import { ref } from 'vue'
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

  async function register(data) {
    const { stayLoggedIn, ...payload } = data
    const res = await api.post('/auth/register', payload)
    setToken(res.data.token, stayLoggedIn !== false)
    api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
    await fetchUser()
    return res.data
  }

  async function fetchUser() {
    try {
      const currentToken = getToken()
      if (!currentToken) {
        user.value = null
        return
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`
      const res = await api.get('/auth/me')
      user.value = res.data.user || res.data
    } catch {
      user.value = null
    }
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  async function deleteAccount() {
    await api.delete('/auth/account', { data: { confirm: 'DELETE_MY_ACCOUNT' } })
    logout()
  }

  return { user, token, login, register, fetchUser, logout, deleteAccount }
})
