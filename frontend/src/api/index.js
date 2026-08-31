import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

const AUTH_ENDPOINTS = ['/auth/login', '/auth/demo', '/auth/register', '/auth/me']

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url = err.config?.url || ''
    // Let the auth views handle 401s from their own endpoints so a failed
    // login/register still renders its inline error instead of reloading.
    if (status === 401 && !AUTH_ENDPOINTS.some((e) => url.startsWith(e))) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      if (!window.location.pathname.startsWith('/login')) {
        const currentPath = window.location.pathname + window.location.search
        window.location.href = '/login?redirect=' + encodeURIComponent(currentPath)
      }
    }
    return Promise.reject(err)
  }
)

export default api