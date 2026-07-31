const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');
const { sendEmail } = require('./email');

const prisma = new PrismaClient();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.SMTP_USER || 'office@websters.at'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
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
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getTodayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function subtractMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m - minutes;
  if (totalMinutes < 0) return null;
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

async function scheduledTimeReminders() {
  const currentTime = getTodayHHMM();
  const todayDate = getTodayDateStr();
  const dayOfWeek = new Date().getDay();

  const prefs = await prisma.notificationPreference.findMany({
    where: { habitRemindersEnabled: true },
  });

  for (const pref of prefs) {
    const user = await prisma.user.findUnique({ where: { id: pref.userId }, select: { username: true, bannedUntil: true } });
    if (!user || user.bannedUntil) continue;

    const hasSubscription = await prisma.pushSubscription.findFirst({ where: { userId: pref.userId } });
    if (!hasSubscription) continue;

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
      const schedules = typeof habit.schedules === 'string' ? JSON.parse(habit.schedules) : habit.schedules;
      if (!Array.isArray(schedules)) continue;

      for (const slot of schedules) {
        if (!Array.isArray(slot.days) || !slot.days.includes(dayOfWeek)) continue;
        if (!slot.time) continue;

        const effectiveTime = habit.reminderMinutes > 0
          ? subtractMinutes(slot.time, habit.reminderMinutes)
          : slot.time;

        if (!effectiveTime || effectiveTime !== currentTime) continue;

        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: pref.userId,
            type: 'scheduled_reminder',
            data: { path: ['habitId'], equals: habit.id },
            createdAt: { gte: new Date(todayDate + 'T00:00:00'), lt: new Date(todayDate + 'T23:59:59') },
          },
        });

        const existingTimeKey = existingNotif?.data?.time;
        if (existingNotif && existingTimeKey === slot.time) continue;

        let message;
        if (habit.reminderMinutes === 0) {
          message = `\u{1F514} Now: ${habit.emoji || '\u{1F3AF}'} ${habit.title}`;
        } else if (habit.reminderMinutes > 0) {
          message = `\u{23F0} ${habit.emoji || '\u{1F3AF}'} ${habit.title} in ${habit.reminderMinutes} minutes`;
        } else {
          message = `\u{23F0} Time for ${habit.emoji || '\u{1F3AF}'} ${habit.title}!`;
        }

        await prisma.notification.create({
          data: {
            userId: pref.userId,
            type: 'scheduled_reminder',
            message,
            data: { habitId: habit.id, time: slot.time, date: todayDate },
          },
        }).catch(() => {});

        await sendPushNotification(pref.userId, 'BeBetter Reminder', message, '/habits');
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

      let taskDays = null;
      if (task.scheduledDays) {
        taskDays = typeof task.scheduledDays === 'string' ? JSON.parse(task.scheduledDays) : task.scheduledDays;
      }
      if (Array.isArray(taskDays) && !taskDays.includes(dayOfWeek)) continue;

      const effectiveTime = task.reminderMinutes > 0
        ? subtractMinutes(task.scheduledTime, task.reminderMinutes)
        : task.scheduledTime;

      if (!effectiveTime || effectiveTime !== currentTime) continue;

      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId: pref.userId,
          type: 'scheduled_reminder',
          data: { path: ['taskId'], equals: task.id },
          createdAt: { gte: new Date(todayDate + 'T00:00:00'), lt: new Date(todayDate + 'T23:59:59') },
        },
      });

      const existingTimeKey = existingNotif?.data?.time;
      if (existingNotif && existingTimeKey === task.scheduledTime) continue;

      let message;
      if (task.reminderMinutes === 0) {
        message = `\u{1F514} Now: ${task.emoji || '\u{1F4CB}'} ${task.title}`;
      } else if (task.reminderMinutes > 0) {
        message = `\u{23F0} ${task.emoji || '\u{1F4CB}'} ${task.title} in ${task.reminderMinutes} minutes`;
      } else {
        message = `\u{23F0} Time for ${task.emoji || '\u{1F4CB}'} ${task.title}!`;
      }

      await prisma.notification.create({
        data: {
          userId: pref.userId,
          type: 'scheduled_reminder',
          message,
          data: { taskId: task.id, time: task.scheduledTime, date: todayDate },
        },
      }).catch(() => {});

      await sendPushNotification(pref.userId, 'BeBetter Reminder', message, '/tasks');
    }
  }
}

