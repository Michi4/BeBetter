const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { habitId, note, photo, date } = req.body;
    if (!habitId) return res.status(400).json({ error: 'habitId required' });

    const habit = await prisma.habit.findUnique({ where: { id: habitId }, include: { breaks: true } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const activeBreak = habit.breaks.find((b) => !b.endDate);
    if (activeBreak) return res.status(400).json({ error: 'Habit is on break' });

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    const vacation = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        startDate: { lte: logDate },
        OR: [{ endDate: null }, { endDate: { gte: logDate } }],
      },
    });
    if (vacation) return res.status(400).json({ error: 'You are on vacation' });

    const dayOfWeek = logDate.getDay();
    const sched = JSON.parse(typeof habit.daysPerWeek === 'string' ? habit.daysPerWeek : JSON.stringify(habit.daysPerWeek || '[]'));
    const isScheduled = habit.frequencyType === 'daily' || habit.frequencyType === 'always' || sched.includes(dayOfWeek);
    if (!isScheduled) return res.status(400).json({ error: 'Habit not scheduled for this day' });

    const existing = await prisma.habitLog.findFirst({
      where: { habitId, userId: req.userId, completedAt: logDate },
    });
    if (existing) return res.status(400).json({ error: 'Already logged today' });

    const log = await prisma.habitLog.create({
      data: {
        habitId,
        userId: req.userId,
        note: note || '',
        photo: photo || undefined,
        completedAt: logDate,
      },
    });

    const allLogs = await prisma.habitLog.findMany({
      where: { habitId, userId: req.userId },
      orderBy: { completedAt: 'asc' },
    });

    let bestStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    for (const l of allLogs) {
      const d = new Date(l.completedAt);
      d.setHours(0, 0, 0, 0);
      if (lastDate) {
        const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreak++;
        } else if (diff > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      lastDate = d;
    }

    await prisma.habit.update({ where: { id: habitId }, data: { bestStreak } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = await prisma.habitLog.findMany({
      where: { userId: req.userId, completedAt: today },
    });
    const todayCount = todayLogs.length;

    const totalLogs = await prisma.habitLog.count({ where: { userId: req.userId } });

    let weekDaysInHabit = 0;
    const habitCreated = new Date(habit.createdAt);
    habitCreated.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceCreation = Math.floor((today - habitCreated) / msPerDay) + 1;
    weekDaysInHabit = Math.min(daysSinceCreation, 7);

    res.json({
      log,
      todayCount,
      totalLogs,
      bestStreak,
      currentStreak,
      weekDaysInHabit,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const logs = await prisma.habitLog.findMany({
      where: {
        userId: req.userId,
        completedAt: { gte: today, lt: tomorrow },
      },
      include: { habit: { select: { id: true, title: true, emoji: true } } },
      orderBy: { completedAt: 'desc' },
    });

    res.json({ logs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/with-scheduled', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOnVacation = await prisma.vacation.findFirst({
      where: { userId: req.userId, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    });

    const habits = await prisma.habit.findMany({
      where: {
        userId: req.userId,
        active: true,
      },
      include: { tags: true, breaks: true },
    });

    const dayLogs = await prisma.habitLog.findMany({
      where: {
        userId: req.userId,
        completedAt: d,
      },
    });
    const loggedIds = new Set(dayLogs.map((l) => l.habitId));

    const scheduled = [];
    const unscheduled = [];

    for (const h of habits) {
      const activeBreak = h.breaks.find((b) => !b.endDate);
      if (activeBreak) continue;

      const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'));
      const isScheduled = !isOnVacation && (
        h.frequencyType === 'daily' ||
        h.frequencyType === 'always' ||
        sched.includes(dayOfWeek)
      );

      const entry = { ...h, isScheduled, logged: loggedIds.has(h.id) };
      if (isScheduled) scheduled.push(entry);
      else unscheduled.push(entry);
    }

    res.json({ scheduled, unscheduled, isOnVacation: !!isOnVacation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { habitId, from, to } = req.query;
    const where = { userId: req.userId };
    if (habitId) where.habitId = habitId;
    if (from || to) {
      where.completedAt = {};
      if (from) where.completedAt.gte = new Date(from);
      if (to) where.completedAt.lte = new Date(to);
    }

    const logs = await prisma.habitLog.findMany({
      where,
      include: { habit: { select: { id: true, title: true, emoji: true } } },
      orderBy: { completedAt: 'desc' },
      take: 100,
    });

    res.json({ logs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/count', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await prisma.habitLog.count({
      where: {
        userId: req.userId,
        completedAt: { gte: today, lt: tomorrow },
      },
    });

    const total = await prisma.habitLog.count({ where: { userId: req.userId } });

    res.json({ count, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const log = await prisma.habitLog.findUnique({
      where: { id },
      include: { habit: true },
    });
    if (!log || log.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    res.json({ log });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const log = await prisma.habitLog.findUnique({ where: { id } });
    if (!log || log.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    await prisma.habitLog.delete({ where: { id } });

    if (log.habitId) {
      const allLogs = await prisma.habitLog.findMany({
        where: { habitId: log.habitId, userId: req.userId },
        orderBy: { completedAt: 'asc' },
      });

      let bestStreak = 0;
      let currentStreak = 0;
      let lastDate = null;

      for (const l of allLogs) {
        const d = new Date(l.completedAt);
        d.setHours(0, 0, 0, 0);
        if (lastDate) {
          const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            currentStreak++;
          } else if (diff > 1) {
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        if (currentStreak > bestStreak) bestStreak = currentStreak;
        lastDate = d;
      }

      await prisma.habit.update({ where: { id: log.habitId }, data: { bestStreak } });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
