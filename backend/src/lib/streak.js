function calculateBestStreak(logs) {
  let bestStreak = 0;
  let currentStreak = 0;
  let lastDate = null;

  const seenDays = new Set();
  for (const l of logs) {
    const d = new Date(l.completedAt);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    if (seenDays.has(key)) continue; // multiple logs the same day = one streak day
    seenDays.add(key);
    if (lastDate) {
      const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
      } else if (diff > 1) {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    if (currentStreak > bestStreak) bestStreak = currentStreak;
    lastDate = d;
  }

  return { bestStreak, currentStreak };
}

module.exports = { calculateBestStreak };
