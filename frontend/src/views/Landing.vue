<template>
  <div class="min-h-screen text-[var(--bb-ink)] flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300 overflow-x-clip">
    <AmbientGlow />

    <div class="relative z-10 flex flex-col flex-1">
    <LandingNavbar />

    <main class="flex-1">
      <!-- ============ HERO ============ -->
      <section id="hero" class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 sm:pb-24">
        <div class="hero-scrim absolute -inset-x-4 -top-16 bottom-0 pointer-events-none" aria-hidden="true"></div>
        <div ref="hero" class="text-center max-w-4xl mx-auto space-y-7 relative hero-target">
          <ScrollReveal variant="fade-up" :delay="100">
            <h1 class="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] hero-title">
              <span class="text-[var(--bb-ink)]">Build habits</span><br />
              <span class="text-[var(--bb-ink)]">that</span>
              <em class="not-italic bg-gradient-to-r from-[var(--bb-accent)] via-[var(--bb-accent-strong)] to-[var(--bb-accent)] bg-clip-text text-transparent"> last.</em>
              <br />
              <span class="text-[var(--bb-ink)]">Together.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" :delay="200">
            <p class="text-base sm:text-lg text-[var(--bb-muted)] max-w-2xl mx-auto leading-relaxed">
              Habit tracking, task management, and social competition in one app.
              Challenge your friends, compare streaks, and build routines that stick.
            </p>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" :delay="300">
            <div class="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <a href="/register" class="btn px-8 py-4 bg-emerald-700 hover:bg-emerald-600 shadow-[0_0_25px_rgba(16,185,129,0.3)] text-lg font-semibold group">
                Sign Up
                <ArrowRight :size="18" class="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href="/login" class="btn-secondary px-8 py-4 border border-[var(--bb-line)] text-lg font-medium">
                Sign In
              </a>
              <a href="/login?demo=1" class="btn-demo px-8 py-4 text-lg font-medium">
                Try the Demo
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <!-- Year grid artifact -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28">
        <ScrollReveal variant="fade-up">
          <div class="rounded-2xl border border-[var(--bb-line)] bg-[var(--bb-bg-soft)] p-5 sm:p-8">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-6">
              <p class="text-xs font-bold tracking-[0.2em] uppercase text-[var(--bb-muted)]">Your year at a glance</p>
            </div>
            <ContributionGrid :grid="demoGrid" :year="demoYear" fit />
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ TICKER ============ -->
      <MarqueeBand :items="tickerItems" />

      <!-- ============ STATS BAND ============ -->
      <section class="border-b border-[var(--bb-line)] bg-[var(--bb-bg)] py-12 sm:py-16">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div class="space-y-1">
              <p class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--bb-accent)] to-[var(--bb-accent-strong)]">
                <StatCounter v-if="loaded" :value="stats.habits" :suffix="stats.habits >= 1000 ? 'k+' : '+'" />
              </p>
              <p class="text-xs text-[var(--bb-muted)] font-medium uppercase tracking-wider">Habits created</p>
            </div>
            <div class="space-y-1">
              <p class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--bb-accent)] to-[var(--bb-accent-strong)]">
                <StatCounter v-if="loaded" :value="stats.completionsValue" :suffix="stats.completionsSuffix" />
              </p>
              <p class="text-xs text-[var(--bb-muted)] font-medium uppercase tracking-wider">Completions</p>
            </div>
            <div class="space-y-1">
              <p class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--bb-accent)] to-[var(--bb-accent-strong)]">
                <StatCounter v-if="loaded" :value="stats.streakRetention" suffix="%" />
              </p>
              <p class="text-xs text-[var(--bb-muted)] font-medium uppercase tracking-wider">Streak retention</p>
            </div>
            <div class="space-y-1">
              <p class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--bb-accent)] to-[var(--bb-accent-strong)]">
                <StatCounter v-if="loaded" :value="stats.newHabits" />
              </p>
              <p class="text-xs text-[var(--bb-muted)] font-medium uppercase tracking-wider">New habits &middot; 30 days</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ FEATURES ============ -->
      <section id="features" class="border-b border-[var(--bb-line)] bg-[var(--bb-bg)] py-20 sm:py-28 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--bb-accent)]/5 rounded-full blur-[120px] pointer-events-none" aria-hidden="true"></div>

        <ScrollReveal variant="fade-up" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-end justify-between gap-6 mb-16">
            <div class="space-y-4 max-w-2xl">
              <p class="text-xs font-bold tracking-[0.25em] uppercase text-[var(--bb-accent-strong)]">01 &mdash; Features</p>
              <h2 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--bb-ink)]">Everything you need<br class="hidden sm:inline" /> to build better habits</h2>
            </div>
            <p class="hidden lg:block text-sm text-[var(--bb-muted)] max-w-xs leading-relaxed pb-1">
              Simple to start. Advanced when you need it. Built for analysts, makers, and competitors.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div v-for="(f, i) in features" :key="f.title" class="group rounded-2xl border border-[var(--bb-line)] bg-[var(--bb-card)] p-7 sm:p-8 space-y-4 hover:border-[var(--bb-accent)]/40 transition-all duration-300 relative overflow-hidden">
              <span class="font-mono text-xs font-bold text-[var(--bb-accent)] absolute top-5 right-6" aria-hidden="true">0{{ i + 1 }}</span>
              <div class="w-12 h-12 rounded-xl bg-[var(--bb-accent)]/10 border border-[var(--bb-accent)]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <component :is="f.icon" :size="22" class="text-[var(--bb-accent)]" :stroke-width="1.75" />
              </div>
              <h3 class="text-xl font-bold">{{ f.title }}</h3>
              <p class="text-sm text-[var(--bb-muted)] leading-relaxed">{{ f.description }}</p>
            </div>
          </div>

          <!-- Secondary feature row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            <div v-for="f in miniFeatures" :key="f.title" class="rounded-2xl border border-[var(--bb-line)] bg-[var(--bb-card)] p-5 flex items-start gap-4 hover:border-[var(--bb-accent)]/40 transition-colors">
              <div class="w-10 h-10 rounded-lg bg-[var(--bb-accent)]/10 border border-[var(--bb-accent)]/20 flex items-center justify-center shrink-0">
                <component :is="f.icon" :size="18" class="text-[var(--bb-accent)]" />
              </div>
              <div>
                <h3 class="font-semibold text-sm">{{ f.title }}</h3>
                <p class="text-xs text-[var(--bb-muted)] mt-1 leading-relaxed">{{ f.description }}</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ HOW IT WORKS ============ -->
      <section id="how" class="border-b border-[var(--bb-line)] bg-[var(--bb-bg-soft)] py-20 sm:py-28 relative overflow-hidden">
        <div class="absolute inset-0 bb-dots opacity-50" aria-hidden="true"></div>
        <ScrollReveal variant="fade-up" class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-end justify-between gap-6 mb-16">
            <div class="space-y-4 max-w-2xl">
              <p class="text-xs font-bold tracking-[0.25em] uppercase text-[var(--bb-accent-strong)]">02 &mdash; How it works</p>
              <h2 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--bb-ink)]">Three steps to habits<br class="hidden sm:inline" /> that finally stick</h2>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div class="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-[var(--bb-accent)]/40 via-[var(--bb-accent)]/20 to-transparent" aria-hidden="true"></div>
            <div v-for="(step, i) in steps" :key="step.title" class="text-center space-y-4 p-6 sm:p-8 relative rounded-2xl border border-[var(--bb-line)] bg-[var(--bb-card)] transition-colors duration-300">
              <div class="relative w-16 h-16 rounded-2xl bg-[var(--bb-accent)]/10 border border-[var(--bb-accent)]/20 flex items-center justify-center mx-auto">
                <component :is="step.icon" :size="28" class="text-[var(--bb-accent)]" :stroke-width="1.5" />
                <span class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--bb-accent)] text-[var(--bb-accent-ink)] text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
              </div>
              <h3 class="text-lg font-bold">{{ step.title }}</h3>
              <p class="text-sm text-[var(--bb-muted)]">{{ step.description }}</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ COMPETITIVE TEASER ============ -->
      <section id="challenges" class="border-b border-[var(--bb-line)] bg-[var(--bb-bg)] py-20 sm:py-28 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-[300px] h-[300px] bg-[var(--bb-accent)]/5 rounded-full blur-[120px] pointer-events-none" aria-hidden="true"></div>
        <ScrollReveal variant="fade-up" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div class="space-y-6">
              <p class="text-xs font-bold tracking-[0.25em] uppercase text-[var(--bb-accent-strong)]">03 &mdash; Competition</p>
              <h2 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--bb-ink)]">Turn whatever<br class="hidden sm:inline" /> you want into a competition</h2>
              <p class="text-[var(--bb-muted)] leading-relaxed">
                Challenge a friend to a 7-day streak battle. Live progress bars, streak counters, and a shared leaderboard.
                The loser buys coffee. The winner rubs it in &mdash; right inside the app.
              </p>
              <ul class="space-y-3">
                <li v-for="item in competitivePoints" :key="item" class="flex items-center gap-3 text-sm text-[var(--bb-muted)]">
                  <span class="w-5 h-5 rounded-full bg-[var(--bb-accent)]/15 border border-[var(--bb-accent)]/30 flex items-center justify-center shrink-0">
                    <Check :size="12" class="text-[var(--bb-accent)]" />
                  </span>
                  {{ item }}
                </li>
              </ul>
              <a href="/register" class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--bb-accent)] hover:text-[var(--bb-accent-strong)] transition-colors">
                Find a worthy opponent
                <ArrowRight :size="16" />
              </a>
            </div>

            <!-- Mini leaderboard -->
            <ScrollReveal variant="fade-right" :delay="150">
              <div class="rounded-2xl border border-[var(--bb-line)] bg-[var(--bb-bg-soft)] p-6">
                <div class="flex items-center justify-between pb-4 border-b border-[var(--bb-line)] mb-5">
                  <p class="text-sm font-bold">Weekly Challenge</p>
                  <span class="text-[10px] px-2 py-1 rounded-full bg-[var(--bb-accent)]/15 text-[var(--bb-accent)] font-semibold uppercase tracking-wider">Day 4 / 7</span>
                </div>
                <div class="space-y-4">
                  <div v-for="(row, idx) in leaderboardRows" :key="row.name" class="flex items-center gap-3">
                    <span class="w-6 text-xs font-bold" :class="idx === 0 ? 'text-[var(--bb-accent)]' : 'text-[var(--bb-faint)]'">{{ idx + 1 }}</span>
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-1">
                        <p class="text-xs font-semibold">{{ row.name }}</p>
                        <p class="text-xs font-bold" :class="idx === 0 ? 'text-[var(--bb-accent)]' : 'text-[var(--bb-muted)]'">{{ row.streak }}</p>
                      </div>
                      <div class="h-2 rounded-full bg-[var(--bb-line)] overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-700" :style="{ width: row.pct + '%' }" :class="idx === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-emerald-500/60'"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ FINAL CTA ============ -->
      <section id="cta" class="py-20 sm:py-28 relative overflow-hidden">
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--bb-accent)]/50 to-transparent" aria-hidden="true"></div>
        <div class="cta-scrim absolute inset-0 pointer-events-none" aria-hidden="true"></div>

        <ScrollReveal variant="scale-up" class="relative max-w-3xl mx-auto px-4 text-center space-y-8">
          <h2 class="text-4xl sm:text-6xl font-black tracking-tight text-[var(--bb-ink)] leading-[1.08]">
            Your future self is
            <span class="bg-gradient-to-r from-[var(--bb-accent)] via-[var(--bb-accent-strong)] to-[var(--bb-accent)] bg-clip-text text-transparent">watching.</span>
          </h2>
          <p class="text-[var(--bb-muted)] text-base max-w-lg mx-auto leading-relaxed">
            Create your account today, invite your friends, and start tracking immediately.
            Bragging rights are on the line.
          </p>
          <div class="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" class="btn px-10 py-4 bg-emerald-700 hover:bg-emerald-600 shadow-[0_0_35px_rgba(16,185,129,0.35)] text-lg font-semibold group">
              Sign Up
              <ArrowRight :size="18" class="group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a href="/login" class="btn-secondary px-10 py-4 text-lg font-medium">Sign In</a>
            <a href="/login?demo=1" class="btn-demo px-10 py-4 text-lg font-medium">Try the Demo</a>
          </div>
          <p class="text-xs text-[var(--bb-faint)]">
            <a href="/privacy" class="underline underline-offset-2 hover:text-[var(--bb-accent)] transition-colors">Privacy</a>
            &middot;
            <a href="/terms" class="underline underline-offset-2 hover:text-[var(--bb-accent)] transition-colors">Terms</a>
            &middot;
            <a href="/imprint" class="underline underline-offset-2 hover:text-[var(--bb-accent)] transition-colors">Imprint</a>
          </p>
        </ScrollReveal>
      </section>
    </main>

    <LandingFooter />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import LandingNavbar from '../components/LandingNavbar.vue'
