<template>
  <div class="overflow-x-auto pb-2 select-none">
    <div class="inline-flex gap-3 min-w-max" v-if="weeks.length">
      <div class="flex flex-col gap-[3px] text-[10px] text-gray-500 pt-[22px]">
        <div class="h-[12px] flex items-center" v-for="d in dayLabels" :key="d.label">
          <span v-if="d.show">{{ d.label }}</span>
        </div>
      </div>
      <div>
        <div class="flex mb-[3px] h-[18px] relative">
          <div v-for="(m, i) in monthLabels" :key="i"
            class="text-[11px] absolute text-gray-500"
            :style="{ left: m.left + 'px' }">
            {{ m.label }}
          </div>
        </div>
        <div class="flex gap-[3px]">
          <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-[3px]">
            <div v-for="(day, di) in week.days" :key="di">
              <div
                class="rounded-[3px] cursor-pointer transition-transform duration-150 hover:scale-125 relative"
                :class="getCellClass(day)"
                :style="{ width: '12px', height: '12px' }"
                @mouseenter="day && day.scheduled > 0 ? (hoveredDay = day) : null"
                @mouseleave="hoveredDay = null"
                @click="day && (day.scheduled > 0 || day.tasks?.length > 0) && $emit('select', day)"
                :title="day ? tooltipText(day) : ''">
                <div v-if="day?.tasks?.length > 0 && !day?.ratio" class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hoveredDay" class="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl text-xs max-w-xs pointer-events-none"
      :style="tooltipStyle">
      <div class="font-medium mb-1">{{ formatDate(hoveredDay.date) }}</div>
      <div class="text-gray-400 mb-1" v-if="hoveredDay.scheduled > 0">
        {{ hoveredDay.completed }}/{{ hoveredDay.scheduled }} habits done
      </div>
      <div v-if="hoveredDay.habits?.length" class="space-y-0.5 mb-1">
        <div v-for="h in hoveredDay.habits" :key="h.id" class="flex items-center gap-1.5">
          <span :class="h.logged ? 'text-emerald-400' : 'text-gray-600'">{{ h.logged ? '✓' : '○' }}</span>
          <span :class="h.logged ? 'text-gray-500 line-through' : ''">{{ h.title }}</span>
        </div>
      </div>
      <div v-if="hoveredDay.tasks?.length" class="space-y-0.5 border-t border-gray-700 pt-1 mt-1">
        <div class="text-gray-500 text-[10px] uppercase font-medium">Tasks</div>
        <div v-for="t in hoveredDay.tasks" :key="t.id" class="flex items-center gap-1.5">
          <span :class="t.completed ? 'text-emerald-400' : 'text-gray-600'">{{ t.completed ? '✓' : '○' }}</span>
          <span :class="t.completed ? 'text-gray-500 line-through' : ''">{{ t.title }}</span>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-600 text-sm">
      <div class="text-2xl mb-2">📊</div>
      No activity data yet
    </div>

    <div v-if="weeks.length" class="flex items-center gap-1.5 mt-4 text-[10px] text-gray-500 justify-end">
      <span>Less</span>
      <div class="w-[12px] h-[12px] rounded-[3px] bg-gray-800/60 outline outline-1 outline-gray-700/40"></div>
      <div class="w-[12px] h-[12px] rounded-[3px] bg-emerald-950"></div>
      <div class="w-[12px] h-[12px] rounded-[3px] bg-emerald-700"></div>
      <div class="w-[12px] h-[12px] rounded-[3px] bg-emerald-500"></div>
      <div class="w-[12px] h-[12px] rounded-[3px] bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]"></div>
      <span>More</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  grid: { type: Array, default: () => [] },
})

defineEmits(['select'])

const hoveredDay = ref(null)
const hoveredEl = ref(null)

const dayLabels = [
  { label: 'Mon', show: false },
  { label: 'Tue', show: false },
  { label: 'Wed', show: true },
  { label: 'Thu', show: false },
  { label: 'Fri', show: false },
  { label: 'Sat', show: true },
  { label: 'Sun', show: false },
]

const weeks = computed(() => {
  if (!props.grid.length) return []
  const dayMap = {}
  for (const d of props.grid) dayMap[d.date] = d

  const firstDate = new Date(props.grid[0].date + 'T12:00:00Z')
  const startDow = (firstDate.getUTCDay() + 6) % 7
  const startDate = new Date(firstDate)
  startDate.setUTCDate(startDate.getUTCDate() - startDow)

  const lastDate = new Date(props.grid[props.grid.length - 1].date + 'T12:00:00Z')
  const endDow = (lastDate.getUTCDay() + 6) % 7
  const endDate = new Date(lastDate)
  endDate.setUTCDate(endDate.getUTCDate() + (6 - endDow))

  const result = []
  const cursor = new Date(startDate)
  let currentWeek = []

  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().slice(0, 10)
    currentWeek.push(dayMap[dateStr] || null)
    if (currentWeek.length === 7) {
      result.push({ days: currentWeek })
      currentWeek = []
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    result.push({ days: currentWeek })
  }
  return result
})

const monthLabels = computed(() => {
  if (!weeks.value.length) return []
  const labels = []
  let lastMonth = -1
  const weekWidth = 15
  for (let wi = 0; wi < weeks.value.length; wi++) {
    const firstDay = weeks.value[wi].days.find(d => d !== null)
    if (firstDay) {
      const d = new Date(firstDay.date + 'T12:00:00Z')
      const month = d.getUTCMonth()
      if (month !== lastMonth) {
        labels.push({ label: d.toLocaleString('en', { month: 'short' }), left: wi * weekWidth })
        lastMonth = month
      }
    }
  }
  return labels
})

const tooltipStyle = computed(() => {
  if (!hoveredDay.value) return {}
  const idx = props.grid.findIndex(d => d.date === hoveredDay.value.date)
  const weekIdx = Math.floor(idx / 7)
  const rowIdx = idx % 7
  return {
    left: (weekIdx * 15 + 30) + 'px',
    top: (rowIdx * 15 + 60) + 'px',
  }
})

function getCellClass(day) {
  if (!day) return 'bg-transparent pointer-events-none'
  if (day.scheduled === 0 && (!day.tasks || day.tasks.length === 0)) return 'bg-gray-800/40'
  if (!day.ratio || day.ratio === 0) return 'bg-gray-800/80'
  if (day.ratio <= 0.33) return 'bg-emerald-950'
  if (day.ratio <= 0.66) return 'bg-emerald-700'
  if (day.ratio < 1.0) return 'bg-emerald-500'
  return 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]'
}

function tooltipText(day) {
  const d = new Date(day.date + 'T12:00:00Z')
  const dateStr = d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
  const parts = []
  if (day.scheduled > 0) parts.push(`${day.completed}/${day.scheduled} habits`)
  if (day.tasks?.length) parts.push(`${day.tasks.filter(t => t.completed).length}/${day.tasks.length} tasks`)
  return `${dateStr} — ${parts.join(', ') || 'no items'}`
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
