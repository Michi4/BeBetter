const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

router.get('/', async (req, res) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId, active: true },
    });

    const allLogs = await prisma.habitLog.findMany({
      where: { userId: req.userId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
    });

    const vacation = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });

    const activeBreaks = await prisma.habitBreak.count({
      where: {
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });

    const logDaysSet = new Set(allLogs.map(l => l.completedAt.toISOString().slice(0, 10)));

    const breaks = await prisma.habitBreak.findMany({
      where: {
        userId: req.userId,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date(0) } },
        ],
      },
    });
    const breakByHabit = {};
    for (const b of breaks) {
      if (!breakByHabit[b.habitId]) breakByHabit[b.habitId] = [];
      breakByHabit[b.habitId].push(b);
    }

    function isOnBreak(habitId, date) {
      const habitBreaks = breakByHabit[habitId];
      if (!habitBreaks) return false;
      return habitBreaks.some(b => {
        const start = new Date(b.startDate);
        start.setHours(0, 0, 0, 0);
        const end = b.endDate ? new Date(b.endDate) : new Date('2099-12-31');
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      });
    }

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(today);

    if (!logDaysSet.has(cursor.toISOString().slice(0, 10))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (logDaysSet.has(cursor.toISOString().slice(0, 10))) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const hasScheduled = habits.some(h => {
        const rec = h.recurrence;
        if (!rec) return false;
        if (isOnBreak(h.id, cursor)) return false;
        if (rec.type === 'daily') return true;
        if (rec.type === 'weekdays') return ['mon', 'tue', 'wed', 'thu', 'fri'].includes(DAY_NAMES[cursor.getDay()]);
        if (rec.type === 'weekends') return ['sat', 'sun'].includes(DAY_NAMES[cursor.getDay()]);
        if (rec.type === 'weekly' && rec.days) return rec.days.includes(DAY_NAMES[cursor.getDay()]);
        if (rec.type === 'x_per_week') return true;
        if (rec.type === 'interval') return true;
        if (rec.type === 'monthly') return cursor.getDate() === (rec.dayOfMonth || 1);
        return false;
      });
      if (!hasScheduled) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let activeDays = 0;
    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      if (logDaysSet.has(d.toISOString().slice(0, 10))) activeDays++;
    }
    const consistency = Math.min(100, Math.round((activeDays / 30) * 100));

    const totalCompletions = allLogs.length;

    const todayStr = today.toISOString().slice(0, 10);
    const todayLogs = allLogs.filter(l => l.completedAt.toISOString().slice(0, 10) === todayStr);
    const todayHabits = habits.filter(h => {
      if (isOnBreak(h.id, today)) return false;
      const rec = h.recurrence;
      if (!rec) return false;
      if (rec.type === 'daily') return true;
      if (rec.type === 'weekdays') return ['mon', 'tue', 'wed', 'thu', 'fri'].includes(DAY_NAMES[today.getDay()]);
      if (rec.type === 'weekends') return ['sat', 'sun'].includes(DAY_NAMES[today.getDay()]);
      if (rec.type === 'weekly' && rec.days) return rec.days.includes(DAY_NAMES[today.getDay()]);
      if (rec.type === 'x_per_week') return true;
      if (rec.type === 'interval') return true;
      if (rec.type === 'monthly') return today.getDate() === (rec.dayOfMonth || 1);
      return false;
    });
    const todayTotal = todayHabits.length;
    const todayDone = todayLogs.length;

    const totalTasks = await prisma.task.count({ where: { userId: req.userId } });
    const completedTasks = await prisma.task.count({ where: { userId: req.userId, completed: true } });

    res.json({
      streak,
      consistency,
      totalCompletions,
      totalHabits: habits.length,
      today: { done: todayDone, total: todayTotal },
      breaksActive: activeBreaks,
      vacationActive: !!vacation,
      totalTasks,
      completedTasks,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