import LandingFooter from '../components/LandingFooter.vue'
import ScrollReveal from '../components/ScrollReveal.vue'
import StatCounter from '../components/StatCounter.vue'
import ContributionGrid from '../components/ContributionGrid.vue'
import MarqueeBand from '../components/MarqueeBand.vue'
import AmbientGlow from '../components/AmbientGlow.vue'
import {
  Target, ListTodo, Users, CheckCircle2, BarChart2, ArrowRight, Bell,
  Check, Zap, Camera, Swords, Smartphone, Timer
} from 'lucide-vue-next'

const loaded = ref(false)
const stats = ref({ habits: 0, completionsValue: 0, completionsSuffix: '', streakRetention: 0, newHabits: 0 })

// Demo contribution grid — mirrors the real app grid (weeks, month labels, intensity)
const demoYear = new Date().getFullYear()
const demoGrid = (() => {
  const grid = []
  const now = new Date()
  for (let d = new Date(Date.UTC(demoYear, 0, 1)); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const seed = Math.sin(Date.parse(dateStr) / 86400000 * 2.7) * 10000
    const rnd = seed - Math.floor(seed)
    const dow = d.getUTCDay()
    const weekend = dow === 0 || dow === 6
    const scheduled = weekend ? 1 : 2
    const habits = rnd < 0.72 ? scheduled : rnd < 0.86 ? 1 : 0
    grid.push({
      date: dateStr,
      scheduled,
      completed: habits,
      habits,
      tasks: rnd < 0.3 ? 1 : 0,
      items: [],
    })
  }
  return grid
})()

