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
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // Already pushed to a device = already seen: not browser-unread.
      prisma.notification.count({
        where: { userId: req.userId, read: false, pushed: false },
      }),
    ]);

    res.json({ notifications, unread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/read', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (ids && Array.isArray(ids) && ids.length <= 200 && ids.every((x) => typeof x === "string" && x.length <= 64)) {
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
    if (typeof endpoint !== 'string' || endpoint.length > 512 || !/^https:\/\//.test(endpoint)) {
      return res.status(400).json({ error: 'Invalid push endpoint' });
    }
    if (typeof p256dh !== 'string' || typeof auth !== 'string' ||
        p256dh.length > 256 || auth.length > 256 || !p256dh.length || !auth.length) {
      return res.status(400).json({ error: 'Invalid push keys' });
    }
    let userAgent;
    if (req.body.userAgent !== undefined) {
      if (typeof req.body.userAgent !== 'string' || req.body.userAgent.length > 512) {
        return res.status(400).json({ error: 'Invalid user agent' });
      }
      userAgent = req.body.userAgent;
    }

    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: req.userId, endpoint } },
      update: { p256dh, auth, ...(userAgent !== undefined ? { userAgent } : {}) },
      create: { userId: req.userId, endpoint, p256dh, auth, ...(userAgent !== undefined ? { userAgent } : {}) },
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
