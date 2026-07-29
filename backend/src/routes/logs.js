const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { habitId, date, from, to, withScheduled } = req.query;
    const where = { userId: req.userId };

    if (habitId) where.habitId = habitId;

    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      where.completedAt = { gte: start, lte: end };
    } else if (from || to) {
      where.completedAt = {};
      if (from) where.completedAt.gte = new Date(from);
      if (to) where.completedAt.lte = new Date(to + 'T23:59:59.999Z');
    }

    const logs = await prisma.habitLog.findMany({
      where,
      include: { habit: { select: { id: true, title: true, description: true, verificationType: true, recurrence: true } } },
      orderBy: { completedAt: 'desc' },
      take: 500,
    });

    let scheduled = [];
    if (withScheduled === 'true' && date) {
      const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const d = new Date(date + 'T12:00:00');
      const dayName = DAY_NAMES[d.getDay()];
      const habits = await prisma.habit.findMany({
        where: { userId: req.userId, active: true },
      });

      const breaks = await prisma.habitBreak.findMany({
        where: {
          userId: req.userId,
          OR: [{ endDate: null }, { endDate: { gt: d } }],
        },
      });
      const breakByHabit = {};
      for (const b of breaks) {
        if (!breakByHabit[b.habitId]) breakByHabit[b.habitId] = [];
        breakByHabit[b.habitId].push(b);
      }

      scheduled = habits.filter(h => {
        if (h.endDate && new Date(h.endDate) < d) return false;
        const rec = h.recurrence;
        if (!rec) return false;
        const habitBreaks = breakByHabit[h.id];
        if (habitBreaks) {
          const onBreak = habitBreaks.some(b => {
            const start = new Date(b.startDate); start.setHours(0,0,0,0);
            const end = b.endDate ? new Date(b.endDate) : new Date('2099-12-31'); end.setHours(23,59,59,999);
            return d >= start && d <= end;
          });
          if (onBreak) return false;
        }
        if (rec.type === 'daily') return true;
        if (rec.type === 'weekdays') return ['mon','tue','wed','thu','fri'].includes(dayName);
        if (rec.type === 'weekends') return ['sat','sun'].includes(dayName);
        if (rec.type === 'weekly' && rec.days) return rec.days.includes(dayName);
        if (rec.type === 'x_per_week') return true;
        if (rec.type === 'x_per_month') return true;
        if (rec.type === 'interval') return true;
        if (rec.type === 'monthly') return d.getDate() === (rec.dayOfMonth || 1);
        return false;
      }).map(h => {
        const logged = logs.some(l => l.habitId === h.id);
        return { id: h.id, title: h.title, description: h.description, verificationType: h.verificationType, logged };
      });
    }

    res.json({ logs, scheduled });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { habitId, status, proofUrl } = req.body;
    if (!habitId) return res.status(400).json({ error: 'habitId is required' });

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: req.userId },
    });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const vacation = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });
    if (vacation) {
      return res.status(400).json({ error: 'Cannot log habits during vacation' });
    }

    const activeBreak = await prisma.habitBreak.findFirst({
      where: {
        habitId,
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });
    if (activeBreak) {
      return res.status(400).json({ error: 'Cannot log habits during a break' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.habitLog.findFirst({
      where: {
        habitId,
        userId: req.userId,
        completedAt: { gte: today, lt: tomorrow },
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'Already logged today', log: existing });
    }

    const log = await prisma.habitLog.create({
      data: {
        habitId,
        userId: req.userId,
        status: status || 'completed',
        proofUrl: proofUrl || null,
      },
    });

    if (habit.presetId) {
      const usage = await prisma.presetUsage.findUnique({
        where: { userId_presetId: { userId: req.userId, presetId: habit.presetId } },
      });
      if (usage) {
        const now = new Date();
        const lastLog = await prisma.habitLog.findFirst({
          where: { habitId, userId: req.userId, status: 'completed' },
          orderBy: { completedAt: 'desc' },
          skip: 1,
        });
        let isConsecutive = false;
        if (lastLog) {
          const diff = now.getTime() - lastLog.completedAt.getTime();
          isConsecutive = diff <= 48 * 60 * 60 * 1000;
        }
        await prisma.presetUsage.update({
          where: { id: usage.id },
          data: {
            completions: { increment: 1 },
            currentStreak: isConsecutive ? { increment: 1 } : 1,
            bestStreak: isConsecutive ? { increment: 1 } : undefined,
          },
        });
      }
    }

    res.status(201).json({ log });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const log = await prisma.habitLog.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!log) return res.status(404).json({ error: 'Not found' });

    await prisma.habitLog.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
