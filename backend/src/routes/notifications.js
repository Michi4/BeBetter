const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware, demoGuard } = require('../middleware/auth');
const { getVapidKeys } = require('../lib/vapid');

const router = Router();

router.get('/vapid-public-key', async (req, res) => {
  try {
    const keys = getVapidKeys();
    res.json({ publicKey: keys.publicKey });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unread = notifications.filter((n) => !n.read).length;

    res.json({ notifications, unread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/read', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (ids && Array.isArray(ids)) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: req.userId },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: req.userId, read: false },
        data: { read: true },
      });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.userId } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({ data: { userId: req.userId } });
    }
    res.json({ preferences: prefs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/preferences', authMiddleware, demoGuard, async (req, res) => {
  try {
    const { morningEnabled, morningTime, habitRemindersEnabled, eveningEnabled, eveningTime, announcementsEnabled } = req.body;

    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (morningTime !== undefined && morningTime !== null && !TIME_RE.test(String(morningTime))) {
      return res.status(400).json({ error: 'Morning time must be in HH:MM format' });
    }
    if (eveningTime !== undefined && eveningTime !== null && !TIME_RE.test(String(eveningTime))) {
      return res.status(400).json({ error: 'Evening time must be in HH:MM format' });
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.userId },
      update: {
        morningEnabled, morningTime, habitRemindersEnabled, eveningEnabled, eveningTime, announcementsEnabled,
      },
      create: {
        userId: req.userId,
        morningEnabled, morningTime, habitRemindersEnabled, eveningEnabled, eveningTime, announcementsEnabled,
      },
    });

    res.json({ preferences: prefs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/subscribe', authMiddleware, demoGuard, async (req, res) => {
  try {
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: 'Missing subscription fields' });

    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: req.userId, endpoint } },
      update: { p256dh, auth },
      create: { userId: req.userId, endpoint, p256dh, auth },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/unsubscribe', authMiddleware, demoGuard, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { userId: req.userId, endpoint } });
    } else {
      await prisma.pushSubscription.deleteMany({ where: { userId: req.userId } });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
