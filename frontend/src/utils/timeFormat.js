import { ref } from 'vue'

const timeFormat = ref('24h')

const VALID = ['12h', '24h']

function sanitize(fmt) {
  return VALID.includes(fmt) ? fmt : '24h'
}

function initTimeFormat() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('bebetter_timeFormat')
    timeFormat.value = sanitize(stored)
    if (stored !== timeFormat.value) {
      localStorage.setItem('bebetter_timeFormat', timeFormat.value)
    }
  }
  return timeFormat.value
}

export function getTimeFormat() {
  return timeFormat.value
}

export function setTimeFormat(fmt) {
  timeFormat.value = sanitize(fmt)
  if (typeof window !== 'undefined') {
    localStorage.setItem('bebetter_timeFormat', timeFormat.value)
  }
  return timeFormat.value
}

export function formatTime(timeStr, format = null) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const use12h = format === '12h' || (format === null && getTimeFormat() === '12h')

  if (use12h) {
    const ampm = h >= 12 ? 'pm' : 'am'
    const hour = h % 12 || 12
    // Always show minutes for consistency with 24h mode (e.g. "2:00pm")
    return `${hour}:${String(m).padStart(2, '0')}${ampm}`
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatTimeForDisplay(timeStr) {
  return formatTime(timeStr)
}

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Human schedule label for a habit: "Every 3 days", "Daily", "Weekdays", "Mo We Fr".
export function formatSchedule(habit) {
  if (!habit) return ''
  const n = Number(habit.intervalDays)
  if (Number.isInteger(n) && n >= 2) return n === 7 ? 'Weekly' : `Every ${n} days`
  let days = habit.scheduledDays || habit.daysPerWeek
  if (typeof days === 'string') {
    try { days = JSON.parse(days) } catch { return '' }
  }
  if (habit.frequencyType === 'daily' || habit.frequencyType === 'always') return 'Daily'
  if (!Array.isArray(days) || !days.length) return ''
  if (days.length === 7) return 'Daily'
  if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'
  return days.map(d => DAY_ABBR[d] || '').filter(Boolean).join(' ')
}

initTimeFormat()
