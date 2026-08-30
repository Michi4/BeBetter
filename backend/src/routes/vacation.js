const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
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

    const { reason, endDate, startDate } = req.body;
    const start = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid start date' });
    const end = endDate ? new Date(endDate) : null;
    if (end && Number.isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid end date' });
    if (end && end < start) return res.status(400).json({ error: 'End date must be after start date' });

    const vacation = await prisma.vacation.create({
      data: {
        userId: req.userId,
        reason: reason || null,
        startDate: start,
        endDate: end,
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
