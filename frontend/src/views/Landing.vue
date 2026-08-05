<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300 overflow-x-hidden">
    <LandingNavbar />

    <main class="flex-1">
      <!-- ============ HERO ============ -->
      <section id="hero" class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-24 sm:pb-36 overflow-hidden">
        <!-- Aurora mesh background -->
        <div class="absolute inset-0 -z-10" aria-hidden="true">
          <div class="absolute -top-48 -left-24 w-[480px] h-[480px] rounded-full blur-[160px] bg-emerald-500/15 animate-drift-1"></div>
          <div class="absolute top-1/3 -right-32 w-[420px] h-[420px] rounded-full blur-[160px] bg-teal-500/10 animate-drift-2"></div>
          <div class="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full blur-[180px] bg-indigo-500/10 animate-drift-1"></div>
          <div class="absolute inset-0 bg-grid opacity-40"></div>
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-950"></div>
        </div>

        <div class="relative max-w-4xl mx-auto text-center space-y-8">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
            Free · Self-hostable · Cloud plan later
          </div>

          <div class="space-y-6">
            <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-3xl mx-auto">
              <span class="bg-gradient-to-b from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">Build habits</span>
              <br class="hidden lg:inline" />
              <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">that actually last.</span>
              <br class="hidden lg:inline" />
              <span class="bg-gradient-to-b from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">Together.</span>
            </h1>

            <HeroText :phrases="heroPhrases" :typeSpeed="45" :deleteSpeed="22" :pauseDuration="2200" />

            <p class="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              BeBetter combines habit tracking, task management, and social accountability in one privacy-first app.
              Host it yourself, own your data, build routines that stick.
            </p>

            <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a href="/register" class="btn px-8 py-4 text-base bg-emerald-700 hover:bg-emerald-600 shadow-[0_0_25px_rgba(16,185,129,0.3)] text-lg font-semibold group">
                Start Free
                <ArrowRight :size="18" class="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href="/login" class="btn-secondary px-8 py-4 text-base border border-gray-700 hover:bg-gray-800 text-lg font-medium">
                Sign In
              </a>
            </div>

            <p class="text-xs text-gray-400 pt-2">No credit card · Self-hostable · Cancel anytime</p>
          </div>

          <!-- Live Preview -->
          <div class="relative max-w-3xl mx-auto pt-14 sm:pt-16">
            <!-- Floating chips -->
            <div class="hidden sm:flex flex-col items-end gap-3 absolute -right-6 lg:-right-16 top-2 z-10" aria-hidden="true">
              <div class="float-chip animate-float-1 px-4 py-3 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm text-left shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <p class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Best streak</p>
                <p class="text-lg font-bold text-emerald-400">23 days</p>
              </div>
              <div class="float-chip animate-float-2 px-4 py-3 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm text-left shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <p class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">This week</p>
                <div class="flex gap-1 mt-1.5">
                  <span v-for="d in [1,1,1,1,1,0,1]" :key="d" class="w-2.5 h-2.5 rounded-full" :class="d ? 'bg-emerald-400' : 'bg-gray-700'"></span>
                </div>
              </div>
            </div>
            <div class="hidden sm:flex flex-col gap-3 absolute -left-6 lg:-left-16 top-10 z-10" aria-hidden="true">
              <div class="float-chip animate-float-2 px-4 py-3 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm text-left shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <div class="flex items-center gap-2">
                  <Bell :size="16" class="text-emerald-400" />
                  <p class="text-xs font-semibold text-white">Reminder</p>
                </div>
                <p class="text-[11px] text-gray-400 mt-1">Morning Run at 06:30</p>
              </div>
            </div>

            <ScrollReveal variant="scale-up" delay="200">
              <div class="relative rounded-2xl border border-gray-800 bg-gray-900/40 p-4 sm:p-6 backdrop-blur-sm shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
                <div class="flex items-center gap-1.5 pb-4 border-b border-gray-800/80 mb-4 text-gray-500">
                  <span class="w-3 h-3 rounded-full bg-red-500/40"></span>
                  <span class="w-3 h-3 rounded-full bg-yellow-500/40"></span>
                  <span class="w-3 h-3 rounded-full bg-green-500/40"></span>
                  <span class="text-xs font-medium ml-2 select-none tracking-wider uppercase text-gray-500">bebetter.websters.at</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <HabitShowcaseCard :habit="showcaseHabits[0]" :delay="400" />
                  <HabitShowcaseCard :habit="showcaseHabits[1]" :delay="500" />
                  <HabitShowcaseCard :habit="showcaseHabits[2]" :delay="600" />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <!-- ============ STATS BAND ============ -->
      <section class="border-t border-gray-900 bg-gray-900/20 py-12 sm:py-16">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div class="space-y-1">
              <p class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400"><StatCounter :value="2400" suffix="+" /></p>
              <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">Habits created</p>
            </div>
            <div class="space-y-1">
              <p class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400"><StatCounter :value="180" suffix="k+" /></p>
              <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">Completions</p>
            </div>
            <div class="space-y-1">
              <p class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400"><StatCounter :value="96" suffix="%" /></p>
              <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">Streak retention</p>
            </div>
            <div class="space-y-1">
              <p class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400"><StatCounter :value="12" suffix="s" /></p>
              <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">Avg. setup time</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ FEATURES ============ -->
      <section id="features" class="border-t border-gray-900 bg-gray-900/20 py-20 sm:py-28 relative overflow-hidden">
        <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[200px] pointer-events-none" aria-hidden="true"></div>

        <ScrollReveal variant="fade-up" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-emerald-400">Features</p>
            <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Everything you need to build better habits</h2>
            <p class="text-gray-300 text-base sm:text-lg leading-relaxed">
              Simple to start. Deep when you need it. Habit tracking for analysts, makers, and competitors — together.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <FeaturePillar
              title="Habits that adapt to you"
              description="Multiple schedules per habit. Precise reminders at exact times. Photo or honor verification. Automatic streaks, breaks, and consistency stats. Your habits, your rules."
              :icon="Target"
              :delay="100"
            />
            <FeaturePillar
              title="Tasks that respect your time"
              description="One-time scheduled tasks with precise reminders. No weekly repeat unless you want it. Completed tasks feed your contribution grid. Overdue tasks never clutter your day."
              :icon="ListTodo"
              :delay="200"
              :icon-color="'#f59e0b'"
              :icon-bg="'rgba(245, 158, 11, 0.1)'"
            />
            <FeaturePillar
              title="Accountability that works"
              description="Invite friends with a link — they join, you're connected. Challenge anyone head-to-head. Add accountability buddies who co-sign completions. See each other's streaks in real time."
              :icon="Users"
              :delay="300"
              :icon-color="'#3b82f6'"
              :icon-bg="'rgba(59, 130, 246, 0.1)'"
            />
          </div>

          <!-- Secondary feature row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            <div v-for="(f, i) in miniFeatures" :key="f.title" class="card p-5 flex items-start gap-4 hover:border-emerald-500/30 transition-colors">
              <div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0" :class="[i % 2 ? 'bg-indigo-500/10 border-indigo-500/20' : '']">
                <component :is="f.icon" :size="18" class="text-emerald-400" :class="[i % 2 ? 'text-indigo-400' : '']" />
              </div>
              <div>
                <h3 class="font-semibold text-sm text-white">{{ f.title }}</h3>
                <p class="text-xs text-gray-400 mt-1 leading-relaxed">{{ f.description }}</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ COMPETITIVE TEASER ============ -->
      <section id="challenges" class="border-t border-gray-900 py-20 sm:py-28 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none" aria-hidden="true"></div>
        <ScrollReveal variant="fade-up" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div class="space-y-6">
              <p class="text-xs font-bold tracking-[0.2em] uppercase text-indigo-400">For competitors</p>
              <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Turn every day into a head-to-head</h2>
              <p class="text-gray-300 leading-relaxed">
                Challenge a friend to a 7-day streak battle. Live progress bars, streak counters, and a shared leaderboard.
                The loser buys coffee. The winner rubs it in — right inside the app.
              </p>
              <ul class="space-y-3">
                <li v-for="item in competitivePoints" :key="item" class="flex items-center gap-3 text-sm text-gray-300">
                  <span class="w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Check :size="12" class="text-indigo-400" />
                  </span>
                  {{ item }}
                </li>
              </ul>
              <a href="/register" class="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Start your first challenge
                <ArrowRight :size="16" class="group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            <!-- Mini leaderboard mock -->
            <ScrollReveal variant="fade-right" delay="200">
              <div class="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 backdrop-blur-sm shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
                <div class="flex items-center justify-between pb-4 border-b border-gray-800/80 mb-5">
                  <p class="text-sm font-bold text-white">Weekly Challenge</p>
                  <span class="text-[10px] px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-400 font-semibold uppercase tracking-wider">Day 4 / 7</span>
                </div>
                <div class="space-y-4">
                  <div v-for="(row, idx) in leaderboardRows" :key="row.name" class="flex items-center gap-3">
                    <span class="w-6 text-xs font-bold" :class="idx === 0 ? 'text-emerald-400' : 'text-gray-500'">{{ idx + 1 }}</span>
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-1">
                        <p class="text-xs font-semibold text-white">{{ row.name }}</p>
                        <p class="text-xs font-bold" :class="idx === 0 ? 'text-emerald-400' : 'text-gray-400'">{{ row.streak }}</p>
                      </div>
                      <div class="h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-700" :style="{ width: row.pct + '%' }" :class="idx === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-indigo-500/60'"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ SHOWCASE ============ -->
      <section id="showcase" class="border-t border-gray-900 bg-gray-900/20 py-20 sm:py-28">
        <ScrollReveal variant="fade-up" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-emerald-400">Showcase</p>
            <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">What it looks like in the wild</h2>
            <p class="text-gray-300 text-base sm:text-lg leading-relaxed">
              Real habits from real people. Clean, focused, distraction-free.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HabitShowcaseCard :habit="showcaseHabits[0]" :delay="100" />
            <HabitShowcaseCard :habit="showcaseHabits[1]" :delay="200" />
            <HabitShowcaseCard :habit="showcaseHabits[2]" :delay="300" />
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ HOW IT WORKS ============ -->
      <section class="border-t border-gray-900 py-20 sm:py-28 relative">
        <ScrollReveal variant="fade-up" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-emerald-400">How it works</p>
            <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Three steps to habits that last</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div class="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-transparent" aria-hidden="true"></div>
            <div v-for="(step, i) in steps" :key="step.title" class="text-center space-y-4 p-6 relative">
              <div class="relative w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <component :is="step.icon" :size="28" class="text-emerald-400" />
                <span class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
              </div>
              <h3 class="text-lg font-bold text-white">{{ step.title }}</h3>
              <p class="text-gray-400 text-sm">{{ step.description }}</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ TESTIMONIALS ============ -->
      <section class="border-t border-gray-900 bg-gray-900/20 py-20 sm:py-28">
        <ScrollReveal variant="fade-up" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center max-w-3xl mx-auto mb-14 space-y-4">
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-emerald-400">Word on the street</p>
            <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Loved by people who tried everything</h2>
          </div>
          <div class="grid md:grid-cols-3 gap-6">
            <figure v-for="(t, i) in testimonials" :key="t.name" class="card p-6 space-y-4 hover:border-emerald-500/30 transition-colors">
              <div class="flex gap-1" aria-hidden="true">
                <Star v-for="s in 5" :key="s" :size="14" class="text-amber-400 fill-amber-400" />
              </div>
              <blockquote class="text-sm text-gray-300 leading-relaxed">"{{ t.quote }}"</blockquote>
              <figcaption class="flex items-center gap-3 pt-2 border-t border-gray-800">
                <span class="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/60 to-teal-500/60 flex items-center justify-center text-xs font-bold text-white">{{ t.initials }}</span>
                <div>
                  <p class="text-xs font-semibold text-white">{{ t.name }}</p>
                  <p class="text-[10px] text-gray-500">{{ t.role }}</p>
                </div>
              </figcaption>
            </figure>
          </div>
        </ScrollReveal>
      </section>

      <!-- ============ FINAL CTA ============ -->
      <section id="cta" class="border-t border-gray-900 py-20 sm:py-28 relative overflow-hidden">
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" aria-hidden="true"></div>
        <div class="absolute bottom-0 right-1/2 translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[180px] pointer-events-none" aria-hidden="true"></div>

        <ScrollReveal variant="scale-up" class="relative max-w-3xl mx-auto px-4 text-center space-y-8">
          <h2 class="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Your future self is
            <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">watching.</span>
          </h2>
          <p class="text-gray-300 text-base max-w-lg mx-auto leading-relaxed">
            Create your account today, invite your friends, and start tracking immediately.
            Free. Self-hostable. No ads. Your data, your server.
          </p>
          <div class="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" class="btn px-10 py-4 bg-emerald-700 hover:bg-emerald-600 shadow-[0_0_35px_rgba(16,185,129,0.35)] text-lg font-semibold">
              Start Free
            </a>
            <a href="/login" class="btn-secondary px-10 py-4 text-lg font-medium">Sign In</a>
          </div>
          <p class="text-xs text-gray-500">
            Cloud plan later · <a href="/privacy" class="underline underline-offset-2 hover:text-emerald-400 transition-colors">Privacy</a> · <a href="/terms" class="underline underline-offset-2 hover:text-emerald-400 transition-colors">Terms</a> · <a href="/imprint" class="underline underline-offset-2 hover:text-emerald-400 transition-colors">Imprint</a>
          </p>
        </ScrollReveal>
      </section>
    </main>

    <LandingFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import LandingNavbar from '../components/LandingNavbar.vue'
