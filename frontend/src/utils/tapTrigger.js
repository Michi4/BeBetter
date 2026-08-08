export function useTap(cb) {
  let startId = null
  let sx = 0
  let sy = 0

  const onPointerDown = (e) => {
    startId = e.pointerId
    sx = e.clientX
    sy = e.clientY
    try {
      if (e.currentTarget?.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    try { if (e.cancelable) e.preventDefault() } catch {}
  }

  const onPointerUp = (e) => {
    if (startId !== e.pointerId) return
    startId = null
    const d = Math.hypot(e.clientX - sx, e.clientY - sy)
    if (d < 14) cb()
  }

  const onPointerCancel = () => {
    startId = null
  }

  const onKeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      cb()
    }
  }

  return { onPointerDown, onPointerUp, onPointerCancel, onKeydown }
}