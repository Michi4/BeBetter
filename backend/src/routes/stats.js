const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { dayKey } = require('../utils/dayKey');

function parseSchedules(h) {
  return JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'));
}

// Streak = consecutive scheduled days (completions), counted backwards from a
// given end day. Default end = most recent completed day.
function computeStreakFrom(logDates, isDaily, sched, endDay) {
  if (!logDates.size) return 0;
  let streak = 0;
  for (let i = 0; i < 365 * 3; i++) {
    const checkDate = new Date(endDay);
    checkDate.setDate(checkDate.getDate() - i);
    const dow = checkDate.getDay();
    if (!(isDaily || sched.includes(dow))) continue;
    if (logDates.has(checkDate.getTime())) streak++;
    else break;
  }
  return streak;
}

function computeCurrentStreak(logDates, isDaily, sched) {
  if (!logDates.size) return 0;
  return computeStreakFrom(logDates, isDaily, sched, new Date(Math.max(...logDates)));
}

function computeBestStreak(logDates, isDaily, sched) {
  let best = 0;
  for (const ts of logDates) {
    const s = computeStreakFrom(logDates, isDaily, sched, new Date(ts));
    if (s > best) best = s;
  }
  return best;
}

const router = Router();

router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const activeHabits = await prisma.habit.count({
      where: { userId, active: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLogs = await prisma.habitLog.count({
      where: { userId, completedAt: { gte: today, lt: tomorrow } },
    });

    const todayVacation = await prisma.vacation.findFirst({
      where: { userId, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    });

    const totalLogs = await prisma.habitLog.count({ where: { userId } });

    const allHabits = await prisma.habit.findMany({
      where: { userId, active: true },
      select: { id: true, bestStreak: true, daysPerWeek: true, frequencyType: true },
    });

    const bestStreak = allHabits.reduce((max, h) => Math.max(max, h.bestStreak || 0), 0);

    // Active streak = the longest *per-habit* consecutive run of scheduled days,
    // counting back from that habit's most recent completion. Previously this
    // tallied consecutive days across ALL habits, so alternating two habits on
    // consecutive days produced a fake streak no single habit actually had.
    let activeStreak = 0;
    if (allHabits.length) {
      const allLogs = await prisma.habitLog.findMany({
        where: { userId },
        orderBy: { completedAt: 'asc' },
        select: { habitId: true, completedAt: true },
      });
      const logsByHabit = new Map();
      for (const l of allLogs) {
        if (!logsByHabit.has(l.habitId)) logsByHabit.set(l.habitId, []);
        logsByHabit.get(l.habitId).push(l.completedAt);
      }
      for (const h of allHabits) {
        const dates = logsByHabit.get(h.id);
        if (!dates || !dates.length) continue;
        const logSet = new Set();
        for (const dt of dates) {
          const c = new Date(dt);
          c.setHours(0, 0, 0, 0);
          logSet.add(c.getTime());
        }
        const sched = parseSchedules(h);
        const isDaily = h.frequencyType === 'daily' || h.frequencyType === 'always';
        const lastLog = new Date(Math.max(...logSet));
        let cur = 0;
        // A streak is only "current" if not broken for 2+ days
        const gapDays = Math.round((today - lastLog) / (1000 * 60 * 60 * 24));
        if (gapDays <= 1) {
          for (let i = 0; i < 365 * 3; i++) {
            const check = new Date(lastLog);
            check.setDate(check.getDate() - i);
            const dow = check.getDay();
            if (!(isDaily || sched.includes(dow))) continue;
            if (logSet.has(check.getTime())) cur++;
            else break;
          }
        }
        if (cur > activeStreak) activeStreak = cur;
      }
    }

    // Consistency = share of days since the first log with at least one
    // completion, minus vacation days. Previously it compared total logs across
    // all habits against per-day capacity × habits, so a user with several
    // habits doing all of them daily still scored far below 100%.
    let consistency = 0;
    if (totalLogs > 0) {
      const firstLog = await prisma.habitLog.findFirst({
        where: { userId },
        orderBy: { completedAt: 'asc' },
        select: { completedAt: true },
      });
      if (firstLog) {
        const logDays = await prisma.habitLog.findMany({
          where: { userId },
          select: { completedAt: true },
        });
        const uniqueDays = new Set(logDays.map((l) => dayKey(l.completedAt)));
        const firstDay = new Date(firstLog.completedAt);
        firstDay.setHours(0, 0, 0, 0);
        const daysSpan = Math.max(1, Math.round((today - firstDay) / (1000 * 60 * 60 * 24)) + 1);

        const vacations = await prisma.vacation.findMany({
          where: {
            userId,
            startDate: { lte: today },
            OR: [{ endDate: null }, { endDate: { gte: firstDay } }],
          },
        });
        let vacationDays = 0;
        for (const v of vacations) {
          const vStart = new Date(Math.max(v.startDate, firstDay));
          const vEnd = new Date(v.endDate ? Math.min(v.endDate, today) : today);
          vacationDays += Math.floor((vEnd - vStart) / (1000 * 60 * 60 * 24)) + 1;
        }

        const effectiveSpan = Math.max(1, daysSpan - vacationDays);
        consistency = Math.min(100, Math.round((uniqueDays.size / effectiveSpan) * 100));
      }
    }

    res.json({
      activeHabits,
      todayLogs,
      totalLogs,
      bestStreak,
      activeStreak,
      consistency,
      isOnVacation: !!todayVacation,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/streak', authMiddleware, async (req, res) => {
  try {
    const { habitId } = req.query;

    if (habitId) {
      const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        select: { daysPerWeek: true, frequencyType: true, bestStreak: true },
      });
      if (!habit) return res.status(404).json({ error: 'Not found' });

      const logs = await prisma.habitLog.findMany({
        where: { userId: req.userId, habitId },
        orderBy: { completedAt: 'asc' },
      });

      const sched = parseSchedules(habit);
      const isDaily = habit.frequencyType === 'daily' || habit.frequencyType === 'always';

      const logDates = new Set(logs.map(l => {
        const d = new Date(l.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }));

      const currentStreak = computeCurrentStreak(logDates, isDaily, sched);
      const bestStreak = Math.max(computeBestStreak(logDates, isDaily, sched), habit.bestStreak || 0);

      return res.json({ bestStreak, currentStreak });
    }

    const habits = await prisma.habit.findMany({
      where: { userId: req.userId, active: true },
      select: { id: true, daysPerWeek: true, frequencyType: true, bestStreak: true },
    });

    let maxBest = 0;
    let maxCurrent = 0;
    for (const h of habits) {
      if ((h.bestStreak || 0) > maxBest) maxBest = h.bestStreak;

      const logs = await prisma.habitLog.findMany({
        where: { userId: req.userId, habitId: h.id },
        orderBy: { completedAt: 'asc' },
      });
      if (!logs.length) continue;

      const logDates = new Set(logs.map(l => {
        const d = new Date(l.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }));

      const sched = parseSchedules(h);
      const isDaily = h.frequencyType === 'daily' || h.frequencyType === 'always';

      const current = computeCurrentStreak(logDates, isDaily, sched);
      if (current > maxCurrent) maxCurrent = current;
      const best = computeBestStreak(logDates, isDaily, sched);
      if (best > maxBest) maxBest = best;
    }

    res.json({ bestStreak: maxBest, currentStreak: maxCurrent });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/consistency', authMiddleware, async (req, res) => {
  try {
    const { habitId, days } = req.query;
    const numDays = parseInt(days) || 30;
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - numDays);

    const where = {
      userId: req.userId,
      completedAt: { gte: startDate, lte: endDate },
    };
    if (habitId) where.habitId = habitId;

    const logs = await prisma.habitLog.findMany({ where });
    const uniqueDays = new Set(logs.map((l) => dayKey(l.completedAt)));

    const vacationDays = await prisma.vacation.findMany({
      where: {
        userId: req.userId,
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { startDate: { lte: startDate }, OR: [{ endDate: null }, { endDate: { gte: endDate } }] },
        ],
      },
    });

    let vacationDaysCount = 0;
    for (const v of vacationDays) {
      const vStart = v.startDate > startDate ? v.startDate : startDate;
      const vEnd = v.endDate ? (v.endDate < endDate ? v.endDate : endDate) : endDate;
      vacationDaysCount += Math.ceil((vEnd - vStart) / (1000 * 60 * 60 * 24)) + 1;
    }

    const effectiveDays = Math.max(1, numDays - vacationDaysCount);
    const consistency = Math.min(100, Math.round((uniqueDays.size / effectiveDays) * 100));

    res.json({
      consistency,
      daysLogged: uniqueDays.size,
      totalDays: numDays,
      vacationDays: vacationDaysCount,
      effectiveDays,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/weekly', authMiddleware, async (req, res) => {
  try {
    const { weeks } = req.query;
    const numWeeks = parseInt(weeks) || 4;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weeksData = [];

    for (let i = numWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const logs = await prisma.habitLog.findMany({
        where: {
          userId: req.userId,
          completedAt: { gte: weekStart, lt: weekEnd },
        },
      });

      const uniqueDays = new Set(logs.map((l) => dayKey(l.completedAt)));

      weeksData.push({
        weekStart: dayKey(weekStart),
        logs: logs.length,
        uniqueDays: uniqueDays.size,
      });
    }

    res.json({ weeks: weeksData });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
