const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware, isDemoUser } = require('../middleware/auth');
const { calculateBestStreak } = require('../lib/streak');
const { parseDayKey } = require('../utils/dayKey');

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { habitId, photo, proofUrl, date, scheduledTime } = req.body;
    if (!habitId) return res.status(400).json({ error: 'habitId required' });

    if ((photo || proofUrl) && (await isDemoUser(req.userId))) {
      return res.status(403).json({ error: 'Not available in the demo account. Sign up to use this.' });
    }

    const habit = await prisma.habit.findUnique({ where: { id: habitId }, include: { breaks: true } });
    if (!habit) return res.status(404).json({ error: 'Not found' });

    const isOwner = habit.userId === req.userId;
    let isChallengeOpponent = false;
    if (!isOwner) {
      const challenge = await prisma.challenge.findFirst({
        where: { habitId, opponentId: req.userId, status: 'active' },
      });
      isChallengeOpponent = !!challenge;
    }
    if (!isOwner && !isChallengeOpponent) return res.status(404).json({ error: 'Not found' });

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    const activeBreak = habit.breaks.find((b) => !b.endDate || new Date(b.endDate) > new Date());
    if (activeBreak) return res.status(400).json({ error: 'Habit is on break' });

    const vacation = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        startDate: { lte: logDate },
        OR: [{ endDate: null }, { endDate: { gte: logDate } }],
      },
    });
    if (vacation) return res.status(400).json({ error: 'On vacation this day' });

    const dayOfWeek = logDate.getDay();
    const schedules = habit.schedules ? (typeof habit.schedules === 'string' ? JSON.parse(habit.schedules) : habit.schedules) : null;

    if (Array.isArray(schedules) && schedules.length > 0) {
      const todaySchedules = schedules.filter(s => Array.isArray(s.days) && s.days.includes(dayOfWeek));
      if (todaySchedules.length === 0) {
        return res.status(400).json({ error: 'Habit not scheduled for this day' });
      }
      if (scheduledTime) {
        const validSlot = todaySchedules.find(s => s.time === scheduledTime);
        if (!validSlot) {
          return res.status(400).json({ error: 'Invalid scheduled time for today' });
        }
      }
    } else {
      const sched = JSON.parse(typeof habit.daysPerWeek === 'string' ? habit.daysPerWeek : JSON.stringify(habit.daysPerWeek || '[]'));
      const isScheduled = habit.frequencyType === 'daily' || habit.frequencyType === 'always' || sched.includes(dayOfWeek);
      if (!isScheduled) return res.status(400).json({ error: 'Habit not scheduled for this day' });
    }

    const logDateUpper = new Date(logDate);
    logDateUpper.setHours(23, 59, 59, 999);

    const existingWhere = {
      habitId,
      userId: req.userId,
      completedAt: { gte: logDate, lte: logDateUpper },
    };
    if (scheduledTime) {
      existingWhere.scheduledTime = scheduledTime;
    } else {
      existingWhere.scheduledTime = null;
    }
    const existing = await prisma.habitLog.findFirst({ where: existingWhere });
    if (existing) return res.status(409).json({ error: 'Already logged today for this time slot' });

    const log = await prisma.habitLog.create({
      data: {
        habitId,
        userId: req.userId,
        proofUrl: proofUrl || photo || undefined,
        completedAt: logDate,
        scheduledTime: scheduledTime || undefined,
      },
    });

    const allLogs = await prisma.habitLog.findMany({
      where: { habitId, userId: req.userId },
      orderBy: { completedAt: 'asc' },
    });

    const { bestStreak, currentStreak } = calculateBestStreak(allLogs);

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

    const enrichedLogs = logs.map(l => ({
      ...l,
      scheduledTime: l.scheduledTime || null,
    }));

    res.json({ logs: enrichedLogs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/with-scheduled', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const d = date ? parseDayKey(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay();

    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isOnVacation = await prisma.vacation.findFirst({
      where: { userId: req.userId, startDate: { lte: d }, OR: [{ endDate: null }, { endDate: { gte: d } }] },
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
        completedAt: { gte: d, lt: tomorrow },
      },
    });
    const loggedIds = new Set(dayLogs.map((l) => l.habitId));
    const loggedSlots = new Set(dayLogs.filter(l => l.scheduledTime).map(l => `${l.habitId}-${l.scheduledTime}`));

    const scheduled = [];
    const unscheduled = [];

    for (const h of habits) {
      const activeBreak = h.breaks.find((b) => !b.endDate);
      if (activeBreak) continue;

      // A habit can only be scheduled on days after it was created
      const createdDay = new Date(h.createdAt);
      createdDay.setHours(0, 0, 0, 0);
      if (d < createdDay) continue;

      const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'));
      const isScheduled = !isOnVacation && (
        h.frequencyType === 'daily' ||
        h.frequencyType === 'always' ||
        sched.includes(dayOfWeek)
      );

      if (isScheduled) {
        // Expand each timed slot into its own entry so the day view shows times
        const habitSchedules = Array.isArray(h.schedules)
          ? h.schedules
          : (typeof h.schedules === 'string' ? (() => { try { return JSON.parse(h.schedules) } catch { return null } })() : null);
        const todaySlots = Array.isArray(habitSchedules) && habitSchedules.length > 0
          ? habitSchedules.filter(s => s.time && Array.isArray(s.days) && s.days.includes(dayOfWeek))
          : [];

        if (todaySlots.length > 0) {
          for (const s of todaySlots) {
            const slotKey = `${h.id}-${s.time}`;
            scheduled.push({ ...h, isScheduled: true, scheduledTime: s.time, logged: loggedSlots.has(slotKey) });
          }
        } else {
          scheduled.push({ ...h, isScheduled: true, scheduledTime: null, logged: loggedIds.has(h.id) });
        }
      } else {
        unscheduled.push({ ...h, isScheduled: false, scheduledTime: null, logged: loggedIds.has(h.id) });
      }
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

router.delete('/habit/:habitId', authMiddleware, async (req, res) => {
  try {
    const { habitId } = req.params;
    const { scheduledTime, date } = req.query;
    const target = date ? parseDayKey(date) : new Date();
    target.setHours(0, 0, 0, 0);
    const upper = new Date(target);
    upper.setDate(upper.getDate() + 1);

    const where = { habitId, userId: req.userId, completedAt: { gte: target, lt: upper } };
    if (scheduledTime) where.scheduledTime = scheduledTime;
    else where.scheduledTime = null;

    const log = await prisma.habitLog.findFirst({ where });
    if (!log) return res.status(404).json({ error: 'No completion found' });

    await prisma.habitLog.delete({ where: { id: log.id } });

    const allLogs = await prisma.habitLog.findMany({
      where: { habitId, userId: req.userId },
      orderBy: { completedAt: 'asc' },
    });
    const { bestStreak } = calculateBestStreak(allLogs);
    await prisma.habit.update({ where: { id: habitId }, data: { bestStreak } });

    res.json({ ok: true });
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

      const { bestStreak } = calculateBestStreak(allLogs);

      await prisma.habit.update({ where: { id: log.habitId }, data: { bestStreak } });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
