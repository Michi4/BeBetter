const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { sendPushNotification } = require('../scheduler');

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
    const REAL = { isDemo: false, isTest: false };
    const [users, habits, logs, tasks, taskLogs] = await Promise.all([
      prisma.user.count({ where: REAL }),
      prisma.habit.count({ where: { user: REAL } }),
      prisma.habitLog.count({ where: { user: REAL } }),
      prisma.task.count({ where: { user: REAL } }),
      prisma.taskLog.count({ where: { user: REAL } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeToday, newUsersWeek] = await Promise.all([
      prisma.habitLog.findMany({
        where: { completedAt: { gte: today, lt: tomorrow }, user: REAL },
        select: { userId: true },
      }).then((logs) => new Set(logs.map((l) => l.userId)).size),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, ...REAL },
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
    if (id === req.userId && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote your own account' });
    }

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

router.post('/announcements', async (req, res) => {
  try {
    const { title, message, sendPush } = req.body || {};
    if (!title || !message) return res.status(400).json({ error: 'title and message are required' });

    // Only users with an explicit opt-out record are skipped; everyone else defaults to announcements ON
    const optedOut = await prisma.notificationPreference.findMany({
      where: { announcementsEnabled: false },
      select: { userId: true },
    });
    const optedOutIds = new Set(optedOut.map((p) => p.userId));

    // Includes users with no preference record (defaults apply) unless they have opted out
    const users = await prisma.user.findMany({
      where: { isDemo: false, isTest: false, bannedUntil: null },
      select: { id: true },
    });

    let pushTargets = 0;
    let savedCount = 0;
    let skipped = 0;

    for (const user of users) {
      if (optedOutIds.has(user.id)) {
        skipped++;
        continue;
      }

      await prisma.notification.create({
        data: { userId: user.id, type: 'announcement', message, data: { title } },
      });
      savedCount++;

      if (sendPush) {
        await sendPushNotification(user.id, title, message, '/notifications');
        pushTargets++;
      }
    }

    res.json({
      ok: true,
      delivered: savedCount,
      pushTargets,
      optedOutSkipped: skipped,
    });
  } catch (e) {
    console.error('announcements error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/test-notification', async (req, res) => {
  try {
    const targetUserId = req.body?.userId || req.userId;
    const title = req.body?.title || 'BeBetter Test';
    const body = req.body?.body || 'This is a test notification. If you see this, push is working correctly.';

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const notification = await prisma.notification.create({
      data: { userId: targetUserId, type: 'test', message: body, data: { title } },
    });

    await sendPushNotification(targetUserId, title, body, '/');

    res.json({ ok: true, notification });
  } catch (e) {
    console.error('test-notification error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
