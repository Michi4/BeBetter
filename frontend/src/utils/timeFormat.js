export function getTimeFormat() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('bebetter_timeFormat') || '24h'
  }
  return '24h'
}

export function formatTime(timeStr, format = null) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const use12h = format === '12h' || (format === null && getTimeFormat() === '12h')
  
  if (use12h) {
    const ampm = h >= 12 ? 'pm' : 'am'
    const hour = h % 12 || 12
    return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
  }
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatTimeForDisplay(timeStr) {
  return formatTime(timeStr)
}