const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const end = to ? new Date(to) : new Date();

    const vacationDays = await prisma.vacation.findMany({
      where: {
        userId: req.userId,
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
          { startDate: { lte: end }, endDate: null },
        ],
      },
    });

    const vacationSet = new Set();
    for (const v of vacationDays) {
      const vStart = v.startDate > start ? v.startDate : start;
      const vEnd = v.endDate ? (v.endDate < end ? v.endDate : end) : end;
      const current = new Date(vStart);
      while (current <= vEnd) {
        vacationSet.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    const [logs, tasks, activeHabits] = await Promise.all([
      prisma.habitLog.findMany({
        where: { userId: req.userId, completedAt: { gte: start, lte: end } },
        select: { completedAt: true, habitId: true, habit: { select: { title: true, emoji: true } } },
      }),
      prisma.taskLog.findMany({
        where: { userId: req.userId, completedAt: { gte: start, lte: end } },
        select: { completedAt: true, task: { select: { title: true, emoji: true } } },
      }),
      prisma.habit.findMany({
        where: { userId: req.userId, active: true },
        select: { id: true, daysPerWeek: true, frequencyType: true, createdAt: true, breaks: { where: { endDate: null }, select: { startDate: true } } },
      }),
    ]);

    const grid = {};
    for (const l of logs) {
      const day = new Date(l.completedAt).toISOString().split('T')[0];
      if (vacationSet.has(day)) continue;
      if (!grid[day]) grid[day] = { scheduled: 0, completed: 0, habits: 0, tasks: 0, items: [] };
      grid[day].completed++;
      grid[day].habits++;
      grid[day].items.push({ type: 'habit', title: l.habit.title, emoji: l.habit.emoji });
    }
    for (const t of tasks) {
      const day = new Date(t.completedAt).toISOString().split('T')[0];
      if (vacationSet.has(day)) continue;
      if (!grid[day]) grid[day] = { scheduled: 0, completed: 0, habits: 0, tasks: 0, items: [] };
      grid[day].tasks++;
      grid[day].items.push({ type: 'task', title: t.task.title, emoji: t.task.emoji });
    }

    const parsedHabits = activeHabits.map(h => ({
      ...h,
      sched: JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]')),
    }));

    const cur = new Date(start);
    while (cur <= end) {
      const ds = cur.toISOString().split('T')[0];
      if (!vacationSet.has(ds)) {
        const dow = cur.getDay();
        for (const h of parsedHabits) {
          if (h.breaks.length > 0) continue;
          if (h.createdAt && cur < new Date(h.createdAt)) continue;
          if (h.frequencyType === 'daily' || h.frequencyType === 'always' || (Array.isArray(h.sched) && h.sched.includes(dow))) {
            if (!grid[ds]) grid[ds] = { scheduled: 0, completed: 0, habits: 0, tasks: 0, items: [] };
            grid[ds].scheduled++;
          }
        }
      }
      cur.setDate(cur.getDate() + 1);
    }

    res.json({ grid, vacationDays: Array.from(vacationSet) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/years', authMiddleware, async (req, res) => {
  try {
    const firstLog = await prisma.habitLog.findFirst({
      where: { userId: req.userId },
      orderBy: { completedAt: 'asc' },
    });

    const currentYear = new Date().getFullYear();
    const years = [];
    if (firstLog) {
      const firstYear = firstLog.completedAt.getFullYear();
      for (let y = firstYear; y <= currentYear; y++) years.push(y);
    } else {
      years.push(currentYear);
    }

    res.json({ years });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/day', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isOnVacation = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        startDate: { lte: d },
        OR: [{ endDate: null }, { endDate: { gte: d } }],
      },
    });

    const [habitLogs, taskLogs] = await Promise.all([
      prisma.habitLog.findMany({
        where: { userId: req.userId, completedAt: { gte: d, lt: tomorrow } },
        include: { habit: { select: { id: true, title: true, emoji: true, verificationType: true } } },
      }),
      prisma.taskLog.findMany({
        where: { userId: req.userId, completedAt: { gte: d, lt: tomorrow } },
        include: { task: { select: { id: true, title: true, emoji: true } } },
      }),
    ]);

    const habitsWithScheduled = await prisma.habit.findMany({
      where: { userId: req.userId, active: true },
      select: { id: true, daysPerWeek: true, frequencyType: true, createdAt: true, breaks: { where: { endDate: null }, select: { startDate: true } } },
    });
    const scheduledHabitIds = new Set();
    const dow = d.getDay();
    for (const h of habitsWithScheduled) {
      if (h.breaks.length > 0) continue;
      if (h.createdAt && d < new Date(h.createdAt)) continue;
      const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'));
      if (h.frequencyType === 'daily' || h.frequencyType === 'always' || (Array.isArray(sched) && sched.includes(dow))) {
        scheduledHabitIds.add(h.id);
      }
    }

    const completedHabitIds = new Set(habitLogs.map(l => l.habitId));

    res.json({
      date: d.toISOString().split('T')[0],
      habits: habitLogs,
      tasks: taskLogs,
      scheduledHabits: [...scheduledHabitIds].map(id => {
        const log = habitLogs.find(l => l.habitId === id);
        const habit = log?.habit || habitsWithScheduled.find(h => h.id === id);
        return { id, title: habit?.title, emoji: habit?.emoji, completed: completedHabitIds.has(id), proofUrl: log?.proofUrl || null };
      }),
      isOnVacation: !!isOnVacation,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
