const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

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
        habitLogs: { select: { completedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = challenges.map((c) => {
      const creatorLogs = c.habitLogs.filter((l) => l.userId === c.creatorId);
      const opponentLogs = c.habitLogs.filter((l) => l.userId === c.opponentId);
      return {
        ...c,
        creatorProgress: creatorLogs.length,
        opponentProgress: opponentLogs.length,
      };
    });

    res.json({ challenges: enriched });
  } catch (e) {
    console.error(e);
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
        startDate: new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
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
    });

    res.json({ challenge });
  } catch (e) {
    console.error(e);
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
        habitLogs: { select: { completedAt: true, userId: true } },
      },
    });

    if (!challenge) return res.status(404).json({ error: 'Not found' });

    if (challenge.creatorId !== req.userId && challenge.opponentId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const creatorLogs = challenge.habitLogs.filter((l) => l.userId === challenge.creatorId);
    const opponentLogs = challenge.habitLogs.filter((l) => l.userId === challenge.opponentId);

    res.json({
      challenge: {
        ...challenge,
        creatorProgress: creatorLogs.length,
        opponentProgress: opponentLogs.length,
      },
    });
  } catch (e) {
    console.error(e);
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

    const logs = await prisma.habitLog.findMany({
      where: { habitId: challenge.habitId },
      select: { completedAt: true, userId: true },
      orderBy: { completedAt: 'asc' },
    });

    const creatorLogs = logs.filter((l) => l.userId === challenge.creatorId);
    const opponentLogs = logs.filter((l) => l.userId === challenge.opponentId);

    res.json({
      creatorProgress: creatorLogs.length,
      opponentProgress: opponentLogs.length,
      creatorLogs: creatorLogs.map((l) => l.completedAt),
      opponentLogs: opponentLogs.map((l) => l.completedAt),
    });
  } catch (e) {
    console.error(e);
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

    if (winnerId) {
      if (winnerId !== challenge.creatorId && winnerId !== challenge.opponentId) {
        return res.status(400).json({ error: 'Winner must be creator or opponent' });
      }
    }

    const resolved = await prisma.challenge.update({
      where: { id },
      data: {
        status: 'resolved',
        winnerId: winnerId || null,
        resolvedAt: new Date(),
      },
    });

    await prisma.activity.create({
      data: {
        userId: req.userId,
        type: 'challenge_resolved',
        payload: { challengeId: id, winnerId: winnerId || null },
        visibility: 'friends',
      },
    });

    res.json({ challenge: resolved });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
