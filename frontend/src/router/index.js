import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { isApexProd, isAppProd, needsAppHost, appUrl } from '../utils/appUrl'
import Landing from '../views/Landing.vue'

const routes = [
  { path: '/', name: 'landing', component: Landing },
  { path: '/landing', name: 'landing-alt', component: Landing, meta: { publicLanding: true } },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { guest: true } },
  { path: '/register', name: 'register', component: () => import('../views/Register.vue'), meta: { guest: true } },
  { path: '/forgot-password', name: 'forgot-password', component: () => import('../views/ForgotPassword.vue'), meta: { guest: true } },
  { path: '/reset-password', name: 'reset-password', component: () => import('../views/ResetPassword.vue'), meta: { guest: true } },
  { path: '/privacy', name: 'privacy', component: () => import('../views/Privacy.vue') },
  { path: '/terms', name: 'terms', component: () => import('../views/Terms.vue') },
  { path: '/imprint', name: 'imprint', component: () => import('../views/Imprint.vue') },
  { path: '/dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { auth: true } },
  { path: '/habits', name: 'habits', component: () => import('../views/Habits.vue'), meta: { auth: true } },
  { path: '/habits/:id', name: 'habit-detail', component: () => import('../views/HabitDetail.vue'), meta: { auth: true } },
  { path: '/presets', name: 'presets', component: () => import('../views/Presets.vue'), meta: { auth: true } },
  { path: '/presets/:id', name: 'preset-detail', component: () => import('../views/PresetDetail.vue'), meta: { auth: true } },
  { path: '/friends', name: 'friends', component: () => import('../views/Friends.vue'), meta: { auth: true } },
  { path: '/notifications', name: 'notifications', component: () => import('../views/Notifications.vue'), meta: { auth: true } },
  { path: '/assistant', name: 'assistant', component: () => import('../views/Assistant.vue'), meta: { auth: true } },
  { path: '/profile/:id', name: 'profile', component: () => import('../views/Profile.vue') },
  { path: '/leaderboard', name: 'leaderboard', component: () => import('../views/Leaderboard.vue'), meta: { auth: true } },
  { path: '/challenges/new', name: 'new-challenge', component: () => import('../views/NewChallenge.vue'), meta: { auth: true } },
  { path: '/challenges/:id', name: 'challenge-detail', component: () => import('../views/ChallengeDetail.vue'), meta: { auth: true } },
  { path: '/challenges/invite/:token', name: 'challenge-invite', component: () => import('../views/ChallengeInvite.vue'), meta: { auth: true } },
  { path: '/admin', name: 'admin', component: () => import('../views/Admin.vue'), meta: { auth: true } },
  { path: '/friend/accept/:token', name: 'friend-accept', component: () => import('../views/FriendAccept.vue'), meta: { auth: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/dashboard' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  // Domain split: the apex host is landing-only. Any app route there jumps
  // to the app host (path + query preserved) instead of rendering in-app
  // login on the wrong domain.
  if (isApexProd() && needsAppHost(to.path)) {
    window.location.href = appUrl(to.fullPath)
    return
  }
  if (auth.token && !auth.user) {
    try { await auth.fetchUser() } catch (err) {
      // Only an explicit 401 invalidates the session; a transient network
      // error (offline) must not wipe a stored login.
      if (err?.response?.status === 401) auth.logout()
    }
  }
  // Root redirect only on the app host (and dev) — the apex host is the
  // landing page and must show it even to logged-in users.
  if (!isApexProd() && to.path === '/' && auth.user) return next('/dashboard')
  // Guests landing on the app host root belong on the apex landing page.
  if (isAppProd() && (to.path === '/' || to.path === '/landing') && !auth.user) {
    window.location.href = 'https://bebetter.websters.at/'
    return
  }
  if (to.meta.auth && !auth.user) return next({ path: '/login', query: { redirect: to.fullPath } })
  // Demo entry: pass through to /login so Login.vue can swap into the demo
  // account. The session is only replaced after a successful demo login, so a
  // failed demo never costs the current user their session.
  if (to.path === '/login' && to.query.demo === '1') return next()
  if (to.meta.guest && auth.user) return next('/dashboard')
  if (to.path === '/admin' && auth.user && auth.user.role !== 'admin') return next('/dashboard')
  // Demo users are blocked from social features even via direct URL
  if (auth.user?.isDemo && (to.path === '/friends' || to.path === '/leaderboard')) return next('/dashboard')
  next()
})

export default router
