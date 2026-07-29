<template>
  <div class="select-none" ref="container">
    <div v-if="weeks.length">
      <!-- Month labels row -->
      <div class="relative h-[18px] mb-[3px]" :style="{ paddingLeft: (dayLabelW + GAP) + 'px' }">
        <div v-for="(m, i) in monthLabels" :key="i"
          class="absolute text-[11px] text-gray-500"
          :style="{ left: m.left + 'px' }">
          {{ m.label }}
        </div>
      </div>

      <!-- Grid body: day labels + weeks -->
      <div class="flex gap-[3px]">
        <!-- Day labels column -->
        <div class="flex flex-col gap-[3px] text-[10px] text-gray-500 shrink-0" :style="{ width: dayLabelW + 'px' }">
          <div v-for="d in dayLabels" :key="d.label"
            class="flex items-center"
            :style="{ height: cell + 'px' }">
            <span v-if="d.show">{{ d.label }}</span>
          </div>
        </div>
        <!-- Weeks grid -->
        <div class="flex gap-[3px]">
          <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-[3px]">
            <div v-for="(day, di) in week" :key="di">
              <div
                class="rounded-[2px] transition-all duration-100 relative"
                :class="day ? getCellClass(day) : 'bg-transparent'"
                :style="{ width: cell + 'px', height: cell + 'px' }"
                @mouseenter="day ? (hoveredDay = day, hoveredWeekIdx = wi, hoveredDayIdx = di) : null"
                @mouseleave="hoveredDay = null"
                @click="day && (day.scheduled > 0 || (day.tasks && day.tasks.length > 0)) && $emit('select', day)">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <div v-if="hoveredDay" class="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl text-xs max-w-xs pointer-events-none"
      :style="tooltipPos">
      <div class="font-medium mb-1">{{ formatTipDate(hoveredDay.date) }}</div>
      <div v-if="hoveredDay.scheduled > 0" class="text-gray-400 mb-1">
        {{ hoveredDay.completed }}/{{ hoveredDay.scheduled }} habits done
      </div>
      <div v-if="hoveredDay.habits && hoveredDay.habits.length" class="space-y-0.5 mb-1">
        <div v-for="h in hoveredDay.habits" :key="h.id" class="flex items-center gap-1.5">
          <span :class="h.logged ? 'text-emerald-400' : 'text-gray-600'">{{ h.logged ? '\u2713' : '\u25CB' }}</span>
          <span :class="h.logged ? 'text-gray-500 line-through' : ''">{{ h.title }}</span>
        </div>
      </div>
      <div v-if="hoveredDay.tasks && hoveredDay.tasks.length" class="space-y-0.5 border-t border-gray-700 pt-1 mt-1">
        <div class="text-gray-500 text-[10px] uppercase font-medium">Tasks</div>
        <div v-for="t in hoveredDay.tasks" :key="t.id" class="flex items-center gap-1.5">
          <span :class="t.completed ? 'text-emerald-400' : 'text-gray-600'">{{ t.completed ? '\u2713' : '\u25CB' }}</span>
          <span :class="t.completed ? 'text-gray-500 line-through' : ''">{{ t.title }}</span>
        </div>
      </div>
      <div v-if="hoveredDay.scheduled === 0 && (!hoveredDay.tasks || hoveredDay.tasks.length === 0)" class="text-gray-500 text-[10px]">No activity</div>
    </div>

    <!-- Legend -->
    <div v-if="weeks.length" class="flex items-center gap-1.5 mt-3 text-[10px] text-gray-500 justify-end">
      <span>Less</span>
      <div v-for="(cls, i) in legendClasses" :key="i"
        class="rounded-[2px]"
        :class="cls"
        :style="{ width: cell + 'px', height: cell + 'px' }"></div>
      <span>More</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  grid: { type: Array, default: () => [] },
  year: { type: Number, default: () => new Date().getFullYear() },
})

defineEmits(['select'])

const hoveredDay = ref(null)
const hoveredWeekIdx = ref(0)
const hoveredDayIdx = ref(0)
const container = ref(null)
const containerW = ref(700)

const GAP = 3
const DAY_LABEL_W = 24

