const prisma = require('./lib/prisma');
const webpush = require('web-push');
const bcrypt = require('bcryptjs');

const { getVapidKeys } = require('./lib/vapid');
const keys = getVapidKeys();
if (keys.publicKey && keys.privateKey) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.SMTP_USER || 'office@websters.at'),
    keys.publicKey,
    keys.privateKey
  );
}

const DEMO_USERNAME = process.env.DEMO_USERNAME || 'demo';

// Advisory lock key used to ensure only ONE scheduler instance runs jobs at a
// time. During blue-green deploys two containers briefly coexist; without this
// the demo reset or reminder push could run twice.
const SCHED_LOCK_KEY = 7170101;

async function withSchedulerLock(fn) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(${SCHED_LOCK_KEY}) AS ok`;
        const ok = Number(rows?.[0]?.ok) === 1;
        if (!ok) return false;
        await fn(tx);
        return true;
      },
      { maxWait: 3000, timeout: 90000 }
    );
  } catch (e) {
    console.error('Scheduler lock error:', e.message);
    return false;
  }
}

async function resetDemoAccount(db = prisma) {
  try {
    let user = await db.user.findUnique({ where: { username: DEMO_USERNAME } });

    if (!user) {
      const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'demo-demo-demo', 10);
      user = await db.user.create({
        data: {
          email: 'demo@bebetter.local',
          username: DEMO_USERNAME,
          passwordHash,
          role: 'user',
          isDemo: true,
          isPublic: false,
          bio: 'Public demo account — data resets hourly. Try everything freely!',
        },
      });
    } else if (!user.isDemo) {
      await db.user.update({ where: { id: user.id }, data: { isDemo: true } });
    }

    // Demo user must stay hidden from leaderboards/search and admin-free
    if (user.isPublic || user.role !== 'user') {
      await db.user.update({ where: { id: user.id }, data: { isPublic: false, role: 'user' } });
    }

    // Wipe all of the demo user's data so abuse or experimentation can't accumulate
    const userId = user.id;
    await db.habitLog.deleteMany({ where: { userId } });
    await db.habitBreak.deleteMany({ where: { userId } });
    await db.habitBuddy.deleteMany({ where: { friendId: userId } });
    await db.wager.deleteMany({ where: { OR: [{ userId }, { counterpartyId: userId }] } });
    await db.vacation.deleteMany({ where: { userId } });
    await db.taskLog.deleteMany({ where: { userId } });
    await db.task.deleteMany({ where: { userId } });
    await db.habit.deleteMany({ where: { userId } });
    await db.notification.deleteMany({ where: { userId } });
    await db.activity.deleteMany({ where: { userId } });
    await db.friendRequest.deleteMany({ where: { OR: [{ requesterId: userId }, { receiverId: userId }] } });
    await db.friendship.deleteMany({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } });
    await db.challenge.deleteMany({ where: { OR: [{ creatorId: userId }, { opponentId: userId }] } });
    await db.preset.deleteMany({ where: { authorId: userId } });
    await db.friendLink.deleteMany({ where: { senderId: userId } });
    await db.pushSubscription.deleteMany({ where: { userId } });

    // Re-seed with a friendly demo dataset so the UI looks alive
    const habits = [
      { title: 'Morning Run', description: '30 minute jog around the block', emoji: '🏃', frequencyType: 'daily', verificationType: 'honor', bestStreak: 12, time: '07:00' },
      { title: 'Deep Work Block', description: '90 minutes of focused, phone-free work', emoji: '🧠', frequencyType: 'daily', verificationType: 'honor', bestStreak: 5, time: '09:30', days: [1, 2, 3, 4, 5] },
      { title: 'Drink 2L of Water', description: 'Stay hydrated through the day', emoji: '💧', frequencyType: 'always', verificationType: 'honor', bestStreak: 6, time: '10:00' },
      { title: '10,000 Steps', description: 'Get moving — walk the long way home', emoji: '🚶', frequencyType: 'daily', verificationType: 'honor', bestStreak: 4, time: '17:00' },
      { title: 'Read 20 Pages', description: 'Daily reading, no excuses', emoji: '📚', frequencyType: 'daily', verificationType: 'honor', bestStreak: 8, time: '20:30' },
      { title: 'Evening Stretch', description: 'Wind down with a stretching routine', emoji: '🧘', frequencyType: 'daily', verificationType: 'honor', bestStreak: 21, time: '21:30' },
    ];

    const demoStart = new Date();
    demoStart.setDate(demoStart.getDate() - 40);
    demoStart.setHours(0, 0, 0, 0);

    const created = [];
    for (const h of habits) {
      const habit = await db.habit.create({
        data: {
          userId,
          title: h.title,
          description: h.description,
          emoji: h.emoji,
          frequencyType: h.frequencyType,
          verificationType: h.verificationType,
          bestStreak: h.bestStreak,
          createdAt: demoStart,
          schedules: JSON.stringify([{ time: h.time, days: h.days || [0, 1, 2, 3, 4, 5, 6] }]),
          reminderMinutes: JSON.stringify([0, 15]),
          config: {},
          daysPerWeek: JSON.stringify(h.days || [0, 1, 2, 3, 4, 5, 6]),
        },
      });
      created.push(habit);

      // Backfill a realistic history of completions
      const now = Date.now();
      const records = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const dayOfWeek = date.getDay();
        if (h.days && !h.days.includes(dayOfWeek)) continue;
        const skip = (i * 7 + (i % 3)) % 9 < 1;
        if (skip) continue;
        date.setHours(Number(h.time.split(':')[0]), Number(h.time.split(':')[1]), 0, 0);
        records.push({ habitId: habit.id, userId, completedAt: date, status: 'completed' });
      }
      if (records.length) {
        await db.habitLog.createMany({ data: records });
      }
    }

    const taskSeed = [
      { title: 'Reply to that email', emoji: '📧', time: '18:00', days: [1, 2, 3, 4, 5], reminders: [15] },
      { title: 'Meal prep for tomorrow', emoji: '🍱', time: '19:30', days: [0, 3], reminders: [0] },
      { title: 'Book dentist appointment', emoji: '🦷', dueIn: 1, reminders: [60] },
      { title: 'Send feedback to team', emoji: '💬', dueIn: 2, reminders: [30] },
      { title: 'Grocery run', emoji: '🛒', time: '10:00', days: [6], reminders: [0] },
      { title: 'Water the plants', emoji: '🪴', days: [0, 2, 4, 6], reminders: [10] },
    ];

    let linkedTaskId = null;
    for (const t of taskSeed) {
      const data = {
        userId,
        title: t.title,
        emoji: t.emoji,
        isScheduled: true,
        isEveryday: false,
        scheduledTime: t.time || null,
        scheduledDays: t.days ? JSON.stringify(t.days) : null,
        reminderMinutes: JSON.stringify(t.reminders || [0]),
      };
      if (t.dueIn != null) {
        const due = new Date();
        due.setDate(due.getDate() + t.dueIn);
        due.setHours(17, 0, 0, 0);
        data.dueDate = due;
      }
      const createdTask = await db.task.create({ data });
      if (!linkedTaskId) linkedTaskId = createdTask.id;
    }

    // A few completed tasks in the recent past so the contribution grid looks real
    const taskLogs = [];
    if (linkedTaskId) {
      for (let i = 1; i <= 8; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        date.setHours(19, 30, 0, 0);
        taskLogs.push({ taskId: linkedTaskId, userId, completedAt: date, note: null });
      }
      if (taskLogs.length) {
        await db.taskLog.createMany({ data: taskLogs });
      }
    }

    console.log(`[demo] reset and reseeded (${created.length} habits)`);
  } catch (e) {
    console.error('[demo] reset error:', e.message);
  }
}

async function sendPushNotification(userId, title, body, url, db = prisma) {
  try {
    const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, url: url || '/' });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  } catch (e) {
    console.error('Push notification error:', e);
  }
}

function getTodayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function subtractMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m - minutes;
  if (total < 0) return null;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function parseReminders(val) {
  if (!val) return [];
  const arr = typeof val === 'string' ? JSON.parse(val) : val;
  return Array.isArray(arr) ? arr.filter(v => typeof v === 'number' && v >= 0) : [];
}

function parseSchedules(val) {
  if (!val) return [];
  const arr = typeof val === 'string' ? JSON.parse(val) : val;
  return Array.isArray(arr) ? arr : [];
}

function parseJsonArray(val) {
  if (val == null) return [];
  const arr = typeof val === 'string' ? JSON.parse(val) : val;
  return Array.isArray(arr) ? arr : [];
}

function isHabitDueToday(habit, dayOfWeek) {
  if (habit.frequencyType === 'daily' || habit.frequencyType === 'always') return true;
  const dwp = parseJsonArray(habit.daysPerWeek);
  if (dwp.includes(dayOfWeek)) return true;
  const sched = parseSchedules(habit.schedules);
  return sched.some(s => Array.isArray(s.days) && s.days.includes(dayOfWeek));
}

// A habit is "on break" while it has a break with no end date yet, or whose
// end date is still in the future (endDate set to "now" means the break ended).
function activeBreakFilter() {
  const now = new Date();
  return {
    none: {
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
  };
}

function minutesSinceHMSlot(hhmm) {
  if (!hhmm || !hhmm.includes(':')) return -1;
  const now = new Date();
  const [h, m] = hhmm.split(':').map(Number);
  if (h == null || m == null || Number.isNaN(h) || Number.isNaN(m)) return -1;
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return (now - target) / 1000;
}

// Reminders are minute-precision; the scheduler ticks every 30s and drifts, so a
// strict minute equality check frequently skipped the slot. Fire when the slot
// is now or was within the last 90 seconds — dedup prevents double sends.
function inReminderWindow(secondsAgo) {
  return secondsAgo >= 0 && secondsAgo < 90;
}

async function digestNotified(userId, type, todayDate, db = prisma) {
  const start = new Date(todayDate + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const existing = await db.notification.findFirst({
    where: {
      userId,
      type,
      createdAt: { gte: start, lt: end },
    },
  });
  return !!existing;
}

async function alreadyNotified(userId, type, entityId, time, reminderOffset, todayDate, isTask, db = prisma) {
  const field = isTask ? 'taskId' : 'habitId';
  const start = new Date(todayDate + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const existing = await db.notification.findMany({
    where: {
      userId,
      type: 'scheduled_reminder',
      data: { path: [field], equals: entityId },
      createdAt: { gte: start, lt: end },
    },
    select: { data: true },
  });
  // Dedup per (entity, slot time, offset). Checking only a single arbitrary row
  // made a "15 min before" reminder for a slot suppress its "Now" reminder (both
  // offsets store the same slot time) or let duplicates through.
  return existing.some((n) => {
    const d = n.data || {};
    if (d.time !== time) return false;
    if (d.reminderOffset !== undefined && d.reminderOffset !== reminderOffset) return false;
    return true;
  });
}

async function sendReminder(userId, message, url, data, db = prisma, type = 'scheduled_reminder') {
  const todayDate = getTodayDateStr();
  await db.notification.create({
    data: {
      userId,
      type,
      message,
      data,
    },
  }).catch(() => {});
  await sendPushNotification(userId, 'BeBetter Reminder', message, url, db);
}

async function checkScheduledReminders(db = prisma) {
  const todayDate = getTodayDateStr();
  const dayOfWeek = new Date().getDay();

  const prefs = await db.notificationPreference.findMany({
    where: { habitRemindersEnabled: true },
  });


  for (const pref of prefs) {
    const user = await db.user.findUnique({ where: { id: pref.userId }, select: { id: true, bannedUntil: true } });
    if (!user || (user.bannedUntil && user.bannedUntil > new Date())) continue;

    const isOnVacation = await db.vacation.findFirst({
      where: {
        userId: pref.userId,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
    });
    if (isOnVacation) continue;

    const habits = await db.habit.findMany({
      where: {
        userId: pref.userId,
        active: true,
        schedules: { not: null },
        reminderMinutes: { not: null },
        breaks: activeBreakFilter(),
      },
    });

    for (const habit of habits) {
      const schedules = parseSchedules(habit.schedules);
      const reminders = parseReminders(habit.reminderMinutes);
      if (!schedules.length || !reminders.length) continue;

      for (const slot of schedules) {
        if (!Array.isArray(slot.days) || !slot.days.includes(dayOfWeek)) continue;
        if (!slot.time) continue;

        for (const offset of reminders) {
          const effectiveTime = offset > 0 ? subtractMinutes(slot.time, offset) : slot.time;
          if (!effectiveTime || !inReminderWindow(minutesSinceHMSlot(effectiveTime))) continue;

          if (await alreadyNotified(pref.userId, 'scheduled_reminder', habit.id, slot.time, offset, todayDate, false, db)) continue;

          const label = offset === 0 ? 'Now' : `in ${offset} min`;
          const msg = offset === 0
            ? `\u{1F514} Now: ${habit.emoji || '\u{1F3AF}'} ${habit.title}`
            : `\u{23F0} ${habit.emoji || '\u{1F3AF}'} ${habit.title} ${label}`;

          await sendReminder(pref.userId, msg, '/habits', { habitId: habit.id, time: slot.time, date: todayDate, reminderOffset: offset }, db);
        }
      }
    }

    const tasks = await db.task.findMany({
      where: {
        userId: pref.userId,
        isActive: true,
        scheduledTime: { not: null },
        reminderMinutes: { not: null },
      },
    });

    for (const task of tasks) {
      if (!task.scheduledTime) continue;
      const reminders = parseReminders(task.reminderMinutes);
      if (!reminders.length) continue;

      let taskDays = null;
      if (task.scheduledDays) {
        taskDays = typeof task.scheduledDays === 'string' ? JSON.parse(task.scheduledDays) : task.scheduledDays;
      }
      if (Array.isArray(taskDays) && !taskDays.includes(dayOfWeek)) continue;

      if (task.dueDate) {
        const t = new Date(task.dueDate);
        const dueStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        if (dueStr !== todayDate) continue;
      } else if (!Array.isArray(taskDays) || !taskDays.length) {
        // One-time task (no recurring weekday selection, no due date): remind
        // only on the day it was created — "this once, not every week".
        const c = new Date(task.createdAt);
        const createdStr = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
        if (createdStr !== todayDate) continue;
      }

      for (const offset of reminders) {
        const effectiveTime = offset > 0 ? subtractMinutes(task.scheduledTime, offset) : task.scheduledTime;
        if (!effectiveTime || !inReminderWindow(minutesSinceHMSlot(effectiveTime))) continue;

        if (await alreadyNotified(pref.userId, 'scheduled_reminder', task.id, task.scheduledTime, offset, todayDate, true, db)) continue;

        const label = offset === 0 ? 'Now' : `in ${offset} min`;
        const msg = offset === 0
          ? `\u{1F514} Now: ${task.emoji || '\u{1F4CB}'} ${task.title}`
          : `\u{23F0} ${task.emoji || '\u{1F4CB}'} ${task.title} ${label}`;

        await sendReminder(pref.userId, msg, '/habits', { taskId: task.id, time: task.scheduledTime, date: todayDate, reminderOffset: offset }, db);
      }
    }
  }
}

async function morningReminder(db = prisma) {
  const todayDate = getTodayDateStr();
  const prefs = await db.notificationPreference.findMany({
    where: { morningEnabled: true },
  });

  for (const pref of prefs) {
    if (!inReminderWindow(minutesSinceHMSlot(pref.morningTime))) continue;
    if (await digestNotified(pref.userId, 'morning_reminder', todayDate, db)) continue;
    const user = await db.user.findUnique({ where: { id: pref.userId }, select: { id: true, bannedUntil: true } });
    if (!user || (user.bannedUntil && user.bannedUntil > new Date())) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();

    const isOnVacation = await db.vacation.findFirst({
      where: { userId: pref.userId, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    });
    if (isOnVacation) continue;

    const habits = await db.habit.findMany({
      where: {
        userId: pref.userId,
        active: true,
        breaks: activeBreakFilter(),
      },
    });

    const dueToday = habits.filter((h) => isHabitDueToday(h, dayOfWeek));

    if (dueToday.length > 0) {
      await sendReminder(pref.userId, `\u{1F305} Good morning! You have ${dueToday.length} habit${dueToday.length > 1 ? 's' : ''} scheduled for today.`, '/habits', { date: todayDate }, db, 'morning_reminder');
    }
  }
}

async function eveningReminder(db = prisma) {
  const todayDate = getTodayDateStr();
  const prefs = await db.notificationPreference.findMany({
    where: { eveningEnabled: true },
  });

  for (const pref of prefs) {
    if (!inReminderWindow(minutesSinceHMSlot(pref.eveningTime))) continue;
    if (await digestNotified(pref.userId, 'evening_reminder', todayDate, db)) continue;
    const user = await db.user.findUnique({ where: { id: pref.userId }, select: { id: true, bannedUntil: true } });
    if (!user || (user.bannedUntil && user.bannedUntil > new Date())) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();

    const isOnVacation = await db.vacation.findFirst({
      where: { userId: pref.userId, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    });
    if (isOnVacation) continue;

    const habits = await db.habit.findMany({
      where: {
        userId: pref.userId,
        active: true,
        breaks: activeBreakFilter(),
      },
    });

    const dueToday = habits.filter((h) => isHabitDueToday(h, dayOfWeek));
    if (dueToday.length === 0) continue;

    const dueIds = dueToday.map((h) => h.id);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayLogs = await db.habitLog.findMany({
      where: { userId: pref.userId, habitId: { in: dueIds }, completedAt: { gte: today, lt: tomorrow } },
      select: { habitId: true },
    });
    const completedCount = new Set(todayLogs.map((l) => l.habitId)).size;

    if (completedCount < dueToday.length) {
      await sendReminder(pref.userId, `\u{1F319} Day's not over yet! You've completed ${completedCount}/${dueToday.length} habits today. Keep going!`, '/habits', { date: todayDate }, db, 'evening_reminder');
    }
  }
}

function startScheduler() {
  // Ensure the demo account exists and looks alive; refresh it every hour
  withSchedulerLock((db) => resetDemoAccount(db));
  setInterval(async () => {
    await withSchedulerLock((db) => resetDemoAccount(db));
  }, 60 * 60 * 1000);

  setInterval(async () => {
    try {
      await withSchedulerLock(async (db) => {
        await morningReminder(db);
        await eveningReminder(db);
        await checkScheduledReminders(db);
      });
    } catch (e) {
      console.error('Scheduler error:', e);
    }
  }, 30 * 1000);

  console.log('Scheduler started');
}

module.exports = {
  startScheduler,
  sendPushNotification,
  alreadyNotified,
  digestNotified,
  inReminderWindow,
  minutesSinceHMSlot,
  isHabitDueToday,
  checkScheduledReminders,
};
