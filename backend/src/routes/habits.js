const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const where = { userId: req.userId };
    if (!includeInactive) where.active = true;
    const habits = await prisma.habit.findMany({
      where,
      include: { wagers: true, breaks: true, _count: { select: { logs: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ habits });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, recurrence, verificationType, presetId, wagers } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const habit = await prisma.habit.create({
      data: {
        userId: req.userId,
        title,
        description: description || null,
        recurrence: recurrence || { type: 'daily' },
        verificationType: verificationType || 'honor',
        presetId: presetId || null,
        wagers: wagers && wagers.length > 0
          ? {
              create: wagers.map(w => ({
                userId: req.userId,
                counterpartyId: w.counterpartyId || null,
                condition: w.condition,
                penaltyText: w.penaltyText,
              })),
            }
          : undefined,
      },
      include: { wagers: true, breaks: true },
    });

    res.status(201).json({ habit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        wagers: true,
        breaks: { orderBy: { startDate: 'desc' } },
        logs: { orderBy: { completedAt: 'desc' }, take: 50 },
      },
    });
    if (!habit) return res.status(404).json({ error: 'Not found' });
    res.json({ habit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, recurrence, verificationType, active, endDate } = req.body;
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!habit) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.habit.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(recurrence !== undefined && { recurrence }),
        ...(verificationType !== undefined && { verificationType }),
        ...(active !== undefined && { active }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: { wagers: true, breaks: true },
    });

    res.json({ habit: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!habit) return res.status(404).json({ error: 'Not found' });

    const deleteLogs = req.query.deleteLogs === 'true';

    if (deleteLogs) {
      await prisma.habitLog.deleteMany({ where: { habitId: req.params.id } });
      await prisma.habitBreak.deleteMany({ where: { habitId: req.params.id } });
      await prisma.wager.deleteMany({ where: { habitId: req.params.id } });
      await prisma.challenge.deleteMany({ where: { habitId: req.params.id } });
      await prisma.habit.delete({ where: { id: req.params.id } });
    } else {
      await prisma.habit.update({
        where: { id: req.params.id },
        data: { active: false },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/finish', async (req, res) => {
  try {
    const { finishNote } = req.body;
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!habit) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.habit.update({
      where: { id: req.params.id },
      data: {
        active: false,
        finishedAt: new Date(),
        finishNote: finishNote || null,
        endDate: new Date(),
      },
      include: { wagers: true, breaks: true },
    });

    res.json({ habit: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/break/start', async (req, res) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const activeBreak = await prisma.habitBreak.findFirst({
      where: {
        habitId: req.params.id,
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });
    if (activeBreak) return res.status(409).json({ error: 'Habit already on break' });

    const { startDate, endDate, reason } = req.body;
    const breakEntry = await prisma.habitBreak.create({
      data: {
        habitId: req.params.id,
        userId: req.userId,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        reason: reason || null,
      },
    });

    res.status(201).json({ break: breakEntry });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/break/end', async (req, res) => {
  try {
    const activeBreak = await prisma.habitBreak.findFirst({
      where: {
        habitId: req.params.id,
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });
    if (!activeBreak) return res.status(404).json({ error: 'No active break found' });

    const updated = await prisma.habitBreak.update({
      where: { id: activeBreak.id },
      data: { endDate: new Date() },
    });

    res.json({ break: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/breaks', async (req, res) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const breaks = await prisma.habitBreak.findMany({
      where: { habitId: req.params.id, userId: req.userId },
      orderBy: { startDate: 'desc' },
    });

    res.json({ breaks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