const hero = ref(null)
let heroRaf = null
function onHeroMouse(e) {
  if (heroRaf) return
  heroRaf = requestAnimationFrame(() => {
    heroRaf = null
    const el = hero.value
    if (!el) return
    const r = el.getBoundingClientRect()
    const nx = Math.max(-1, Math.min(1, ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) || 0))
    const ny = Math.max(-1, Math.min(1, ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) || 0))
    el.style.setProperty('--rx', (-ny * 3.2).toFixed(2) + 'deg')
    el.style.setProperty('--ry', (nx * 4.6).toFixed(2) + 'deg')
    el.style.setProperty('--gx', (e.clientX - r.left) + 'px')
    el.style.setProperty('--gy', (e.clientY - r.top) + 'px')
  })
}
function onHeroLeave() {
  const el = hero.value
  if (!el) return
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
}

const tickerItems = [
  'Head-to-head streak battles',
  'Precise push reminders',
  'Photo verification',
  'PWA & offline ready',
  'Your year at a glance',
]

const features = [  { title: 'Habits that adapt to you', description: 'Multiple schedules per habit. Precise reminders at exact times. Photo or honor verification. Automatic streaks, breaks, and consistency stats. Your habits, your rules.', icon: Target },
  { title: 'Tasks that respect your time', description: 'One-time scheduled tasks with precise reminders. No weekly repeat unless you want it. Completed tasks feed your contribution grid. Overdue tasks never clutter your day.', icon: ListTodo },
  { title: 'Competition that keeps you going', description: 'Invite friends with a link — they join, you\'re connected. Challenge anyone head-to-head. Add accountability buddies who co-sign completions. Watch each other\'s streaks in real time.', icon: Users },
]