const cell = computed(() => {
  const wks = weeks.value.length || 53
  const avail = containerW.value - DAY_LABEL_W - GAP
  const perWeek = avail / wks
  const size = Math.floor((perWeek - GAP) / 7 * 7 + GAP) // not right, just fit weeks
  // simpler: total width = wks * (cell + GAP) - GAP, solve for cell
  const c = Math.floor((avail + GAP) / wks - GAP)
  return Math.min(Math.max(c, 8), 14)
})

const dayLabelW = DAY_LABEL_W

const dayLabels = [
  { label: 'Mon', show: false },
  { label: 'Tue', show: false },
  { label: 'Wed', show: true },
  { label: 'Thu', show: false },
  { label: 'Fri', show: false },
  { label: 'Sat', show: true },
  { label: 'Sun', show: false },
]

const legendClasses = [
  'bg-gray-800/40',
  'bg-gray-800/80',
  'bg-emerald-950',
  'bg-emerald-700',
  'bg-emerald-500',
  'bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.3)]',
]

// Each week is an array of 7 day-objects (or null for padding days)
const weeks = computed(() => {
  if (!props.grid.length) return []

  const year = props.year
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const dec31 = new Date(Date.UTC(year, 11, 31))

  const dayMap = {}
  for (const d of props.grid) dayMap[d.date] = d

  // Start from the Monday before or on Jan 1
  const startDow = (jan1.getUTCDay() + 6) % 7 // 0=Mon
  const startDate = new Date(jan1)
  startDate.setUTCDate(startDate.getUTCDate() - startDow)

  // End on the Sunday on or after Dec 31
  const endDow = (dec31.getUTCDay() + 6) % 7
  const endDate = new Date(dec31)
  endDate.setUTCDate(endDate.getUTCDate() + (6 - endDow))

  const result = []
  const cursor = new Date(startDate)

  while (cursor <= endDate) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().slice(0, 10)
      const inYear = cursor.getUTCFullYear() === year
      week.push(inYear ? (dayMap[dateStr] || { date: dateStr, scheduled: 0, completed: 0, ratio: null, habits: [], tasks: [] }) : null)
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    result.push(week)
  }
  return result
})

const monthLabels = computed(() => {
  if (!weeks.value.length) return []
  const labels = []
  let lastMonth = -1
  for (let wi = 0; wi < weeks.value.length; wi++) {
    // Find first non-null day in this week
    const first = weeks.value[wi].find(d => d !== null)
    if (first && first.date) {
      const d = new Date(first.date + 'T12:00:00Z')
      const month = d.getUTCMonth()
      if (month !== lastMonth) {
        labels.push({
          label: d.toLocaleString('en', { month: 'short' }),
          left: wi * (cell.value + GAP),
        })
        lastMonth = month
      }
    }
  }
  return labels
})

const tooltipPos = computed(() => {
  if (!hoveredDay.value) return {}
  const c = cell.value + GAP
  return {
    left: (hoveredWeekIdx.value * c + DAY_LABEL_W + 40) + 'px',
    top: (hoveredDayIdx.value * c + 60) + 'px',
  }
})

function getCellClass(day) {
  if (!day) return 'bg-transparent'
  if (day.scheduled === 0 && (!day.tasks || day.tasks.length === 0)) return 'bg-gray-800/40 hover:bg-gray-700/40 cursor-default'
  if (!day.ratio || day.ratio === 0) return 'bg-gray-800/80 hover:bg-gray-700/60 cursor-pointer'
  if (day.ratio <= 0.33) return 'bg-emerald-950 hover:brightness-110 cursor-pointer'
  if (day.ratio <= 0.66) return 'bg-emerald-700 hover:brightness-110 cursor-pointer'
  if (day.ratio < 1.0) return 'bg-emerald-500 hover:brightness-110 cursor-pointer'
  return 'bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.3)] hover:brightness-110 cursor-pointer'
}

function formatTipDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function measureWidth() {
  if (container.value) containerW.value = container.value.clientWidth
}

onMounted(() => {
  measureWidth()
  window.addEventListener('resize', measureWidth)
})
onUnmounted(() => window.removeEventListener('resize', measureWidth))
</script>
