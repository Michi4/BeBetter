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
      username: 'michi',
      role: 'admin',
      isPublic: true,
      bio: 'Building better habits every day',
    },
  });

  const hash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@bebetter.local' },
    update: {},
    create: {
      email: 'demo@bebetter.local',
      passwordHash: hash,
      username: 'demo',
      role: 'user',
      isDemo: true,
      isPublic: true,
      bio: 'Building better habits every day',
    },
  });

  const hash2 = await bcrypt.hash('password123', 10);
  const user2 = await prisma.user.upsert({
    where: { email: 'alex@bebetter.local' },
    update: {},
    create: {
      email: 'alex@bebetter.local',
      passwordHash: hash2,
      username: 'alex',
      isPublic: true,
      bio: 'Fitness enthusiast',
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
      emoji: '💪',
      frequencyType: 'daily',
      daysPerWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      verificationType: 'be_better_cam',
    },
    {
      title: 'Read 20 Pages',
      description: 'Non-fiction book',
      emoji: '📖',
      frequencyType: 'daily',
      daysPerWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      verificationType: 'honor',
    },
    {
      title: 'Meditate',
      description: '10 min mindfulness',
      emoji: '🧘',
      frequencyType: 'days_per_week',
      daysPerWeek: JSON.stringify([1, 3, 5]),
      verificationType: 'honor',
    },
    {
      title: 'No Social Media',
      description: 'Avoid Instagram/TikTok',
      emoji: '📵',
      frequencyType: 'daily',
      daysPerWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      verificationType: 'honor',
    },
    {
      title: 'Cold Shower',
      description: '2 min cold water',
      emoji: '🧊',
      frequencyType: 'daily',
      daysPerWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
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
    const dayOfWeek = date.getDay();

    for (const habit of createdHabits) {
      const sched = JSON.parse(habit.daysPerWeek || '[]');
      let scheduled = false;
      if (habit.frequencyType === 'daily') scheduled = true;
      if (habit.frequencyType === 'days_per_week' && sched.includes(dayOfWeek)) scheduled = true;
      if (!scheduled) continue;

      if (Math.random() < 0.7) {
        const logDate = new Date(date);
        logDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
        await prisma.habitLog.create({
          data: {
            habitId: habit.id,
            userId: user.id,
            completedAt: logDate,
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
      emoji: '🌅',
      frequencyType: 'daily',
      daysPerWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      verificationType: 'be_better_cam',
    },
    {
      title: '30-Day Fitness Challenge',
      description: 'Daily workout for 30 days straight. Build the habit.',
      category: 'fitness',
      emoji: '💪',
      frequencyType: 'daily',
      daysPerWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      verificationType: 'be_better_cam',
    },
    {
      title: 'Digital Detox Weekends',
      description: 'No social media on weekends. Reclaim your attention.',
      category: 'mindfulness',
      emoji: '📵',
      frequencyType: 'days_per_week',
      daysPerWeek: JSON.stringify([0, 6]),
      verificationType: 'honor',
    },
    {
      title: 'Read Every Day',
      description: '20 pages of non-fiction daily. Compound your knowledge.',
      category: 'learning',
      emoji: '📖',
      frequencyType: 'daily',
      daysPerWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      verificationType: 'honor',
    },
    {
      title: 'Cold Exposure Protocol',
      description: 'Cold shower every morning. Builds discipline and resilience.',
      category: 'wellness',
      emoji: '🧊',
      frequencyType: 'daily',
      daysPerWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      verificationType: 'be_better_cam',
    },
  ];

  for (const p of presets) {
    const exists = await prisma.preset.findFirst({ where: { title: p.title } });
    if (!exists) {
      await prisma.preset.create({
        data: {
          title: p.title,
          description: p.description,
          category: p.category,
          emoji: p.emoji,
          frequencyType: p.frequencyType,
          daysPerWeek: p.daysPerWeek,
          verificationType: p.verificationType,
          authorId: user.id,
          authorName: user.username,
          likesCount: Math.floor(Math.random() * 50),
        },
      });
    }
  }

  console.log(`Seeded admin user michi (${adminPassword}) and demo user (demo@bebetter.local / password123)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
