<template>
  <div class="select-none" ref="container">
    <div v-if="weeks.length">
      <!-- Scroll wrapper -->
      <div class="overflow-x-auto -mx-1 px-1 pb-1 grid-scroll" ref="scrollRef" @scroll="onScroll" @wheel="onWheel">
        <div :style="{ width: gridWidth + 'px', minWidth: '100%' }">
          <!-- Month labels row -->
          <div class="relative h-[18px] mb-[3px]">
            <div v-for="(m, i) in monthLabels" :key="i"
              class="absolute text-[11px] text-[var(--bb-faint)]"
              :style="{ left: m.left + 'px' }">
              {{ m.label }}
            </div>
          </div>

          <!-- Grid body: day labels + weeks -->
          <div class="flex gap-[3px]">
            <!-- Day labels column -->
            <div class="flex flex-col gap-[3px] text-[10px] text-[var(--bb-faint)] shrink-0" :style="{ width: dayLabelW + 'px' }">
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
                    class="grid-cell rounded-[2px] transition-transform duration-100 ease-out hover:scale-125 hover:z-10 relative cursor-pointer"
                    :class="day ? getCellClass(day) : 'bg-transparent'"
                    :style="{ width: cell + 'px', height: cell + 'px' }"
                    @mouseenter="day ? onCellEnter(day, $event) : null"
                    @mousemove="onCellMove($event)"
                    @mouseleave="onCellLeave"
                    @click="day && (day.scheduled > 0 || day.completed > 0) && $emit('select', day)">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div v-if="hoveredDay" ref="tipRef" class="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl text-xs max-w-[220px] pointer-events-none">
        <div class="font-medium mb-1">{{ formatTipDate(hoveredDay.date) }}</div>
        <div v-if="hoveredDay.scheduled > 0" class="text-gray-400 mb-1">
          {{ hoveredDay.habits }}/{{ hoveredDay.scheduled }} habits done
          <span v-if="hoveredDay.tasks > 0" class="text-gray-500"> + {{ hoveredDay.tasks }} tasks</span>
        </div>
        <div v-if="hoveredDay.items && hoveredDay.items.length" class="space-y-0.5">
          <div v-for="(item, idx) in hoveredDay.items" :key="idx" class="flex items-center gap-1.5">
            <span class="text-emerald-400">&#10003;</span>
            <span class="text-gray-400">{{ item.emoji || '' }} {{ item.title }}</span>
          </div>
        </div>
        <div v-if="hoveredDay.scheduled === 0 && hoveredDay.habits === 0 && hoveredDay.tasks === 0" class="text-gray-500 text-[10px]">No activity</div>
      </div>
    </Teleport>

    <!-- Legend -->
    <div v-if="weeks.length" class="flex items-center gap-1.5 mt-3 text-[10px] text-[var(--bb-faint)] justify-end">
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
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  grid: { type: Array, default: () => [] },
  year: { type: Number, default: () => new Date().getFullYear() },
  fit: { type: Boolean, default: false },
})

defineEmits(['select'])

const hoveredDay = ref(null)
const tipRef = ref(null)
const tipX = ref(0)
const tipY = ref(0)
const container = ref(null)
const scrollRef = ref(null)
const containerW = ref(700)
const scrollLeft = ref(0)

const GAP = 3
const DAY_LABEL_W = 24
const MIN_CELL = 10
const MAX_CELL = 14

const isMobile = computed(() => containerW.value < 500)

const cell = computed(() => {
  if (isMobile.value) return MIN_CELL
  // When fit is requested (landing preview): size cells so the whole year
  // fills the container on desktop — no awkward scrollbar.
  if (props.fit && containerW.value > 0) {
    const wks = weeks.value.length || 53
    const avail = containerW.value - DAY_LABEL_W - GAP - wks * GAP
    return Math.max(MIN_CELL, Math.min(20, Math.floor(avail / wks)))
  }
  // On desktop, keep a good cell size (12px) so grid overflows and is scrollable
  return 12
})

const dayLabelW = DAY_LABEL_W

const gridWidth = computed(() => {
  const wks = weeks.value.length || 53
  return DAY_LABEL_W + GAP + wks * (cell.value + GAP)
})

const isScrollable = computed(() => gridWidth.value > containerW.value)

const scrollbarTrackW = computed(() => containerW.value - 8)
const indicatorW = computed(() => {
  if (!isScrollable.value) return scrollbarTrackW.value
  return Math.max(24, (containerW.value / gridWidth.value) * scrollbarTrackW.value)
})
const indicatorLeft = computed(() => {
  if (!isScrollable.value || gridWidth.value <= containerW.value) return 0
  const maxScroll = gridWidth.value - containerW.value
  const ratio = scrollLeft.value / maxScroll
  return ratio * (scrollbarTrackW.value - indicatorW.value)
})

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

