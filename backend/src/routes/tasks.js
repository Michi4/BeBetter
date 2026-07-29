const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/today', async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId,
        completed: false,
        OR: [
          { dueDate: null },
          { dueDate: { gte: todayStart, lte: todayEnd } },
        ],
      },
      include: { _count: { select: { logs: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const where = { userId: req.userId };

    if (req.query.completed === 'true') {
      where.completed = true;
    } else if (req.query.completed === 'false') {
      where.completed = false;
    }

    if (req.query.date) {
      const date = new Date(req.query.date + 'T00:00:00.000Z');
      const nextDay = new Date(req.query.date + 'T23:59:59.999Z');
      where.OR = [
        { dueDate: { gte: date, lte: nextDay } },
        { dueDate: null, completed: false },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { _count: { select: { logs: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, dueDate, isScheduled } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const task = await prisma.task.create({
      data: {
        userId: req.userId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        isScheduled: isScheduled || false,
      },
    });

    res.status(201).json({ task });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { logs: { orderBy: { completedAt: 'desc' } } },
    });
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json({ task });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!task) return res.status(404).json({ error: 'Not found' });

    const { title, description, dueDate, completed, finishNote } = req.body;

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (finishNote !== undefined) data.finishNote = finishNote;
    if (completed !== undefined) {
      data.completed = completed;
      if (completed && !task.completed) {
        data.completedAt = new Date();
      } else if (!completed) {
        data.completedAt = null;
      }
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ task: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!task) return res.status(404).json({ error: 'Not found' });

    await prisma.taskLog.deleteMany({ where: { taskId: req.params.id } });
    await prisma.task.delete({ where: { id: req.params.id } });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!task) return res.status(404).json({ error: 'Not found' });

    const { note, proofUrl } = req.body;

    const log = await prisma.taskLog.create({
      data: {
        taskId: req.params.id,
        userId: req.userId,
        note: note || null,
        proofUrl: proofUrl || null,
      },
    });

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        completed: true,
        completedAt: new Date(),
      },
    });

    res.status(201).json({ task: updated, log });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