const miniFeatures = [
  { title: 'Precise push reminders', description: 'Browser push notifications at the exact minute you choose. Never miss a habit again.', icon: Bell },
  { title: 'Photo verification', description: 'Snap a photo to prove it. Perfect for workouts, meals, or morning runs.', icon: Camera },
  { title: 'Head-to-head battles', description: 'Challenge a friend to a streak battle with live progress bars.', icon: Swords },
  { title: 'Offline-ready PWA', description: 'Installable app that works offline. Progress syncs when you reconnect.', icon: Smartphone },
  { title: 'Contribution grid', description: 'Your year at a glance — a heatmap of every completion, GitHub-style.', icon: BarChart2 },
  { title: 'Consistency insights', description: 'Streaks, breaks, and trends computed automatically. Know what works.', icon: Zap },
]

const competitivePoints = [
  'Head-to-head streak battles against friends',
  'Live progress bars and day-by-day comparison',
  'Shared leaderboard with your inner circle',
]

const leaderboardRows = [
  { name: 'Sophie', streak: '4/4', pct: 100 },
  { name: 'Jonas', streak: '3/4', pct: 75 },
  { name: 'Michael', streak: '2/4', pct: 50 },
]

const steps = [
  { title: 'Create', description: 'Set a habit. Pick a time. Add reminders. Choose photo or honor verification.', icon: Target },
  { title: 'Complete', description: 'Get reminded. Mark done. Snap a photo if needed. Streak updates automatically.', icon: CheckCircle2 },
  { title: 'Improve', description: 'Watch your streak grow. See consistency trends. Share progress with friends.', icon: BarChart2 },
]