const weeks = computed(() => {
  if (!props.grid.length) return []

  const year = props.year
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const dec31 = new Date(Date.UTC(year, 11, 31))

  const dayMap = {}
  for (const d of props.grid) dayMap[d.date] = d

  const startDow = (jan1.getUTCDay() + 6) % 7
  const startDate = new Date(jan1)
  startDate.setUTCDate(startDate.getUTCDate() - startDow)

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
      if (inYear) {
          const data = dayMap[dateStr]
          if (data) {
            const habits = data.habits ?? data.completed ?? 0
            const scheduled = data.scheduled ?? 0
            const ratio = scheduled > 0 ? habits / scheduled : (habits > 0 ? 1 : null)
            week.push({
              date: dateStr,
              scheduled,
              completed: data.completed || 0,
              ratio: (ratio !== null && !isNaN(ratio)) ? ratio : null,
              items: data.items || [],
              habits,
              tasks: data.tasks || 0,
            })
          } else {
            week.push({ date: dateStr, scheduled: 0, completed: 0, ratio: null, items: [], habits: 0, tasks: 0 })
          }
      } else {
        week.push(null)
      }
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
    const first = weeks.value[wi].find(d => d !== null)
    if (first && first.date) {
      const d = new Date(first.date + 'T12:00:00Z')
      const month = d.getUTCMonth()
      if (month !== lastMonth) {
        labels.push({
          label: d.toLocaleString('en', { month: 'short' }),
          left: (dayLabelW + GAP) + wi * (cell.value + GAP),
        })
        lastMonth = month
      }
    }
  }
  return labels
})

function onCellEnter(day, e) {
  hoveredDay.value = day
  positionTooltip(e)
}

function onCellMove(e) {
  positionTooltip(e)
}

function positionTooltip(e) {
  nextTick(() => {
    const tip = tipRef.value
    if (!tip) return
    const pad = 12
    const tipW = tip.offsetWidth || 220
    const tipH = tip.offsetHeight || 120
    let x = e.clientX + pad
    let y = e.clientY + pad
    if (x + tipW > window.innerWidth) x = e.clientX - tipW - pad
    if (y + tipH > window.innerHeight) y = e.clientY - tipH - pad
    if (x < 0) x = pad
    if (y < 0) y = pad
    tipX.value = x
    tipY.value = y
    tip.style.left = x + 'px'
    tip.style.top = y + 'px'
  })
}

function onCellLeave() {
  hoveredDay.value = null
}

function onScroll() {
  if (scrollRef.value) scrollLeft.value = scrollRef.value.scrollLeft
}

function onWheel(e) {
  if (!scrollRef.value) return
  const el = scrollRef.value
  const maxScroll = el.scrollWidth - el.clientWidth
  if (maxScroll <= 0) return

  const atLeft = el.scrollLeft <= 0
  const atRight = el.scrollLeft >= maxScroll - 1

  // If shift is held, let browser handle horizontal scroll natively
  if (e.shiftKey) return

  // If we can scroll in the direction of the wheel, consume it
  if (e.deltaY < 0 && !atLeft) {
    e.preventDefault()
    el.scrollLeft += e.deltaY
  } else if (e.deltaY > 0 && !atRight) {
    e.preventDefault()
    el.scrollLeft += e.deltaY
  }
  // Otherwise let the page scroll normally
}

function isToday(dateStr) {
  const now = new Date()
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return dateStr === key
}

function getCellClass(day) {
  if (!day) return 'bg-transparent'
  const today = isToday(day.date)
  const todayRing = today ? ' ring-2 ring-emerald-400/60 ring-offset-1 ring-offset-transparent' : ''
  if (day.scheduled === 0 && day.habits === 0 && day.tasks === 0 && day.completed === 0) {
    return 'bg-gray-800/40 hover:bg-gray-700/40 cursor-default' + todayRing
  }
  if (day.ratio === null || isNaN(day.ratio) || day.ratio === 0) {
    return 'bg-gray-800/80 hover:bg-gray-700/60 cursor-pointer' + todayRing
  }
  if (day.ratio > 0 && day.ratio <= 0.33) return 'bg-emerald-950 hover:brightness-110 cursor-pointer' + todayRing
  if (day.ratio <= 0.66) return 'bg-emerald-700 hover:brightness-110 cursor-pointer' + todayRing
  if (day.ratio < 1.0) return 'bg-emerald-500 hover:brightness-110 cursor-pointer' + todayRing
  return 'bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.3)] hover:brightness-110 cursor-pointer' + todayRing
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

<style scoped>
.grid-cell {
  position: relative;
}
.grid-cell[data-hover-glow] {
  box-shadow: 0 0 0 rgba(52, 211, 153, 0);
}
.grid-cell:hover.bg-emerald-400,
.grid-cell:hover.bg-emerald-500,
.grid-cell:hover.bg-emerald-700,
.grid-cell:hover.bg-emerald-950,
.grid-cell:hover.bg-gray-800\/40,
.grid-cell:hover.bg-gray-800\/80,
.grid-cell:hover.bg-gray-700\/60,
.grid-cell:hover.bg-gray-700\/40 {
  box-shadow: 0 0 10px 1px rgba(52, 211, 153, 0.4);
  z-index: 10;
}
.grid-scroll::-webkit-scrollbar {
  height: 8px;
}
.grid-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.grid-scroll::-webkit-scrollbar-thumb {
  background: rgba(120, 120, 130, 0.35);
  border-radius: 9999px;
}
</style>
