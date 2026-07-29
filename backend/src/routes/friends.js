const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.userId } },
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true, username: true, avatar: true, bio: true },
      take: 20,
    });
    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: req.userId }, { user2Id: req.userId }],
      },
      include: {
        user1: { select: { id: true, name: true, email: true, username: true, avatar: true, bio: true } },
        user2: { select: { id: true, name: true, email: true, username: true, avatar: true, bio: true } },
      },
    });

    const friends = friendships.map(f =>
      f.user1Id === req.userId ? f.user2 : f.user1
    );

    res.json({ friends });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: req.userId, status: 'pending' },
      include: { requester: { select: { id: true, name: true, email: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/request', async (req, res) => {
  try {
    const { userId: targetId } = req.body;
    if (!targetId) return res.status(400).json({ error: 'userId is required' });
    if (targetId === req.userId) return res.status(400).json({ error: 'Cannot friend yourself' });

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: targetId },
          { user1Id: targetId, user2Id: req.userId },
        ],
      },
    });
    if (existingFriendship) return res.status(409).json({ error: 'Already friends' });

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, receiverId: targetId },
          { requesterId: targetId, receiverId: req.userId },
        ],
      },
    });
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        if (existingRequest.requesterId === targetId) {
          await prisma.friendRequest.update({
            where: { id: existingRequest.id },
            data: { status: 'accepted' },
          });
          const [smaller, larger] = [req.userId, targetId].sort();
          await prisma.friendship.create({ data: { user1Id: smaller, user2Id: larger } });
          return res.json({ ok: true, autoAccepted: true });
        }
        return res.status(409).json({ error: 'Request already pending' });
      }
      return res.status(409).json({ error: 'Already friends' });
    }

    const request = await prisma.friendRequest.create({
      data: { requesterId: req.userId, receiverId: targetId },
    });

    await prisma.activity.create({
      data: {
        userId: req.userId,
        type: 'friend_request',
        payload: { targetId },
        visibility: 'private',
      },
    });

    const sender = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } });
    await prisma.notification.create({
      data: {
        userId: targetId,
        type: 'friend_request',
        title: 'Friend Request',
        message: `${sender.name} wants to be friends with you`,
        link: '/friends',
      },
    });

    res.status(201).json({ request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/accept/:requestId', async (req, res) => {
  try {
    const request = await prisma.friendRequest.findFirst({
      where: { id: req.params.requestId, receiverId: req.userId, status: 'pending' },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: 'accepted' },
    });

    const [smaller, larger] = [request.requesterId, request.receiverId].sort();
    await prisma.friendship.create({ data: { user1Id: smaller, user2Id: larger } });

    await prisma.activity.create({
      data: {
        userId: req.userId,
        type: 'friend_joined',
        payload: { friendId: request.requesterId },
        visibility: 'friends',
      },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reject/:requestId', async (req, res) => {
  try {
    await prisma.friendRequest.updateMany({
      where: { id: req.params.requestId, receiverId: req.userId, status: 'pending' },
      data: { status: 'rejected' },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:friendId', async (req, res) => {
  try {
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: req.params.friendId },
          { user1Id: req.params.friendId, user2Id: req.userId },
        ],
      },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:friendId/profile', async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: req.params.friendId }, { username: req.params.friendId }] },
      select: { id: true, name: true, username: true, avatar: true, bio: true, isPublic: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isFriend = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: user.id },
          { user1Id: user.id, user2Id: req.userId },
        ],
      },
    });
    if (!isFriend && !user.isPublic) {
      return res.status(403).json({ error: 'Profile is private' });
    }

    const habits = await prisma.habit.count({ where: { userId: user.id, active: true } });
    const logs = await prisma.habitLog.count({ where: { userId: user.id, status: 'completed' } });

    const allLogs = await prisma.habitLog.findMany({
      where: { userId: user.id, status: 'completed' },
      orderBy: { completedAt: 'desc' },
    });
    const logDays = new Set(allLogs.map(l => l.completedAt.toISOString().slice(0, 10)));
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(today);
    if (!logDays.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
    while (logDays.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const friendCount = await prisma.friendship.count({
      where: { OR: [{ user1Id: user.id }, { user2Id: user.id }] },
    });

    res.json({ user, stats: { habits, totalCompletions: logs, streak, friendCount } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', async (req, res) => {
  try {
    const { name, bio, avatar, isPublic } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(isPublic !== undefined && { isPublic }),
      },
      select: { id: true, name: true, email: true, username: true, avatar: true, bio: true, isPublic: true, referralCode: true },
    });
    res.json({ user: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feed/activities', async (req, res) => {
  try {
    const friendIds = await prisma.friendship.findMany({
      where: { OR: [{ user1Id: req.userId }, { user2Id: req.userId }] },
      select: {
        user1Id: true,
        user2Id: true,
      },
    }).then(fs => fs.map(f => f.user1Id === req.userId ? f.user2Id : f.user1Id));

    const allIds = [req.userId, ...friendIds];

    const activities = await prisma.activity.findMany({
      where: {
        userId: { in: allIds },
        visibility: { in: ['public', 'friends'] },
      },
      include: { user: { select: { id: true, name: true, avatar: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ activities });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
