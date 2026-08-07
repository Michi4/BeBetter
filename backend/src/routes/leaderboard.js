const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

router.get('/global', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isPublic: true, isDemo: false, isTest: false, bannedUntil: null },
      select: { id: true, username: true, avatar: true },
    });

    const userIds = users.map(u => u.id);
    const logCounts = await prisma.habitLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: { id: true },
    });
    const countMap = new Map(logCounts.map(l => [l.userId, l._count.id]));

    const leaderboard = users
      .map(u => ({ ...u, score: countMap.get(u.id) || 0 }))
      .filter(u => u.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    res.json({ leaderboard });
  } catch (e) {
    console.error('leaderboard global error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
