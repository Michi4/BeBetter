const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [{ creatorId: req.userId }, { opponentId: req.userId }],
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true, username: true } },
        opponent: { select: { id: true, name: true, avatar: true, username: true } },
        habit: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ challenges });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { opponentId, habitId, title, description, startDate, endDate, stake } = req.body;
    if (!opponentId || !habitId || !title || !startDate || !endDate) {
      return res.status(400).json({ error: 'opponentId, habitId, title, startDate, endDate are required' });
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: opponentId },
          { user1Id: opponentId, user2Id: req.userId },
        ],
      },
    });
    if (!friendship) return res.status(403).json({ error: 'Can only challenge friends' });

    const challenge = await prisma.challenge.create({
      data: {
        creatorId: req.userId,
        opponentId,
        habitId,
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        stake: stake || null,
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true, username: true } },
        opponent: { select: { id: true, name: true, avatar: true, username: true } },
        habit: { select: { id: true, title: true } },
      },
    });

    await prisma.activity.create({
      data: {
        userId: req.userId,
        type: 'challenge_created',
        payload: { challengeId: challenge.id, opponentId, title },
        visibility: 'friends',
      },
    });

    const opponent = await prisma.user.findUnique({ where: { id: opponentId }, select: { name: true } });
    await prisma.notification.create({
      data: {
        userId: opponentId,
        type: 'challenge',
        title: 'New Challenge',
        message: `${req.userId} challenged you: ${title}`,
        link: `/challenges`,
      },
    });

    res.status(201).json({ challenge });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/progress', async (req, res) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: { habit: true },
    });
    if (!challenge) return res.status(404).json({ error: 'Not found' });

    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);

    const [creatorLogs, opponentLogs] = await Promise.all([
      prisma.habitLog.count({
        where: {
          habitId: challenge.habitId,
          userId: challenge.creatorId,
          completedAt: { gte: start, lte: end },
          status: 'completed',
        },
      }),
      prisma.habitLog.count({
        where: {
          habitId: challenge.habitId,
          userId: challenge.opponentId,
          completedAt: { gte: start, lte: end },
          status: 'completed',
        },
      }),
    ]);

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    res.json({
      challenge: {
        ...challenge,
        creatorProgress: creatorLogs,
        opponentProgress: opponentLogs,
        totalDays,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/leaderboard/friends', async (req, res) => {
  try {
    const friendIds = await prisma.friendship.findMany({
      where: { OR: [{ user1Id: req.userId }, { user2Id: req.userId }] },
    }).then(fs => fs.map(f => f.user1Id === req.userId ? f.user2Id : f.user1Id));

    const allIds = [req.userId, ...friendIds];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = await prisma.user.findMany({
      where: { id: { in: allIds } },
      select: {
        id: true, name: true, avatar: true, username: true,
        _count: {
          select: {
            logs: {
              where: { status: 'completed', completedAt: { gte: thirtyDaysAgo } },
            },
          },
        },
      },
    });

    const leaderboard = users
      .map(u => ({ ...u, completions30d: u._count.logs, _count: undefined }))
      .sort((a, b) => b.completions30d - a.completions30d)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    res.json({ leaderboard });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/resolve', async (req, res) => {
  try {
    const { winnerId } = req.body;
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: req.params.id,
        OR: [{ creatorId: req.userId }, { opponentId: req.userId }],
      },
    });
    if (!challenge) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: { status: 'completed', winnerId: winnerId || null },
    });

    if (winnerId) {
      await prisma.activity.create({
        data: {
          userId: winnerId,
          type: 'challenge_won',
          payload: { challengeId: challenge.id, title: challenge.title },
          visibility: 'friends',
        },
      });
    }

    res.json({ challenge: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
