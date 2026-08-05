const { Router } = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { signToken, authMiddleware, demoGuard, isDemoUser, DEMO_USERNAME } = require('../middleware/auth');

const router = Router();

// Simple in-memory rate limiter for the demo endpoint (per IP)
const demoRateLimit = new Map();
function checkDemoRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const max = 10;
  const entry = demoRateLimit.get(ip) || { count: 0, resetAt: now + windowMs };
  if (entry.resetAt < now) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  demoRateLimit.set(ip, entry);
  if (demoRateLimit.size > 5000) {
    for (const [k, v] of demoRateLimit) {
      if (v.resetAt < now) demoRateLimit.delete(k);
    }
  }
  return entry.count <= max;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSelect = {
  id: true, email: true, username: true, avatar: true,
  bio: true, role: true, isPublic: true, createdAt: true,
  isDemo: true,
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, username, friendToken } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
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
      data: { email, passwordHash, username },
    });

    if (friendToken) {
      const link = await prisma.friendLink.findUnique({ where: { token: friendToken } });
      if (link && !link.used && link.senderId !== user.id) {
        if (!link.expiresAt || link.expiresAt > new Date()) {
          const [smaller, larger] = [link.senderId, user.id].sort();
          await prisma.friendship.create({ data: { user1Id: smaller, user2Id: larger } }).catch(() => {});
          await prisma.friendLink.update({ where: { id: link.id }, data: { used: true, usedById: user.id } });
          await prisma.activity.create({
            data: { userId: link.senderId, type: 'friend_joined', payload: { newUserId: user.id, username }, visibility: 'friends' },
          }).catch(() => {});
        }
      }
    }

    const token = signToken(user.id);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
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

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({ error: 'Account is suspended', bannedUntil: user.bannedUntil });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({
      token,
      user: {
        id: user.id, email: user.email, username: user.username,
        role: user.role, avatar: user.avatar,
        bio: user.bio, isPublic: user.isPublic,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/demo', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (!checkDemoRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many demo sessions. Try again later.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username: DEMO_USERNAME } });
    if (!user || !user.isDemo) {
      return res.status(404).json({ error: 'Demo account is not available right now' });
    }
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({ error: 'Demo account is unavailable' });
    }

    const token = signToken(user.id);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    res.json({
      token,
      user: {
        id: user.id, email: user.email, username: user.username,
        role: user.role, avatar: user.avatar,
        bio: user.bio, isPublic: user.isPublic, isDemo: true,
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

router.put('/me', authMiddleware, demoGuard, async (req, res) => {
  try {
    const { bio, isPublic, avatar, username } = req.body;
    const data = {};
    if (bio !== undefined) data.bio = bio;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (avatar !== undefined) data.avatar = avatar;
    if (username !== undefined) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters, alphanumeric and underscores only' });
      }
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== req.userId) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      data.username = username;
    }
    const user = await prisma.user.update({ where: { id: req.userId }, data, select: userSelect });
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

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ ok: true, message: 'If an account exists, a reset link has been sent' });
    }

    await prisma.passwordReset.deleteMany({ where: { userId: user.id, used: false } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'https://bebetter.websters.at'}/reset-password?token=${token}`;

    try {
      const { sendEmail } = require('../email');
      await sendEmail({
        to: user.email,
        subject: 'BeBetter - Password Reset',
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour.</p><p>If you didn't request this, ignore this email.</p>`,
      });
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
    }

    res.json({ ok: true, message: 'If an account exists, a reset link has been sent' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });

    res.json({ ok: true, message: 'Password reset successful' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/change-password', authMiddleware, demoGuard, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });

    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/account', authMiddleware, demoGuard, async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ error: 'Send confirm: "DELETE_MY_ACCOUNT" to proceed' });
    }

    const userId = req.userId;

    await prisma.habitLog.deleteMany({ where: { userId } });
    await prisma.habitBreak.deleteMany({ where: { userId } });
    await prisma.habitBuddy.deleteMany({ where: { friendId: userId } });
    await prisma.vacation.deleteMany({ where: { userId } });
    await prisma.wager.deleteMany({ where: { OR: [{ userId }, { counterpartyId: userId }] } });
    await prisma.presetUsage.deleteMany({ where: { userId } });
    await prisma.presetLike.deleteMany({ where: { userId } });
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.report.deleteMany({ where: { reporterId: userId } });
    await prisma.friendRequest.deleteMany({ where: { OR: [{ requesterId: userId }, { receiverId: userId }] } });
    await prisma.friendship.deleteMany({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } });
    await prisma.challenge.deleteMany({ where: { OR: [{ creatorId: userId }, { opponentId: userId }] } });
    await prisma.taskLog.deleteMany({ where: { userId } });
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.habit.deleteMany({ where: { userId } });
    await prisma.preset.deleteMany({ where: { authorId: userId } });
    await prisma.friendLink.deleteMany({ where: { senderId: userId } });
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    await prisma.notificationPreference.deleteMany({ where: { userId } });
    await prisma.passwordReset.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    res.clearCookie('token');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
 