const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

router.get('/global', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isPublic: true, bannedUntil: null },
      select: { id: true, username: true, avatar: true },
    });

    const leaderboard = [];
    for (const user of users) {
      const totalLogs = await prisma.habitLog.count({ where: { userId: user.id } });
      if (totalLogs > 0) {
        leaderboard.push({ ...user, score: totalLogs });
      }
    }

    leaderboard.sort((a, b) => b.score - a.score);
    res.json({ leaderboard: leaderboard.slice(0, 50) });
  } catch (e) {
    console.error('leaderboard global error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
