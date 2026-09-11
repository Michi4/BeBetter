const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware, demoFieldGuard, demoGuard } = require('../middleware/auth');
const { parseDayKey } = require('../utils/dayKey');

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay();

    const vacation = await prisma.vacation.findFirst({
      where: {
        userId: req.userId,
        startDate: { lte: d },
        OR: [{ endDate: null }, { endDate: { gte: d } }],
      },
    });

    const tasks = await prisma.task.findMany({
      where: { userId: req.userId, isActive: true },
      orderBy: [{ position: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const todayLogs = await prisma.taskLog.findMany({
      where: { userId: req.userId, completedAt: d },
      select: { taskId: true },
    });

    const result = tasks.map((t) => {
      let dueToday = true;

      let schedDays = null;
      if (t.scheduledDays) {
        try {
          schedDays = typeof t.scheduledDays === 'string' ? JSON.parse(t.scheduledDays) : t.scheduledDays;
        } catch { schedDays = null; }
      }

      if (Array.isArray(schedDays) && !schedDays.includes(dayOfWeek)) {
        dueToday = false;
      }

      if (t.dueDate) {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        const s = (v) => String(v).padStart(2, '0');
        const dueStr = `${due.getFullYear()}-${s(due.getMonth() + 1)}-${s(due.getDate())}`;
        const todayStr = `${d.getFullYear()}-${s(d.getMonth() + 1)}-${s(d.getDate())}`;
        if (dueStr > todayStr) dueToday = false;
      }

      if (!dueToday) return { ...t, scheduledDays: schedDays, isCompletedToday: false, isDueToday: false };

      const isCompletedToday = todayLogs.some(l => l.taskId === t.id);

      return { ...t, scheduledDays: schedDays, isCompletedToday, isDueToday: true };
    });

    res.json({ tasks: result, isOnVacation: !!vacation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, demoFieldGuard(['scheduledTime', 'scheduledDays', 'isEveryday', 'reminderMinutes']), async (req, res) => {
  try {
    const { title, description, emoji, dueDate, isScheduled, isEveryday, scheduledTime, scheduledDays, reminderMinutes } = req.body;
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'dueDate must be a valid date' });
    }
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (scheduledTime && !TIME_RE.test(scheduledTime)) {
      return res.status(400).json({ error: 'Scheduled time must be in HH:MM format' });
    }
    if (scheduledDays !== undefined && (!Array.isArray(scheduledDays) || !scheduledDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))) {
      return res.status(400).json({ error: 'scheduledDays must be an array of 0-6' });
    }
    if (reminderMinutes !== undefined && (!Array.isArray(reminderMinutes) || !reminderMinutes.every((m) => Number.isInteger(m) && m >= 0 && m <= 1440))) {
      return res.status(400).json({ error: 'reminderMinutes must be integers 0-1440' });
    }
    if (!title) return res.status(400).json({ error: 'Title required' });

    const minPos = await prisma.task.aggregate({ where: { userId: req.userId }, _min: { position: true } });
    const task = await prisma.task.create({
      data: {
        userId: req.userId,
        position: (minPos._min.position ?? 0) - 1,
        title: title.trim(),
        description: description || '',
        emoji: emoji || '',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        isScheduled: isScheduled !== false,
        isEveryday: isEveryday || false,
        scheduledTime: scheduledTime || undefined,
        scheduledDays: Array.isArray(scheduledDays) ? JSON.stringify(scheduledDays) : undefined,
        // Standard reminder: at the set time unless the caller chose otherwise
        // (or disabled reminders in settings — enforced by the scheduler).
        reminderMinutes: reminderMinutes !== undefined ? reminderMinutes : (scheduledTime ? [0] : undefined),
      },
    });

    res.json({ task });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Persist manual drag-&-drop order. ids = full ordered id list of the user's
// visible tasks; positions are assigned 0..n in that order, atomically.
router.post('/reorder', authMiddleware, demoGuard, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || ids.length > 200 ||
        !ids.every((x) => typeof x === 'string' && x.length <= 64)) {
      return res.status(400).json({ error: 'ids must be an array of 1-200 task ids' });
    }
    const uniqueIds = [...new Set(ids)];
    const owned = await prisma.task.findMany({ where: { id: { in: uniqueIds }, userId: req.userId }, select: { id: true } });
    if (owned.length !== uniqueIds.length) {
      return res.status(404).json({ error: 'Unknown task in reorder list' });
    }
    // Ownership verified above by exact count match; id is the PK.
    await prisma.$transaction(
      uniqueIds.map((id, i) => prisma.task.update({ where: { id }, data: { position: i } }))
    );
    res.json({ ok: true });
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

    // One-time tasks (no recurring day selection) are done once: completing
    // them deactivates them so they never reappear the next day as "due".
    let recurring = !!task.isEveryday;
    if (task.scheduledDays) {
      try {
        const sd = typeof task.scheduledDays === 'string' ? JSON.parse(task.scheduledDays) : task.scheduledDays;
        if (Array.isArray(sd) && sd.length) recurring = true;
      } catch {}
    }
    if (!recurring) {
      await prisma.task.update({ where: { id }, data: { isActive: false } });
    }

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

router.put('/:id', authMiddleware, demoFieldGuard(['scheduledTime', 'scheduledDays', 'isEveryday', 'reminderMinutes', 'isScheduled']), async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const { title, description, emoji, dueDate, isActive, isScheduled, isEveryday, scheduledTime, scheduledDays, reminderMinutes } = req.body;
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'dueDate must be a valid date' });
    }

    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (scheduledTime !== undefined && scheduledTime !== null && typeof scheduledTime === 'string' && !TIME_RE.test(scheduledTime)) {
      return res.status(400).json({ error: 'Scheduled time must be in HH:MM format' });
    }
    // Standard reminder: adding a time without reminders defaults to at-time,
    // unless the task already has reminders stored.
    const effectiveTime = scheduledTime !== undefined ? scheduledTime : task.scheduledTime;
    const needsDefaultReminder = reminderMinutes === undefined && effectiveTime && task.reminderMinutes == null;
    if (Array.isArray(scheduledDays)) {
      for (const d of scheduledDays) {
        if (!Number.isInteger(d) || d < 0 || d > 6) {
          return res.status(400).json({ error: 'Scheduled days must be 0-6 (Sunday-Saturday)' });
        }
      }
    }

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
        scheduledTime: scheduledTime !== undefined ? scheduledTime : undefined,
        scheduledDays: scheduledDays !== undefined ? (Array.isArray(scheduledDays) ? JSON.stringify(scheduledDays) : scheduledDays) : undefined,
        reminderMinutes: reminderMinutes !== undefined ? reminderMinutes : (needsDefaultReminder ? [0] : undefined),
      },
    });

    res.json({ task: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, demoGuard, async (req, res) => {
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
    const { date } = req.query;
    const today = date ? parseDayKey(date) : new Date();
    today.setHours(0, 0, 0, 0);

    const log = await prisma.taskLog.findFirst({
      where: { taskId: id, userId: req.userId, completedAt: today },
    });
    if (!log) return res.status(404).json({ error: 'No completion found' });

    await prisma.taskLog.delete({ where: { id: log.id } });

    // Undoing today's completion of a one-time task brings it back to life.
    // Re-check ownership: the log lookup is user-scoped, the task row must be too.
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: 'Not found' });
    await prisma.task.update({ where: { id }, data: { isActive: true } });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
