const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.post('/start', async (req, res) => {
  try {
    const active = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });
    if (active) return res.status(409).json({ error: 'Vacation already active' });

    const { reason, endDate } = req.body;
    const vacation = await prisma.vacation.create({
      data: {
        userId: req.userId,
        reason: reason || null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json({ vacation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/end', async (req, res) => {
  try {
    const active = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });
    if (!active) return res.status(404).json({ error: 'No active vacation' });

    const updated = await prisma.vacation.update({
      where: { id: active.id },
      data: { endDate: new Date() },
    });

    res.json({ vacation: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const vacation = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });

    res.json({ active: !!vacation, vacation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
