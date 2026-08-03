const prisma = require('./lib/prisma');
const webpush = require('web-push');

const { getVapidKeys } = require('./lib/vapid');
const keys = getVapidKeys();
if (keys.publicKey && keys.privateKey) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.SMTP_USER || 'office@websters.at'),
    keys.publicKey,
    keys.privateKey
  );
}

async function sendPushNotification(userId, title, body, url) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
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
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  } catch (e) {
    console.error('Push notification error:', e);
  }
}

function getTodayHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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

async function alreadyNotified(userId, type, entityId, time, todayDate, isTask) {
  const field = isTask ? 'taskId' : 'habitId';
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: 'scheduled_reminder',
      data: { path: [field], equals: entityId },
      createdAt: { gte: new Date(todayDate + 'T00:00:00'), lt: new Date(todayDate + 'T23:59:59') },
    },
  });
  return existing && existing.data?.time === time;
}

async function sendReminder(userId, message, url, data) {
  const todayDate = getTodayDateStr();
  await prisma.notification.create({
    data: {
      userId,
      type: 'scheduled_reminder',
      message,
      data,
    },
  }).catch(() => {});
  await sendPushNotification(userId, 'BeBetter Reminder', message, url);
}

async function checkScheduledReminders() {
  const currentTime = getTodayHHMM();
  const todayDate = getTodayDateStr();
  const dayOfWeek = new Date().getDay();

  const prefs = await prisma.notificationPreference.findMany({
    where: { habitRemindersEnabled: true },
  });

  for (const pref of prefs) {
    const user = await prisma.user.findUnique({ where: { id: pref.userId }, select: { id: true, bannedUntil: true } });
    if (!user || user.bannedUntil) continue;

    const isOnVacation = await prisma.vacation.findFirst({
      where: {
        userId: pref.userId,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
    });
    if (isOnVacation) continue;

    const habits = await prisma.habit.findMany({
      where: {
        userId: pref.userId,
        active: true,
        schedules: { not: null },
        reminderMinutes: { not: null },
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
          if (!effectiveTime || effectiveTime !== currentTime) continue;

          if (await alreadyNotified(pref.userId, 'scheduled_reminder', habit.id, slot.time, todayDate, false)) continue;

          const label = offset === 0 ? 'Now' : `in ${offset} min`;
          const msg = offset === 0
            ? `\u{1F514} Now: ${habit.emoji || '\u{1F3AF}'} ${habit.title}`
            : `\u{23F0} ${habit.emoji || '\u{1F3AF}'} ${habit.title} ${label}`;

          await sendReminder(pref.userId, msg, '/habits', { habitId: habit.id, time: slot.time, date: todayDate, reminderOffset: offset });
        }
      }
    }

    const tasks = await prisma.task.findMany({
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
      }

      for (const offset of reminders) {
        const effectiveTime = offset > 0 ? subtractMinutes(task.scheduledTime, offset) : task.scheduledTime;
        if (!effectiveTime || effectiveTime !== currentTime) continue;

        if (await alreadyNotified(pref.userId, 'scheduled_reminder', task.id, task.scheduledTime, todayDate, true)) continue;

        const label = offset === 0 ? 'Now' : `in ${offset} min`;
        const msg = offset === 0
          ? `\u{1F514} Now: ${task.emoji || '\u{1F4CB}'} ${task.title}`
          : `\u{23F0} ${task.emoji || '\u{1F4CB}'} ${task.title} ${label}`;

        await sendReminder(pref.userId, msg, '/habits', { taskId: task.id, time: task.scheduledTime, date: todayDate, reminderOffset: offset });
      }
    }
  }
}

async function morningReminder() {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const prefs = await prisma.notificationPreference.findMany({
    where: { morningEnabled: true, morningTime: timeStr },
  });

  for (const pref of prefs) {
    const user = await prisma.user.findUnique({ where: { id: pref.userId }, select: { id: true, bannedUntil: true } });
    if (!user || user.bannedUntil) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();

    const isOnVacation = await prisma.vacation.findFirst({
      where: { userId: pref.userId, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    });
    if (isOnVacation) continue;

    const habits = await prisma.habit.findMany({
      where: {
        userId: pref.userId,
        active: true,
        OR: [
          { frequencyType: 'daily' },
          { frequencyType: 'always' },
          { daysPerWeek: { contains: String(dayOfWeek) } },
        ],
      },
    });

    if (habits.length > 0) {
      await sendPushNotification(pref.userId, '\u{1F305} Good morning!', `You have ${habits.length} habit${habits.length > 1 ? 's' : ''} scheduled for today.`, '/habits');
    }
  }
}

async function eveningReminder() {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const prefs = await prisma.notificationPreference.findMany({
    where: { eveningEnabled: true, eveningTime: timeStr },
  });

  for (const pref of prefs) {
    const user = await prisma.user.findUnique({ where: { id: pref.userId }, select: { id: true, bannedUntil: true } });
    if (!user || user.bannedUntil) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOnVacation = await prisma.vacation.findFirst({
      where: { userId: pref.userId, startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    });
    if (isOnVacation) continue;

    const todayLogs = await prisma.habitLog.findMany({
      where: { userId: pref.userId, completedAt: today },
    });

    const habits = await prisma.habit.findMany({
      where: { userId: pref.userId, active: true },
    });

    if (todayLogs.length < habits.length) {
      await sendPushNotification(pref.userId, '\u{1F319} Day\'s not over yet!', `You've completed ${todayLogs.length}/${habits.length} habits today. Keep going!`, '/habits');
    }
  }
}

function startScheduler() {
  setInterval(async () => {
    try {
      await morningReminder();
      await eveningReminder();
      await checkScheduledReminders();
    } catch (e) {
      console.error('Scheduler error:', e);
    }
  }, 60 * 1000);

  console.log('Scheduler started');
}

module.exports = { startScheduler, sendPushNotification };
