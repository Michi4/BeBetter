const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

router.get('/leaderboard/friends', authMiddleware, async (req, res) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ user1Id: req.userId }, { user2Id: req.userId }] },
    });
    const friendIds = friendships.map(f => f.user1Id === req.userId ? f.user2Id : f.user1Id);
    const allIds = [req.userId, ...friendIds];

    const leaderboard = [];
    for (const uid of allIds) {
      const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, username: true, avatar: true } });
      if (!user) continue;
      const totalLogs = await prisma.habitLog.count({ where: { userId: uid } });
      const wins = await prisma.challenge.count({ where: { OR: [{ creatorId: uid }, { opponentId: uid }], status: 'resolved', winnerId: uid } });
      leaderboard.push({ ...user, score: totalLogs, wins });
    }

    leaderboard.sort((a, b) => b.score - a.score);
    res.json({ leaderboard });
  } catch (e) {
    console.error('leaderboard friends error:', e.message);
    res.json({ leaderboard: [] });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [{ creatorId: req.userId }, { opponentId: req.userId }],
      },
      include: {
        habit: { select: { id: true, title: true, emoji: true } },
        creator: { select: { id: true, username: true, avatar: true } },
        opponent: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(challenges.map(async (c) => {
      const creatorLogs = await prisma.habitLog.count({ where: { habitId: c.habitId, userId: c.creatorId } });
      const opponentLogs = await prisma.habitLog.count({ where: { habitId: c.habitId, userId: c.opponentId } });
      return { ...c, creatorProgress: creatorLogs, opponentProgress: opponentLogs };
    }));

    res.json({ challenges: enriched });
  } catch (e) {
    console.error('challenges GET error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { habitId, opponentId, endDate } = req.body;
    if (!habitId || !opponentId) return res.status(400).json({ error: 'habitId and opponentId required' });

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Habit not found' });

    if (habit.userId === opponentId) return res.status(400).json({ error: 'Cannot challenge yourself' });

    const opponent = await prisma.user.findUnique({ where: { id: opponentId } });
    if (!opponent) return res.status(404).json({ error: 'Opponent not found' });

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: opponentId },
          { user1Id: opponentId, user2Id: req.userId },
        ],
      },
    });
    if (!friendship) return res.status(400).json({ error: 'Must be friends to create a challenge' });

    const challenge = await prisma.challenge.create({
      data: {
        creatorId: req.userId,
        opponentId,
        habitId,
        title: `${habit.title} challenge`,
        startDate: new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
      include: {
        habit: { select: { id: true, title: true, emoji: true } },
        creator: { select: { id: true, username: true, avatar: true } },
        opponent: { select: { id: true, username: true, avatar: true } },
      },
    });

    await prisma.activity.create({
      data: {
        userId: req.userId,
        type: 'challenge_created',
        payload: { challengeId: challenge.id, opponentId },
        visibility: 'friends',
      },
    }).catch(() => {});

    res.json({ challenge });
  } catch (e) {
    console.error('challenges POST error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        habit: { select: { id: true, title: true, emoji: true } },
        creator: { select: { id: true, username: true, avatar: true } },
        opponent: { select: { id: true, username: true, avatar: true } },
      },
    });

    if (!challenge) return res.status(404).json({ error: 'Not found' });
    if (challenge.creatorId !== req.userId && challenge.opponentId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const creatorLogs = await prisma.habitLog.count({ where: { habitId: challenge.habitId, userId: challenge.creatorId } });
    const opponentLogs = await prisma.habitLog.count({ where: { habitId: challenge.habitId, userId: challenge.opponentId } });

    res.json({
      challenge: { ...challenge, creatorProgress: creatorLogs, opponentProgress: opponentLogs },
    });
  } catch (e) {
    console.error('challenges GET :id error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/progress', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return res.status(404).json({ error: 'Not found' });
    if (challenge.creatorId !== req.userId && challenge.opponentId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const creatorCount = await prisma.habitLog.count({ where: { habitId: challenge.habitId, userId: challenge.creatorId } });
    const opponentCount = await prisma.habitLog.count({ where: { habitId: challenge.habitId, userId: challenge.opponentId } });

    res.json({
      creatorProgress: creatorCount,
      opponentProgress: opponentCount,
    });
  } catch (e) {
    console.error('challenge progress error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerId } = req.body;

    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return res.status(404).json({ error: 'Not found' });
    if (challenge.creatorId !== req.userId && challenge.opponentId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (challenge.status === 'resolved') {
      return res.status(400).json({ error: 'Challenge already resolved' });
    }
    if (winnerId && winnerId !== challenge.creatorId && winnerId !== challenge.opponentId) {
      return res.status(400).json({ error: 'Winner must be creator or opponent' });
    }

    const resolved = await prisma.challenge.update({
      where: { id },
      data: { status: 'resolved', winnerId: winnerId || null },
    });

    await prisma.activity.create({
      data: {
        userId: req.userId,
        type: 'challenge_resolved',
        payload: { challengeId: id, winnerId: winnerId || null },
        visibility: 'friends',
      },
    }).catch(() => {});

    res.json({ challenge: resolved });
  } catch (e) {
    console.error('challenges resolve error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