import LandingFooter from '../components/LandingFooter.vue'
import HeroText from '../components/HeroText.vue'
import ScrollReveal from '../components/ScrollReveal.vue'
import FeaturePillar from '../components/FeaturePillar.vue'
import HabitShowcaseCard from '../components/HabitShowcaseCard.vue'
import StatCounter from '../components/StatCounter.vue'
import {
  Target, ListTodo, Users, CheckCircle2, BarChart2, ArrowRight, Bell,
  Check, Star, Zap, Camera, Globe, Smartphone, Timer
} from 'lucide-vue-next'

const heroPhrases = ref([
  'Simple to start.',
  'Deep when you need it.',
  'Built for analysts, makers, and competitors.',
  'Together.'
])

const showcaseHabits = ref([
  { title: 'Morning Run', streak: 23, scheduleDisplay: '06:30', completionCount: 156 },
  { title: 'Read 30 Pages', streak: 12, scheduleDisplay: 'Anytime', completionCount: 89 },
  { title: 'Deep Work Block', streak: 7, scheduleDisplay: '09:00', completionCount: 42 }
])

const miniFeatures = [
  { title: 'Precise push reminders', description: 'Browser push notifications at the exact minute you choose. Never miss a habit again.', icon: Bell },
  { title: 'Photo verification', description: 'Snap a photo to prove it. Perfect for workouts, meals, or morning runs.', icon: Camera },
  { title: 'Privacy first', description: 'Self-hostable with no telemetry. Your data lives on your server, full stop.', icon: Globe },
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

const testimonials = [
  { quote: 'I have tried every habit app on the market. BeBetter is the first one my friends actually stayed on for more than a week.', name: 'Sophie F.', role: 'Product Designer', initials: 'SF' },
  { quote: 'The streak battles with my buddy are brutal. I have run more mornings in 30 days than in the last 2 years.', name: 'Jonas F.', role: 'Developer', initials: 'JF' },
  { quote: 'Self-hosting my own instance and having zero telemetry sealed the deal. It is fast, clean, and genuinely free.', name: 'Manuel P.', role: 'Ops Engineer', initials: 'MP' },
]

onMounted(() => {
  const featured = showcaseHabits.value
  fetch('/api/habits/featured/public', { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      if (Array.isArray(data?.habits) && data.habits.length >= 3) {
        showcaseHabits.value = data.habits.slice(0, 3)
      }
    })
    .catch(() => {
      if (featured.length) return
    })
})
</script>

<style scoped>
.bg-grid {
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.07) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 75%);
}

@keyframes drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -20px) scale(1.05); }
}
@keyframes drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-25px, 20px) scale(1.08); }
}
.animate-drift-1 { animation: drift-1 14s ease-in-out infinite; }
.animate-drift-2 { animation: drift-2 18s ease-in-out infinite; }

@keyframes float-1 {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes float-2 {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}
.animate-float-1 { animation: float-1 5s ease-in-out infinite; }
.animate-float-2 { animation: float-2 6s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .animate-drift-1, .animate-drift-2, .animate-float-1, .animate-float-2 {
    animation: none;
  }
}
</style>