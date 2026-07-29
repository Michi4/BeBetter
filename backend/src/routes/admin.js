const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

async function adminOnly(req, res, next) {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

router.post('/reports', async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'targetType, targetId, and reason are required' });
    }
    const report = await prisma.report.create({
      data: { reporterId: req.userId, targetType, targetId, reason, description: description || null },
    });
    res.status(201).json({ report });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unread = await prisma.notification.count({ where: { userId: req.userId, read: false } });
    res.json({ notifications, unread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/notifications/read', async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.userId }, data: { read: true } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/stats', adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalHabits, totalLogs, totalPresets, totalReports, activeBreaks, activeVacations] = await Promise.all([
      prisma.user.count(),
      prisma.habit.count(),
      prisma.habitLog.count(),
      prisma.preset.count(),
      prisma.report.count(),
      prisma.habitBreak.count({
        where: {
          OR: [
            { endDate: null },
            { endDate: { gt: new Date() } },
          ],
        },
      }),
      prisma.vacation.count({
        where: {
          OR: [
            { endDate: null },
            { endDate: { gt: new Date() } },
          ],
        },
      }),
    ]);

    const usersWithStreak = await prisma.user.findMany({
      select: {
        id: true,
        _count: {
          select: {
            logs: {
              where: { status: 'completed' },
            },
          },
        },
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let totalStreaks = 0;
    for (const u of usersWithStreak) {
      if (u._count.logs === 0) continue;
      const logs = await prisma.habitLog.findMany({
        where: { userId: u.id, status: 'completed' },
        orderBy: { completedAt: 'desc' },
        take: 100,
      });
      const logDays = new Set(logs.map(l => l.completedAt.toISOString().slice(0, 10)));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cursor = new Date(today);
      if (!logDays.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
      let streak = 0;
      while (logDays.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      if (streak > 0) totalStreaks++;
    }

    res.json({
      totalUsers,
      totalHabits,
      totalLogs,
      totalStreaks,
      totalPresets,
      totalReports,
      activeBreaks,
      activeVacations,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/reports', adminOnly, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: { reporter: { select: { id: true, name: true, email: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reports });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/admin/reports/:id', adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status, adminNote: adminNote || null },
    });
    res.json({ report });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/users', adminOnly, async (req, res) => {
  try {
    const { q } = req.query;
    const where = q && q.length >= 2 ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
      ],
    } : {};
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, username: true, role: true, bannedUntil: true, createdAt: true,
        _count: { select: { habits: true, logs: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/users/:id/ban', adminOnly, async (req, res) => {
  try {
    const { days } = req.body;
    const until = new Date();
    until.setDate(until.getDate() + (days || 7));
    await prisma.user.update({ where: { id: req.params.id }, data: { bannedUntil: until } });

    await prisma.notification.create({
      data: {
        userId: req.params.id,
        type: 'warning',
        title: 'Account Suspended',
        message: `Your account has been suspended for ${days || 7} days.`,
      },
    });

    res.json({ ok: true, bannedUntil: until });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/users/:id/unban', adminOnly, async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { bannedUntil: null } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/users/:id/warn', adminOnly, async (req, res) => {
  try {
    const { message } = req.body;
    await prisma.notification.create({
      data: {
        userId: req.params.id,
        type: 'warning',
        title: 'Warning',
        message: message || 'Your behavior has been flagged. Please review our community guidelines.',
      },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/referrals', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { referralCode: true } });
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ user1Id: req.userId }, { user2Id: req.userId }] },
    });
    const friendCount = friendships.length;

    const referredActivities = await prisma.activity.findMany({
      where: { userId: req.userId, type: 'friend_joined' },
    });

    res.json({ referralCode: user.referralCode, totalReferred: referredActivities.length, totalFriends: friendCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/leaderboard/global', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = await prisma.user.findMany({
      where: { bannedUntil: null },
      select: {
        id: true, name: true, avatar: true, username: true,
        _count: {
          select: {
            logs: { where: { status: 'completed', completedAt: { gte: thirtyDaysAgo } } },
          },
        },
      },
    });

    const leaderboard = users
      .map(u => ({ ...u, completions30d: u._count.logs, _count: undefined }))
      .sort((a, b) => b.completions30d - a.completions30d)
      .slice(0, 50)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    res.json({ leaderboard });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
