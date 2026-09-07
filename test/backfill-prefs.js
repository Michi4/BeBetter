// One-time backfill: default NotificationPreference rows for users missing them.
// Idempotent (skipDuplicates). Run inside the api container:
//   docker cp backfill-prefs.js bebetter-api:/tmp/ && docker exec bebetter-api node /tmp/backfill-prefs.js
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({ select: { id: true } });
  const prefs = await prisma.notificationPreference.findMany({ select: { userId: true } });
  const have = new Set(prefs.map((p) => p.userId));
  const missing = users.map((u) => u.id).filter((id) => !have.has(id));
  if (missing.length) {
    await prisma.notificationPreference.createMany({
      data: missing.map((userId) => ({ userId })),
      skipDuplicates: true,
    });
  }
  console.log('users:', users.length, 'backfilled:', missing.length);
  await prisma.$disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
