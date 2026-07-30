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
        '🌅 Good morning!',
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
        '🌙 Day\'s not over yet!',
        `You've completed ${completedCount}/${habits.length} habits today. Keep going!`,
        '/habits'
      );
    }
  }
}

function startScheduler() {
  setInterval(async () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      if (minute === 0) {
        await morningReminder();
        await eveningReminder();
      }
    } catch (e) {
      console.error('Scheduler error:', e);
    }
  }, 60 * 1000);

  console.log('Scheduler started');
}

module.exports = { startScheduler, sendPushNotification };
