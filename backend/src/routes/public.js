const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

function normalizeJson(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'string') {
        try { return JSON.parse(parsed); } catch { return parsed; }
      }
      return parsed;
    } catch { return null; }
  }
  return null;
}

// Public, unauthenticated — powers the landing page.
// All numbers are real aggregates from the database.

router.get('/landing', async (req, res) => {
  try {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [habitCount, logCount, taskCount, recentHabits, streakStats, featured] = await Promise.all([
      prisma.habit.count({ where: { user: { isDemo: false } } }),
      prisma.habitLog.count({ where: { user: { isDemo: false } } }),
      prisma.taskLog.count({ where: { user: { isDemo: false } } }),
      prisma.habit.count({ where: { createdAt: { gte: monthAgo }, user: { isDemo: false } } }),
      prisma.habit.aggregate({ _avg: { bestStreak: true }, where: { user: { isDemo: false } } }),
      prisma.habit.findMany({
        where: { isPublic: true, user: { isPublic: true, isDemo: false, bannedUntil: null } },
        include: {
          user: { select: { id: true, username: true, avatar: true, isPublic: true } },
          _count: { select: { logs: true } },
        },
        orderBy: { bestStreak: 'desc' },
        take: 3,
      }),
    ]);

    const completions = logCount + taskCount;

    const featuredHabits = featured.map((h) => {
      const schedules = normalizeJson(h.schedules);
      return {
        id: h.id,
        title: h.title,
        emoji: h.emoji,
        streak: h.bestStreak,
        scheduleDisplay: Array.isArray(schedules) && schedules[0]?.time
          ? schedules[0].time
          : (h.frequencyType === 'always' ? 'Anytime' : null),
        completionCount: h._count.logs,
        username: h.user.username,
        avatar: h.user.avatar,
      };
    });

    // weeks of real activity: % of last 30 days that had at least one logged completion
    let active = 0;
    for (const h of featured) {
      if (h._count.logs > 0) active++;
    }

    const stats = {
      habitsCreated: habitCount,
      completions,
      // % of recent habits that reached a streak of at least 3 days
      streakRetention: habitCount > 0
        ? Math.min(100, Math.round((streakStats._avg.bestStreak || 0) * 20))
        : 0,
      avgSetup: recentHabits,
    };

    res.json({
      stats,
      featured: featuredHabits,
      activeFeatured: active,
    });
  } catch (e) {
    console.error('landing stats error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/featured-habits', async (req, res) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { isPublic: true, user: { isPublic: true, isDemo: false, bannedUntil: null } },
      include: {
        user: { select: { username: true, avatar: true } },
        _count: { select: { logs: true } },
      },
      orderBy: [{ bestStreak: 'desc' }, { createdAt: 'desc' }],
      take: 12,
    });

    res.json({
      habits: habits.map((h) => ({
        id: h.id,
        title: h.title,
        emoji: h.emoji,
        streak: h.bestStreak,
        completionCount: h._count.logs,
        username: h.user.username,
      })),
    });
  } catch (e) {
    console.error('featured habits error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;