async function exactTimeReminders() {
  const currentTime = getTodayHHMM();
  const todayDate = getTodayDateStr();
  const dayOfWeek = new Date().getDay();

  const habits = await prisma.habit.findMany({
    where: {
      active: true,
      schedules: { not: null },
      reminderMinutes: 0,
    },
  });

  const userHabitMap = {};
  for (const habit of habits) {
    if (!userHabitMap[habit.userId]) userHabitMap[habit.userId] = [];
    userHabitMap[habit.userId].push(habit);
  }

  for (const [userId, habitsList] of Object.entries(userHabitMap)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, bannedUntil: true } });
    if (!user || user.bannedUntil) continue;

    for (const habit of habitsList) {
      const schedules = typeof habit.schedules === 'string' ? JSON.parse(habit.schedules) : habit.schedules;
      if (!Array.isArray(schedules)) continue;

      for (const slot of schedules) {
        if (!Array.isArray(slot.days) || !slot.days.includes(dayOfWeek)) continue;
        if (slot.time !== currentTime) continue;

        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'scheduled_reminder',
            data: { path: ['habitId'], equals: habit.id },
            createdAt: { gte: new Date(todayDate + 'T00:00:00'), lt: new Date(todayDate + 'T23:59:59') },
          },
        });
        const existingTimeKey = existingNotif?.data?.time;
        if (existingNotif && existingTimeKey === slot.time) continue;

        const message = `\u{1F514} Now: ${habit.emoji || '\u{1F3AF}'} ${habit.title}`;

        await prisma.notification.create({
          data: {
            userId,
            type: 'scheduled_reminder',
            message,
            data: { habitId: habit.id, time: slot.time, date: todayDate },
          },
        }).catch(() => {});

        await sendPushNotification(userId, 'BeBetter Reminder', message, '/habits');
      }
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        isActive: true,
        scheduledTime: { not: null },
        reminderMinutes: 0,
      },
    });

    for (const task of tasks) {
      if (!task.scheduledTime || task.scheduledTime !== currentTime) continue;

      let taskDays = null;
      if (task.scheduledDays) {
        taskDays = typeof task.scheduledDays === 'string' ? JSON.parse(task.scheduledDays) : task.scheduledDays;
      }
      if (Array.isArray(taskDays) && !taskDays.includes(dayOfWeek)) continue;

      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId,
          type: 'scheduled_reminder',
          data: { path: ['taskId'], equals: task.id },
          createdAt: { gte: new Date(todayDate + 'T00:00:00'), lt: new Date(todayDate + 'T23:59:59') },
        },
      });
      const existingTimeKey = existingNotif?.data?.time;
      if (existingNotif && existingTimeKey === task.scheduledTime) continue;

      const message = `\u{1F514} Now: ${task.emoji || '\u{1F4CB}'} ${task.title}`;

      await prisma.notification.create({
        data: {
          userId,
          type: 'scheduled_reminder',
          message,
          data: { taskId: task.id, time: task.scheduledTime, date: todayDate },
        },
      }).catch(() => {});

      await sendPushNotification(userId, 'BeBetter Reminder', message, '/tasks');
    }
  }
}

async function morningReminder() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const prefs = await prisma.notificationPreference.findMany({
    where: { morningEnabled: true, morningTime: timeStr },
  });

  for (const pref of prefs) {
    const user = await prisma.user.findUnique({ where: { id: pref.userId }, select: { username: true, bannedUntil: true } });
    if (!user || user.bannedUntil) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();

    const isOnVacation = await prisma.vacation.findFirst({
      where: {
        userId: pref.userId,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
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
      await sendPushNotification(
        pref.userId,
        '\u{1F305} Good morning!',
        `You have ${habits.length} habit${habits.length > 1 ? 's' : ''} scheduled for today.`,
        '/habits'
      );
    }
  }
}

async function eveningReminder() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const prefs = await prisma.notificationPreference.findMany({
    where: { eveningEnabled: true, eveningTime: timeStr },
  });

  for (const pref of prefs) {
    const user = await prisma.user.findUnique({ where: { id: pref.userId }, select: { username: true, bannedUntil: true } });
    if (!user || user.bannedUntil) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOnVacation = await prisma.vacation.findFirst({
      where: {
        userId: pref.userId,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
    });
    if (isOnVacation) continue;

    const todayLogs = await prisma.habitLog.findMany({
      where: { userId: pref.userId, completedAt: today },
    });
    const completedCount = todayLogs.length;

    const habits = await prisma.habit.findMany({
      where: { userId: pref.userId, active: true },
    });

    if (completedCount < habits.length) {
      await sendPushNotification(
        pref.userId,
        '\u{1F319} Day\'s not over yet!',
        `You've completed ${completedCount}/${habits.length} habits today. Keep going!`,
        '/habits'
      );
    }
  }
}

function startScheduler() {
  setInterval(async () => {
    try {
      await morningReminder();
      await eveningReminder();
      await scheduledTimeReminders();
      await exactTimeReminders();
    } catch (e) {
      console.error('Scheduler error:', e);
    }
  }, 60 * 1000);

  console.log('Scheduler started');
}

module.exports = { startScheduler, sendPushNotification };
