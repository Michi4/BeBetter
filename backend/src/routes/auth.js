const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const userSelect = {
  id: true, email: true, username: true, name: true, avatar: true,
  bio: true, role: true, isPublic: true, referralCode: true, createdAt: true,
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, username, referralCode } = req.body;
    if (!email || !password || !name || !username) {
      return res.status(400).json({ error: 'Email, password, name, and username are required' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters, alphanumeric and underscores only' });
    }

    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) return res.status(409).json({ error: 'Email already registered' });

    const usernameExists = await prisma.user.findUnique({ where: { username } });
    if (usernameExists) return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, username },
    });

    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer && referrer.id !== user.id) {
        const [smaller, larger] = [referrer.id, user.id].sort();
        await prisma.friendship.create({ data: { user1Id: smaller, user2Id: larger } }).catch(() => {});
        await prisma.activity.create({
          data: { userId: referrer.id, type: 'friend_joined', payload: { newUserId: user.id, name }, visibility: 'friends' },
        }).catch(() => {});
      }
    }

    const token = signToken(user.id);
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role, referralCode: user.referralCode },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email/username and password are required' });

    const user = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: email }] },
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({
      token,
      user: {
        id: user.id, email: user.email, name: user.name, username: user.username,
        role: user.role, referralCode: user.referralCode, avatar: user.avatar,
        bio: user.bio, isPublic: user.isPublic,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: userSelect });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (_, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ error: 'Send confirm: "DELETE_MY_ACCOUNT" to proceed' });
    }

    const userId = req.userId;

    await prisma.habitLog.deleteMany({ where: { userId } });
    await prisma.habitBreak.deleteMany({ where: { userId } });
    await prisma.vacation.deleteMany({ where: { userId } });
    await prisma.wager.deleteMany({ where: { userId } });
    await prisma.presetUsage.deleteMany({ where: { userId } });
    await prisma.presetLike.deleteMany({ where: { userId } });
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.report.deleteMany({ where: { reporterId: userId } });
    await prisma.friendRequest.deleteMany({ where: { OR: [{ requesterId: userId }, { receiverId: userId }] } });
    await prisma.friendship.deleteMany({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } });
    await prisma.challenge.deleteMany({ where: { OR: [{ creatorId: userId }, { opponentId: userId }] } });
    await prisma.habit.deleteMany({ where: { userId } });
    await prisma.preset.deleteMany({ where: { authorId: userId } });
    await prisma.user.delete({ where: { id: userId } });

    res.clearCookie('token');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
