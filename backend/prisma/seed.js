const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'Michael23';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const michi = await prisma.user.upsert({
    where: { email: 'michael.ruep@gmail.com' },
    update: { role: 'admin' },
    create: {
      email: 'michael.ruep@gmail.com',
      passwordHash: adminHash,
      name: 'Michi',
      username: 'michi',
      role: 'admin',
      isPublic: true,
      bio: 'Building better habits every day 🔥',
    },
  });

  const hash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@bebetter.local' },
    update: {},
    create: {
      email: 'demo@bebetter.local',
      passwordHash: hash,
      name: 'Demo User',
      username: 'demo',
      role: 'user',
      isPublic: true,
      bio: 'Building better habits every day 🔥',
    },
  });

  const hash2 = await bcrypt.hash('password123', 10);
  const user2 = await prisma.user.upsert({
    where: { email: 'alex@bebetter.local' },
    update: {},
    create: {
      email: 'alex@bebetter.local',
      passwordHash: hash2,
      name: 'Alex Smith',
      username: 'alex',
      isPublic: true,
      bio: 'Fitness enthusiast 💪',
    },
  });

  const [s1, l1] = [user.id, user2.id].sort();
  await prisma.friendship.create({ data: { user1Id: s1, user2Id: l1 } }).catch(() => {});
  const [s2, l2] = [michi.id, user.id].sort();
  await prisma.friendship.create({ data: { user1Id: s2, user2Id: l2 } }).catch(() => {});

  const habits = [
    {
      title: 'Morning Workout',
      description: '30 min exercise',
      recurrence: { type: 'daily' },
      verificationType: 'be_better_cam',
    },
    {
      title: 'Read 20 Pages',
      description: 'Non-fiction book',
      recurrence: { type: 'daily' },
      verificationType: 'honor',
    },
    {
      title: 'Meditate',
      description: '10 min mindfulness',
      recurrence: { type: 'weekly', days: ['mon', 'wed', 'fri'] },
      verificationType: 'honor',
    },
    {
      title: 'No Social Media',
      description: 'Avoid Instagram/TikTok',
      recurrence: { type: 'daily' },
      verificationType: 'honor',
    },
    {
      title: 'Cold Shower',
      description: '2 min cold water',
      recurrence: { type: 'daily' },
      verificationType: 'be_better_cam',
    },
  ];

  for (const h of habits) {
    const existing = await prisma.habit.findFirst({
      where: { userId: user.id, title: h.title },
    });
    if (!existing) {
      await prisma.habit.create({
        data: { ...h, userId: user.id },
      });
    }
  }

  const createdHabits = await prisma.habit.findMany({ where: { userId: user.id } });

  const now = new Date();
  for (let i = 1; i <= 60; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];

    for (const habit of createdHabits) {
      const rec = habit.recurrence;
      let scheduled = false;
      if (rec.type === 'daily') scheduled = true;
      if (rec.type === 'weekly' && rec.days && rec.days.includes(dayName)) scheduled = true;
      if (!scheduled) continue;

      if (Math.random() < 0.7) {
        const logDate = new Date(date);
        logDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
        await prisma.habitLog.create({
          data: {
            habitId: habit.id,
            userId: user.id,
            completedAt: logDate,
            status: 'completed',
          },
        });
      }
    }
  }

  const presets = [
    {
      title: '5AM Club Morning Routine',
      description: 'Wake at 5am, hydrate, journal, move. Start the day ahead.',
      category: 'routine',
      config: {
        title: '5AM Morning Routine',
        description: 'Wake at 5am, drink water, journal 10 min, 15 min stretching',
        recurrence: { type: 'daily' },
        verificationType: 'be_better_cam',
      },
    },
    {
      title: '30-Day Fitness Challenge',
      description: 'Daily workout for 30 days straight. Build the habit.',
      category: 'fitness',
      config: {
        title: 'Daily Workout',
        description: '30 min minimum - any activity counts',
        recurrence: { type: 'daily' },
        verificationType: 'be_better_cam',
      },
    },
    {
      title: 'Digital Detox Weekends',
      description: 'No social media on weekends. Reclaim your attention.',
      category: 'mindfulness',
      config: {
        title: 'No Social Media (Weekends)',
        description: 'Zero Instagram, TikTok, Twitter on Sat & Sun',
        recurrence: { type: 'weekly', days: ['sat', 'sun'] },
        verificationType: 'honor',
      },
    },
    {
      title: 'Read Every Day',
      description: '20 pages of non-fiction daily. Compound your knowledge.',
      category: 'learning',
      config: {
        title: 'Read 20 Pages',
        description: 'Non-fiction book, physical or ebook',
        recurrence: { type: 'daily' },
        verificationType: 'honor',
      },
    },
    {
      title: 'Cold Exposure Protocol',
      description: 'Cold shower every morning. Builds discipline and resilience.',
      category: 'wellness',
      config: {
        title: 'Cold Shower',
        description: '2 minutes of cold water at end of shower',
        recurrence: { type: 'daily' },
        verificationType: 'be_better_cam',
      },
    },
  ];

  for (const p of presets) {
    const exists = await prisma.preset.findFirst({ where: { title: p.title } });
    if (!exists) {
      await prisma.preset.create({
        data: { ...p, authorId: user.id, likesCount: Math.floor(Math.random() * 50) },
      });
    }
  }

  console.log(`Seeded admin user michi (${adminPassword}) and demo user (demo@bebetter.local / password123)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
