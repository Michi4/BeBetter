const { Router } = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

const FRIEND_LINK_SECRET = process.env.JWT_SECRET || 'bebetter-friend-link-secret-key';

function createFriendLinkToken(senderId, linkId) {
  const payload = { senderId, linkId, iat: Math.floor(Date.now() / 1000) };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', FRIEND_LINK_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyFriendLinkToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = crypto.createHmac('sha256', FRIEND_LINK_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (sig !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (Date.now() / 1000 - payload.iat > 7 * 24 * 60 * 60) return null;
    return payload;
  } catch {
    return null;
  }
}

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
        ],
        id: { not: req.userId },
        isPublic: true,
      },
      select: { id: true, username: true, avatar: true, bio: true },
      take: 10,
    });

    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/lookup', authMiddleware, async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, username: true, avatar: true, bio: true, isPublic: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: user.id },
          { user1Id: user.id, user2Id: req.userId },
        ],
      },
    });

    res.json({ user, isFriend: !!friendship });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { userId: receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ error: 'userId required' });
    if (receiverId === req.userId) return res.status(400).json({ error: 'Cannot add yourself' });

    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, receiverId },
          { requesterId: receiverId, receiverId: req.userId },
        ],
      },
    });
    if (existing) return res.status(400).json({ error: 'Request already exists' });

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: req.userId },
        ],
      },
    });
    if (friendship) return res.status(400).json({ error: 'Already friends' });

    const request = await prisma.friendRequest.create({
      data: { requesterId: req.userId, receiverId },
    });

    await prisma.activity.create({
      data: {
        userId: req.userId,
        type: 'friend_request',
        payload: { receiverId },
        visibility: 'private',
      },
    });

    res.json({ request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/request/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.friendRequest.findUnique({ where: { id } });
    if (!request || request.receiverId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const [smaller, larger] = [request.requesterId, request.receiverId].sort();
    await prisma.friendship.create({ data: { user1Id: smaller, user2Id: larger } });
    await prisma.friendRequest.delete({ where: { id } });

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

router.post('/request/:id/decline', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.friendRequest.findUnique({ where: { id } });
    if (!request || request.receiverId !== req.userId) return res.status(404).json({ error: 'Not found' });

    await prisma.friendRequest.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: req.userId },
      include: {
        requester: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ user1Id: req.userId }, { user2Id: req.userId }] },
      include: {
        user1: { select: { id: true, username: true, avatar: true, bio: true } },
        user2: { select: { id: true, username: true, avatar: true, bio: true } },
      },
    });

    const friends = friendships.map((f) =>
      f.user1Id === req.userId ? f.user2 : f.user1
    );

    res.json({ friends });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) return res.status(404).json({ error: 'Not found' });

    if (friendship.user1Id !== req.userId && friendship.user2Id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.friendship.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const friendIds = await prisma.friendship.findMany({
      where: { OR: [{ user1Id: req.userId }, { user2Id: req.userId }] },
      select: { user1Id: true, user2Id: true },
    }).then((fs) => fs.map((f) => (f.user1Id === req.userId ? f.user2Id : f.user1Id)));

    const activities = await prisma.activity.findMany({
      where: {
        userId: { in: [...friendIds, req.userId] },
        visibility: { in: ['friends', 'public'] },
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ activities });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/profile/:userIdOrUsername', async (req, res) => {
  try {
    const { userIdOrUsername } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userIdOrUsername },
          { username: { equals: userIdOrUsername, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, avatar: true, bio: true, isPublic: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'bebetter-secret-key');
        currentUserId = decoded.userId;
      } catch {}
    }

    const isOwn = currentUserId && user.id === currentUserId;

    if (!isOwn && !user.isPublic) {
      if (!currentUserId) return res.status(403).json({ error: 'Profile is private' });
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: currentUserId, user2Id: user.id },
            { user1Id: user.id, user2Id: currentUserId },
          ],
        },
      });
      if (!friendship) return res.status(403).json({ error: 'Profile is private' });
    }

    let isFriend = false;
    if (currentUserId && !isOwn) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: currentUserId, user2Id: user.id },
            { user1Id: user.id, user2Id: currentUserId },
          ],
        },
      });
      isFriend = !!friendship;
    }

    const habits = await prisma.habit.findMany({
      where: { userId: user.id, active: true },
      select: { id: true, title: true, emoji: true, bestStreak: true },
    });

    const recentLogs = await prisma.habitLog.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: { completedAt: true, habit: { select: { title: true, emoji: true } } },
    });

    const stats = {
      totalHabits: habits.length,
      bestStreak: habits.reduce((max, h) => Math.max(max, h.bestStreak || 0), 0),
    };

    res.json({ user, habits, recentLogs, stats, isFriend });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/link', authMiddleware, async (req, res) => {
  try {
    const existing = await prisma.friendLink.findFirst({
      where: { senderId: req.userId, used: false },
    });
    if (existing) {
      if (existing.expiresAt && existing.expiresAt > new Date()) {
        const token = createFriendLinkToken(req.userId, existing.id);
        return res.json({ link: existing, token });
      }
    }

    const link = await prisma.friendLink.create({
      data: {
        senderId: req.userId,
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const token = createFriendLinkToken(req.userId, link.id);
    res.json({ link, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/link/accept', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const payload = verifyFriendLinkToken(token);
    if (!payload) return res.status(400).json({ error: 'Invalid or expired token' });

    const link = await prisma.friendLink.findUnique({ where: { id: payload.linkId } });
    if (!link || link.used) return res.status(400).json({ error: 'Link already used' });
    if (link.senderId === req.userId) return res.status(400).json({ error: 'Cannot accept your own link' });

    const [smaller, larger] = [link.senderId, req.userId].sort();
    const existingFriendship = await prisma.friendship.findFirst({
      where: { user1Id: smaller, user2Id: larger },
    });

    if (!existingFriendship) {
      await prisma.friendship.create({ data: { user1Id: smaller, user2Id: larger } });
    }

    await prisma.friendLink.update({ where: { id: link.id }, data: { used: true, usedById: req.userId } });

    await prisma.activity.create({
      data: {
        userId: link.senderId,
        type: 'friend_joined',
        payload: { newUserId: req.userId },
        visibility: 'friends',
      },
    }).catch(() => {});

    res.json({ ok: true, message: 'Friend added' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
