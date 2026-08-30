const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseJsonList(val) {
  if (val == null) return []
  try {
    const arr = typeof val === 'string' ? JSON.parse(val) : val
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// Format a habit/preset's recurrence for display. Prefers the newer
// `schedules` array (slots with days), falls back to daysPerWeek and
// finally frequencyType.
export function formatRecurrence(h) {
  if (!h) return 'Daily'

  let days = []
  if (Array.isArray(h.schedules) && h.schedules.length) {
    const union = new Set()
    for (const s of h.schedules) {
      if (Array.isArray(s?.days)) for (const d of s.days) union.add(Number(d))
    }
    days = [...union].sort((a, b) => a - b)
  }

  if (!days.length) days = parseJsonList(h.daysPerWeek)

  const isAll = days.length === 7
  const isWeekdays = days.length === 5 && days.every(d => d >= 1 && d <= 5)
  if (isAll || h.frequencyType === 'daily' || h.frequencyType === 'always') return 'Daily'
  if (isWeekdays) return 'Weekdays'

  if (days.length) {
    return days.map(d => DAYS[d]).filter(Boolean).join(', ')
  }

  if (h.frequencyType === 'weekdays') return 'Weekdays'
  if (h.frequencyType === 'weekends') return 'Weekends'
  return h.frequencyType || 'Daily'
}
