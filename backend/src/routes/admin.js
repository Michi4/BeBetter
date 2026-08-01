const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};

router.use(authMiddleware, adminMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const [users, habits, logs, tasks, taskLogs] = await Promise.all([
      prisma.user.count(),
      prisma.habit.count(),
      prisma.habitLog.count(),
      prisma.task.count(),
      prisma.taskLog.count(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeToday, newUsersWeek] = await Promise.all([
      prisma.habitLog.findMany({
        where: { completedAt: { gte: today, lt: tomorrow } },
        select: { userId: true },
      }).then((logs) => new Set(logs.map((l) => l.userId)).size),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    res.json({
      totalUsers: users,
      totalHabits: habits,
      totalLogs: logs,
      totalTasks: tasks,
      totalTaskLogs: taskLogs,
      activeToday,
      newUsersWeek,
    });
  } catch (e) {
    console.error('admin stats error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { q } = req.query;
    const where = {};
    if (q && q.length >= 2) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, email: true, username: true, role: true,
        bannedUntil: true, createdAt: true, _count: { select: { habits: true, logs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (e) {
    console.error('admin users error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'moderator', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const user = await prisma.user.update({ where: { id }, data: { role } });
    res.json({ user: { id: user.id, role: user.role } });
  } catch (e) {
    console.error('admin role error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/:id/ban', async (req, res) => {
  try {
    const { id } = req.params;
    const { days, reason } = req.body;

    if (!days || typeof days !== 'number' || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days must be a number between 1 and 365' });
    }

    const bannedUntil = new Date();
    bannedUntil.setDate(bannedUntil.getDate() + days);

    const user = await prisma.user.update({
      where: { id },
      data: { bannedUntil, banReason: reason || null },
    });

    res.json({ user: { id: user.id, bannedUntil: user.bannedUntil, banReason: user.banReason } });
  } catch (e) {
    console.error('admin ban error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/:id/unban', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { bannedUntil: null, banReason: null },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin unban error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(reports.map(async (r) => {
      let targetUser = null;
      let targetLink = null;
      let targetTitle = r.targetTitle || null;
      const snap = r.targetData || null;

      if (r.targetType === 'preset') {
        const preset = await prisma.preset.findUnique({ where: { id: r.targetId }, select: { id: true, title: true, authorId: true, authorName: true } });
        if (preset) {
          targetUser = await prisma.user.findUnique({ where: { id: preset.authorId }, select: { id: true, username: true, email: true, bannedUntil: true } });
          targetTitle = preset.title;
          targetLink = `/presets/${preset.id}`;
        } else if (snap) {
          targetTitle = snap.title || 'Deleted preset';
          targetLink = null;
          if (snap.authorId) {
            targetUser = await prisma.user.findUnique({ where: { id: snap.authorId }, select: { id: true, username: true, email: true, bannedUntil: true } });
            if (!targetUser && snap.authorUsername) {
              targetUser = { id: snap.authorId, username: snap.authorUsername, email: snap.authorEmail || 'Unknown', bannedUntil: null };
            }
          }
        }
      } else if (r.targetType === 'habit') {
        const habit = await prisma.habit.findUnique({ where: { id: r.targetId }, select: { id: true, title: true, userId: true } });
        if (habit) {
          targetUser = await prisma.user.findUnique({ where: { id: habit.userId }, select: { id: true, username: true, email: true, bannedUntil: true } });
          targetTitle = habit.title;
          targetLink = `/habits/${habit.id}`;
        } else if (snap) {
          targetTitle = snap.title || 'Deleted habit';
          targetLink = null;
          if (snap.userId) {
            targetUser = await prisma.user.findUnique({ where: { id: snap.userId }, select: { id: true, username: true, email: true, bannedUntil: true } });
          }
        }
      } else if (r.targetType === 'user') {
        targetUser = await prisma.user.findUnique({ where: { id: r.targetId }, select: { id: true, username: true, email: true, bannedUntil: true } });
        if (targetUser) targetLink = `/profile/${targetUser.username}`;
      }
      return { ...r, targetUser, targetLink, targetTitle };
    }));

    res.json({ reports: enriched });
  } catch (e) {
    console.error('admin reports error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reports/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.report.update({ where: { id }, data: { status: 'dismissed' } });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin dismiss error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reports/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.report.update({ where: { id }, data: { status: 'resolved' } });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin action error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.report.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('admin delete report error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
