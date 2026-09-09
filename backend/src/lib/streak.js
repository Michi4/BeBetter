// Streaks over completion logs. The optional `isDue` predicate marks which
// calendar days count (interval habits: due dates only). Without it, every
// calendar day counts (legacy behavior for weekday habits — unchanged).
function calculateBestStreak(logs, isDue) {
  const seenDays = new Set();
  const days = [];
  for (const l of logs) {
    const d = new Date(l.completedAt);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    if (seenDays.has(key)) continue; // multiple logs the same day = one streak day
    seenDays.add(key);
    days.push(d);
  }
  if (!days.length) return { bestStreak: 0, currentStreak: 0 };
  days.sort((a, b) => a - b);

  const due = typeof isDue === 'function' ? isDue : null;

  const isDueDay = (d) => (due ? due(d) : true);
  // Next due date strictly after `d` (bounded walk; ranges are small).
  const nextDueAfter = (d) => {
    const c = new Date(d);
    for (let i = 1; i <= 366; i++) {
      c.setDate(c.getDate() + 1);
      if (isDueDay(c)) return new Date(c);
    }
    return null;
  };

  let bestStreak = 0;
  let currentStreak = 0;
  let lastCounted = null;
  for (const d of days) {
    if (!isDueDay(d)) continue; // off-day logs neither count nor break
    if (!lastCounted) {
      currentStreak = 1;
    } else {
      const nxt = nextDueAfter(lastCounted);
      currentStreak = nxt && nxt.getTime() === d.getTime() ? currentStreak + 1 : 1;
    }
    if (currentStreak > bestStreak) bestStreak = currentStreak;
    lastCounted = d;
  }
  return { bestStreak, currentStreak };
}

module.exports = { calculateBestStreak };
