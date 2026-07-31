const { Router } = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

const INVITE_SECRET = process.env.JWT_SECRET || 'bebetter-challenge-invite-secret';

function createInviteToken(challengeId) {
  const payload = { challengeId, iat: Math.floor(Date.now() / 1000) };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', INVITE_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyInviteToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = crypto.createHmac('sha256', INVITE_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (sig !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (Date.now() / 1000 - payload.iat > 30 * 24 * 60 * 60) return null;
    return payload;
  } catch {
    return null;
  }
}

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

    const challenge = await prisma.challenge.create({
      data: {
        creatorId: req.userId,
        opponentId,
        habitId,
        title: `${habit.title} challenge`,
        startDate: new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      include: {
        habit: { select: { id: true, title: true, emoji: true } },
        creator: { select: { id: true, username: true, avatar: true } },
        opponent: { select: { id: true, username: true, avatar: true } },
      },
    });

    const creatorUser = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    await prisma.notification.create({
      data: {
        userId: opponentId,
        type: 'challenge_invite',
        message: `${creatorUser?.username || 'Someone'} challenged you to "${habit.title}"!`,
        data: { challengeId: challenge.id, habitTitle: habit.title, creatorName: creatorUser?.username },
      },
    }).catch(() => {});

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

router.post('/invite-link', authMiddleware, async (req, res) => {
  try {
    const { habitId, endDate } = req.body;
    if (!habitId) return res.status(400).json({ error: 'habitId required' });

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Habit not found' });

    const challenge = await prisma.challenge.create({
      data: {
        creatorId: req.userId,
        opponentId: req.userId,
        habitId,
        title: `${habit.title} challenge`,
        startDate: new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
    });

    const token = createInviteToken(challenge.id);
    res.json({ token, challengeId: challenge.id });
  } catch (e) {
    console.error('invite-link error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/invite/:token', async (req, res) => {
  try {
    const payload = verifyInviteToken(req.params.token);
    if (!payload) return res.status(400).json({ error: 'Invalid or expired invite link' });

    const challenge = await prisma.challenge.findUnique({
      where: { id: payload.challengeId },
      include: {
        habit: { select: { id: true, title: true, emoji: true, description: true, frequencyType: true, daysPerWeek: true, verificationType: true } },
        creator: { select: { id: true, username: true, avatar: true } },
      },
    });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    res.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        endDate: challenge.endDate,
        habit: challenge.habit,
        creator: challenge.creator,
        status: challenge.status,
      },
    });
  } catch (e) {
    console.error('invite get error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/invite/:token/accept', authMiddleware, async (req, res) => {
  try {
    const payload = verifyInviteToken(req.params.token);
    if (!payload) return res.status(400).json({ error: 'Invalid or expired invite link' });

    const challenge = await prisma.challenge.findUnique({ where: { id: payload.challengeId } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.status !== 'pending') return res.status(400).json({ error: 'Challenge already accepted' });
    if (challenge.creatorId === req.userId) return res.status(400).json({ error: 'Cannot accept your own challenge' });

    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: { opponentId: req.userId, status: 'active' },
      include: {
        habit: { select: { id: true, title: true, emoji: true } },
        creator: { select: { id: true, username: true, avatar: true } },
        opponent: { select: { id: true, username: true, avatar: true } },
      },
    });

    const invAcceptUser = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    await prisma.notification.create({
      data: {
        userId: challenge.creatorId,
        type: 'challenge_accepted',
        message: `${invAcceptUser?.username || 'Someone'} accepted your challenge!`,
        data: { challengeId: challenge.id },
      },
    }).catch(() => {});

    res.json({ challenge: updated });
  } catch (e) {
    console.error('invite accept error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return res.status(404).json({ error: 'Not found' });
    if (challenge.opponentId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    if (challenge.status !== 'pending') return res.status(400).json({ error: 'Challenge already ' + challenge.status });

    const updated = await prisma.challenge.update({
      where: { id },
      data: { status: 'active' },
      include: {
        habit: { select: { id: true, title: true, emoji: true } },
        creator: { select: { id: true, username: true, avatar: true } },
        opponent: { select: { id: true, username: true, avatar: true } },
      },
    });

    const acceptUser = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    await prisma.notification.create({
      data: {
        userId: challenge.creatorId,
        type: 'challenge_accepted',
        message: `${acceptUser?.username || 'Someone'} accepted your challenge "${challenge.title}"!`,
        data: { challengeId: id },
      },
    }).catch(() => {});

    res.json({ challenge: updated });
  } catch (e) {
    console.error('challenge accept error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/decline', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return res.status(404).json({ error: 'Not found' });
    if (challenge.opponentId !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    await prisma.challenge.update({ where: { id }, data: { status: 'declined' } });

    const declineUser = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    await prisma.notification.create({
      data: {
        userId: challenge.creatorId,
        type: 'challenge_declined',
        message: `${declineUser?.username || 'Someone'} declined your challenge "${challenge.title}".`,
        data: { challengeId: id },
      },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    console.error('challenge decline error:', e.message);
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
    const opponentLogs = challenge.opponentId !== challenge.creatorId
      ? await prisma.habitLog.count({ where: { habitId: challenge.habitId, userId: challenge.opponentId } })
      : 0;

    res.json({
      challenge: { ...challenge, creatorProgress: creatorLogs, opponentProgress: opponentLogs },
    });
  } catch (e) {
    console.error('challenges GET :id error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/grid', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return res.status(404).json({ error: 'Not found' });
    if (challenge.creatorId !== req.userId && challenge.opponentId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const from = new Date(challenge.startDate);
    const to = challenge.endDate || new Date();

    const [creatorLogs, opponentLogs] = await Promise.all([
      prisma.habitLog.findMany({
        where: { habitId: challenge.habitId, userId: challenge.creatorId, completedAt: { gte: from, lte: to } },
        select: { completedAt: true },
      }),
      challenge.opponentId !== challenge.creatorId
        ? prisma.habitLog.findMany({
            where: { habitId: challenge.habitId, userId: challenge.opponentId, completedAt: { gte: from, lte: to } },
            select: { completedAt: true },
          })
        : [],
    ]);

    const grid = {};
    for (const log of creatorLogs) {
      const day = new Date(log.completedAt).toISOString().split('T')[0];
      if (!grid[day]) grid[day] = { creator: 0, opponent: 0 };
      grid[day].creator++;
    }
    for (const log of opponentLogs) {
      const day = new Date(log.completedAt).toISOString().split('T')[0];
      if (!grid[day]) grid[day] = { creator: 0, opponent: 0 };
      grid[day].opponent++;
    }

    const totalDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    const days = [];
    const cur = new Date(from);
    while (cur <= to) {
      const ds = cur.toISOString().split('T')[0];
      const data = grid[ds] || { creator: 0, opponent: 0 };
      days.push({ date: ds, creator: data.creator, opponent: data.opponent });
      cur.setDate(cur.getDate() + 1);
    }

    res.json({ grid: days, startDate: from, endDate: to, totalDays });
  } catch (e) {
    console.error('challenge grid error:', e.message);
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
