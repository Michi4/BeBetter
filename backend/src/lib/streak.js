function calculateBestStreak(logs) {
  let bestStreak = 0;
  let currentStreak = 0;
  let lastDate = null;

  for (const l of logs) {
    const d = new Date(l.completedAt);
    d.setHours(0, 0, 0, 0);
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

  return bestStreak;
}

module.exports = { calculateBestStreak };
