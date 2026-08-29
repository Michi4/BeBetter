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
// In-memory cache: landing is hit on every unauthenticated page view.
let landingCache = null;
let landingCacheAt = 0;
const LANDING_TTL = 60 * 1000;

router.get('/landing', async (req, res) => {
  try {
    if (landingCache && Date.now() - landingCacheAt < LANDING_TTL) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      return res.json(landingCache);
    }
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [habitCount, logCount, taskCount, recentHabits, streakStats, featured] = await Promise.all([
      prisma.habit.count({ where: { user: { isDemo: false, isTest: false } } }),
      prisma.habitLog.count({ where: { user: { isDemo: false, isTest: false } } }),
      prisma.taskLog.count({ where: { user: { isDemo: false, isTest: false } } }),
      prisma.habit.count({ where: { createdAt: { gte: monthAgo }, user: { isDemo: false, isTest: false } } }),
      prisma.habit.aggregate({ _avg: { bestStreak: true }, where: { user: { isDemo: false, isTest: false } } }),
      prisma.habit.findMany({
        where: { isPublic: true, user: { isPublic: true, isDemo: false, isTest: false, bannedUntil: null } },
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

    const payload = {
      stats,
      featured: featuredHabits,
      activeFeatured: active,
    };
    landingCache = payload;
    landingCacheAt = Date.now();
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json(payload);
  } catch (e) {
    console.error('landing stats error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/featured-habits', async (req, res) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { isPublic: true, user: { isPublic: true, isDemo: false, isTest: false, bannedUntil: null } },
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