function formatCompletions(n) {
  if (n >= 1000) return { value: Math.round(n / 1000), suffix: 'k+' }
  return { value: n, suffix: '+' }
}

onMounted(() => {
  window.addEventListener('mousemove', onHeroMouse, { passive: true })
  hero.value?.addEventListener('mouseleave', onHeroLeave)
  fetch('/api/public/landing', { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      const s = data?.stats
      if (!s) throw new Error('no stats')
      const completions = formatCompletions(s.completions || 0)
      stats.value = {
        habits: Math.round(s.habitsCreated || 0),
        completionsValue: completions.value,
        completionsSuffix: completions.suffix,
        streakRetention: s.streakRetention || 0,
        newHabits: s.avgSetup || 0,
      }
      loaded.value = true
    })
    .catch(() => {
      loaded.value = true
    })
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onHeroMouse)
  hero.value?.removeEventListener('mouseleave', onHeroLeave)
  if (heroRaf) cancelAnimationFrame(heroRaf)
})
</script>

<style scoped>
.btn-demo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--bb-accent) 50%, transparent);
  background: color-mix(in srgb, var(--bb-accent) 10%, transparent);
  color: var(--bb-accent);
  border-radius: 0.625rem;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.btn-demo:hover {
  background: color-mix(in srgb, var(--bb-accent) 18%, transparent);
  border-color: color-mix(in srgb, var(--bb-accent) 75%, transparent);
}
.btn-demo:active {
  transform: scale(0.97);
}
.hero-scrim {
  background: radial-gradient(ellipse 70% 62% at 50% 36%, color-mix(in srgb, var(--bb-bg) 52%, transparent), color-mix(in srgb, var(--bb-bg) 30%) 52%, transparent 78%);
}
.hero-target {
  transform-style: preserve-3d;
}
.hero-target::after {
  content: '';
  position: absolute;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  left: calc(var(--gx, 50%) - 180px);
  top: calc(var(--gy, 20%) - 180px);
  background: radial-gradient(circle, rgba(52, 211, 153, 0.16), rgba(52, 211, 153, 0.05) 45%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.3s ease;
}
.hero-title {
  transform: perspective(1100px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}
@media (max-width: 640px) {
  .hero-title { transform: none; }
}
@media (hover: none) {
  .hero-target::after { opacity: 0; }
}
.cta-scrim {
  background: radial-gradient(ellipse 80% 90% at 50% 45%, color-mix(in srgb, var(--bb-bg) 42%, transparent), transparent 70%);
}
.bb-dots {
  color: var(--bb-grid);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Crect x='3' y='3' width='10' height='10' rx='2.2' fill='currentColor'/%3E%3C/svg%3E");
  background-size: 18px 18px;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 75%);
}
html.light .bb-dots {
  color: rgba(6, 95, 70, 0.16);
}
/* How-it-works + Competitive teaser: keep headings strong in both themes */
html.light #how h2,
html.light #how h3,
html.light #challenges h2,
html.light #challenges h3 {
  color: var(--bb-ink);
}
@media (max-width: 639px) {
  .bb-dots { background-size: 14px 14px; }
}
</style>