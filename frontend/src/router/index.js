import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Landing from '../views/Landing.vue'

const routes = [
  { path: '/', name: 'landing', component: Landing },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { guest: true } },
  { path: '/register', name: 'register', component: () => import('../views/Register.vue'), meta: { guest: true } },
  { path: '/forgot-password', name: 'forgot-password', component: () => import('../views/ForgotPassword.vue'), meta: { guest: true } },
  { path: '/reset-password', name: 'reset-password', component: () => import('../views/ResetPassword.vue'), meta: { guest: true } },
  { path: '/privacy', name: 'privacy', component: () => import('../views/Privacy.vue'), meta: { guest: true } },
  { path: '/terms', name: 'terms', component: () => import('../views/Terms.vue'), meta: { guest: true } },
  { path: '/imprint', name: 'imprint', component: () => import('../views/Imprint.vue'), meta: { guest: true } },
  { path: '/dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { auth: true } },
  { path: '/habits', name: 'habits', component: () => import('../views/Habits.vue'), meta: { auth: true } },
  { path: '/habits/:id', name: 'habit-detail', component: () => import('../views/HabitDetail.vue'), meta: { auth: true } },
  { path: '/presets', name: 'presets', component: () => import('../views/Presets.vue'), meta: { auth: true } },
  { path: '/presets/:id', name: 'preset-detail', component: () => import('../views/PresetDetail.vue') },
  { path: '/friends', name: 'friends', component: () => import('../views/Friends.vue'), meta: { auth: true } },
  { path: '/notifications', name: 'notifications', component: () => import('../views/Notifications.vue'), meta: { auth: true } },
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
  if (auth.token && !auth.user) {
    try { await auth.fetchUser() } catch { auth.logout() }
  }
  if (to.path === '/' && auth.user) return next('/dashboard')
  if (to.meta.auth && !auth.user) return next({ path: '/login', query: { redirect: to.fullPath } })
  if (to.meta.guest && auth.user) return next('/dashboard')
  next()
})

export default router
