const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function isScheduled(habit, date) {
  const rec = habit.recurrence;
  if (!rec) return false;

  if (rec.type === 'daily') return true;

  if (rec.type === 'weekdays') return ['mon', 'tue', 'wed', 'thu', 'fri'].includes(DAY_NAMES[date.getDay()]);
  if (rec.type === 'weekends') return ['sat', 'sun'].includes(DAY_NAMES[date.getDay()]);

  if (rec.type === 'weekly' && rec.days) {
    return rec.days.includes(DAY_NAMES[date.getDay()]);
  }

  if (rec.type === 'x_per_week') return true;
  if (rec.type === 'x_per_month') return true;

  if (rec.type === 'interval' && rec.every) {
    const created = new Date(habit.createdAt);
    const diffMs = date.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays % rec.every === 0;
  }

  if (rec.type === 'monthly') return date.getDate() === (rec.dayOfMonth || 1);

  return false;
}

router.get('/', async (req, res) => {
  try {
    const from = req.query.from
      ? new Date(req.query.from + 'T00:00:00.000Z')
      : (() => { const d = new Date(); d.setDate(d.getDate() - 364); d.setHours(0, 0, 0, 0); return d; })();
    const to = req.query.to
      ? new Date(req.query.to + 'T23:59:59.999Z')
      : (() => { const d = new Date(); d.setDate(d.getDate() + 30); d.setHours(23, 59, 59, 999); return d; })();

    const habits = await prisma.habit.findMany({
      where: { userId: req.userId, active: true },
    });

    const habitIds = habits.map(h => h.id);
    const logs = await prisma.habitLog.findMany({
      where: {
        userId: req.userId,
        habitId: { in: habitIds },
        completedAt: { gte: from, lte: to },
        status: 'completed',
      },
    });

    const logByDate = {};
    const logByHabitDate = {};
    for (const log of logs) {
      const dateStr = log.completedAt.toISOString().slice(0, 10);
      logByDate[dateStr] = (logByDate[dateStr] || 0) + 1;
      const key = `${log.habitId}:${dateStr}`;
      logByHabitDate[key] = log;
    }

    const breaks = await prisma.habitBreak.findMany({
      where: {
        userId: req.userId,
        habitId: { in: habitIds },
        OR: [
          { endDate: null },
          { endDate: { gt: from } },
        ],
      },
    });

    const breakByHabit = {};
    for (const b of breaks) {
      if (!breakByHabit[b.habitId]) breakByHabit[b.habitId] = [];
      breakByHabit[b.habitId].push(b);
    }

    const allTasks = await prisma.task.findMany({
      where: {
        userId: req.userId,
        OR: [
          { dueDate: { gte: from, lte: to } },
          { dueDate: null, completed: false },
        ],
      },
      select: { id: true, title: true, completed: true, isScheduled: true, dueDate: true },
    });

    const tasksByDate = {};
    const unscheduledTasks = [];
    for (const task of allTasks) {
      if (task.dueDate) {
        const dateStr = task.dueDate.toISOString().slice(0, 10);
        if (!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
        tasksByDate[dateStr].push(task);
      } else {
        unscheduledTasks.push(task);
      }
    }

    const grid = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      const dateStr = cursor.toISOString().slice(0, 10);

      const scheduledHabits = habits.filter(h => {
        if (!isScheduled(h, cursor)) return false;
        const habitBreaks = breakByHabit[h.id];
        if (habitBreaks) {
          const onBreak = habitBreaks.some(b => {
            const start = new Date(b.startDate);
            start.setHours(0, 0, 0, 0);
            const end = b.endDate ? new Date(b.endDate) : new Date('2099-12-31');
            end.setHours(23, 59, 59, 999);
            return cursor >= start && cursor <= end;
          });
          if (onBreak) return false;
        }
        return true;
      });

      const scheduledCount = scheduledHabits.length;
      const completedCount = logByDate[dateStr] || 0;
      const ratio = scheduledCount > 0 ? completedCount / scheduledCount : 0;

      const habitsData = scheduledHabits.map(h => {
        const logEntry = logByHabitDate[`${h.id}:${dateStr}`];
        return {
          id: h.id,
          title: h.title,
          logged: !!logEntry,
          proofUrl: logEntry ? logEntry.proofUrl : null,
        };
      });

      const dayTasks = [
        ...unscheduledTasks,
        ...(tasksByDate[dateStr] || []),
      ];

      grid.push({
        date: dateStr,
        scheduled: scheduledCount,
        completed: completedCount,
        ratio: scheduledCount > 0 ? ratio : null,
        habits: habitsData,
        tasks: dayTasks.map(t => ({ id: t.id, title: t.title, completed: t.completed, isScheduled: t.isScheduled })),
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ grid, totalHabits: habits.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
