const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

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
      where: { userId },
      select: { id: true, bestStreak: true },
    });

    const bestStreak = allHabits.reduce((max, h) => Math.max(max, h.bestStreak || 0), 0);

    let consistency = 0;
    if (totalLogs > 0 && activeHabits > 0) {
      const firstLog = await prisma.habitLog.findFirst({
        where: { userId },
        orderBy: { completedAt: 'asc' },
      });
      if (firstLog) {
        const daysSinceFirst = Math.max(1, Math.ceil((today - firstLog.completedAt) / (1000 * 60 * 60 * 24)) + 1);
        const totalPossible = daysSinceFirst * activeHabits;
        consistency = Math.min(100, Math.round((totalLogs / totalPossible) * 100));
      }
    }

    const activeStreak = bestStreak;

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
    const where = { userId: req.userId };
    if (habitId) where.habitId = habitId;

    const logs = await prisma.habitLog.findMany({
      where,
      orderBy: { completedAt: 'asc' },
    });

    let bestStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    for (const log of logs) {
      const d = new Date(log.completedAt);
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

    res.json({ bestStreak, currentStreak });
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
    const uniqueDays = new Set(logs.map((l) => new Date(l.completedAt).toISOString().split('T')[0]));

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

      const uniqueDays = new Set(logs.map((l) => new Date(l.completedAt).toISOString().split('T')[0]));

      weeksData.push({
        weekStart: weekStart.toISOString().split('T')[0],
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
