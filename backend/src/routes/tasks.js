const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);

    const vacation = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        startDate: { lte: d },
        OR: [{ endDate: null }, { endDate: { gte: d } }],
      },
    });

    const tasks = await prisma.task.findMany({
      where: { userId: req.userId, isActive: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const completedToday = await prisma.taskLog.findMany({
      where: { userId: req.userId, completedAt: d },
      select: { taskId: true },
    });
    const completedIds = new Set(completedToday.map((l) => l.taskId));

    const result = tasks.map((t) => {
      const isCompletedToday = completedIds.has(t.id);
      return { ...t, isCompletedToday };
    });

    res.json({ tasks: result, isOnVacation: !!vacation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, emoji, dueDate, isScheduled, isEveryday } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const task = await prisma.task.create({
      data: {
        userId: req.userId,
        title: title.trim(),
        description: description || '',
        emoji: emoji || '📝',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        isScheduled: isScheduled !== false,
        isEveryday: isEveryday || false,
      },
    });

    res.json({ task });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.taskLog.findFirst({
      where: {
        taskId: id,
        userId: req.userId,
        completedAt: today,
      },
    });
    if (existing) return res.status(400).json({ error: 'Already completed today' });

    const log = await prisma.taskLog.create({
      data: {
        taskId: id,
        userId: req.userId,
        note: note || '',
        completedAt: today,
      },
    });

    res.json({ log });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/completed', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);

    const logs = await prisma.taskLog.findMany({
      where: { userId: req.userId, completedAt: d },
      include: { task: { select: { id: true, title: true, emoji: true } } },
    });

    res.json({ logs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const { title, description, emoji, dueDate, isActive, isScheduled, isEveryday } = req.body;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description : undefined,
        emoji: emoji !== undefined ? emoji : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        isScheduled: isScheduled !== undefined ? isScheduled : undefined,
        isEveryday: isEveryday !== undefined ? isEveryday : undefined,
      },
    });

    res.json({ task: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    await prisma.taskLog.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/uncomplete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const log = await prisma.taskLog.findFirst({
      where: { taskId: id, userId: req.userId, completedAt: today },
    });
    if (!log) return res.status(404).json({ error: 'No completion found' });

    await prisma.taskLog.delete({ where: { id: log.id } });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
