const suppressUntil = { at: 0 }

function suppressGhostClicks(ms = 400) {
  suppressUntil.at = Date.now() + ms
}

function isGhostClick() {
  return Date.now() < suppressUntil.at
}

export function useTap(cb) {
  let startId = null
  let sx = 0
  let sy = 0

  const onPointerDown = (e) => {
    if (isGhostClick()) return
    startId = e.pointerId
    sx = e.clientX
    sy = e.clientY
    try { if (e.cancelable) e.preventDefault() } catch {}
  }

  const onPointerUp = (e) => {
    if (startId !== e.pointerId) return
    startId = null
    const d = Math.hypot(e.clientX - sx, e.clientY - sy)
    if (d < 14) {
      suppressGhostClicks()
      cb()
    }
  }

  const onKeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      suppressGhostClicks()
      cb()
    }
  }

  return { onPointerDown, onPointerUp, onKeydown }
}