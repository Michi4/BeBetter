const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { q, category } = req.query;
    const where = { isPublished: true };
    if (category && category !== 'all') where.category = category;
    if (q && q.length >= 2) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const presets = await prisma.preset.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true, username: true } },
        _count: { select: { likes: true, usages: true } },
      },
      orderBy: { likesCount: 'desc' },
    });

    const myLikes = await prisma.presetLike.findMany({
      where: { userId: req.userId },
      select: { presetId: true },
    });
    const likedIds = new Set(myLikes.map(l => l.presetId));

    const enriched = presets.map(p => ({
      ...p,
      likesCount: p._count.likes,
      usagesCount: p._count.usages,
      liked: likedIds.has(p.id),
      _count: undefined,
    }));

    res.json({ presets: enriched });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, config, category } = req.body;
    if (!title || !config) {
      return res.status(400).json({ error: 'title and config are required' });
    }

    const preset = await prisma.preset.create({
      data: {
        authorId: req.userId,
        title,
        description: description || '',
        config,
        category: category || 'general',
      },
    });

    res.status(201).json({ preset });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, avatar: true, username: true } },
        usages: {
          include: {
            user: { select: { id: true, name: true, avatar: true, username: true } },
          },
          orderBy: { completions: 'desc' },
        },
      },
    });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const myLike = await prisma.presetLike.findUnique({
      where: { userId_presetId: { userId: req.userId, presetId: req.params.id } },
    });

    const myUsage = await prisma.presetUsage.findUnique({
      where: { userId_presetId: { userId: req.userId, presetId: req.params.id } },
    });

    const leaderboard = preset.usages
      .map(u => ({
        id: u.user.id,
        name: u.user.name,
        avatar: u.user.avatar,
        username: u.user.username,
        completions: u.completions,
        currentStreak: u.currentStreak,
        bestStreak: u.bestStreak,
      }))
      .sort((a, b) => b.completions - a.completions || b.currentStreak - a.currentStreak)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    res.json({
      preset: {
        ...preset,
        usages: undefined,
      },
      leaderboard,
      isLiked: !!myLike,
      isUsing: !!myUsage,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/like', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const existing = await prisma.presetLike.findUnique({
      where: { userId_presetId: { userId: req.userId, presetId: req.params.id } },
    });

    if (existing) {
      await prisma.presetLike.delete({ where: { id: existing.id } });
      await prisma.preset.update({ where: { id: req.params.id }, data: { likesCount: { decrement: 1 } } });
      res.json({ liked: false, likesCount: preset.likesCount - 1 });
    } else {
      await prisma.presetLike.create({ data: { userId: req.userId, presetId: req.params.id } });
      await prisma.preset.update({ where: { id: req.params.id }, data: { likesCount: { increment: 1 } } });
      res.json({ liked: true, likesCount: preset.likesCount + 1 });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/fork', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const cfg = preset.config;
    const habit = await prisma.habit.create({
      data: {
        userId: req.userId,
        title: cfg.title || preset.title,
        description: cfg.description || preset.description,
        recurrence: cfg.recurrence || { type: 'daily' },
        verificationType: cfg.verificationType || 'honor',
        presetId: preset.id,
      },
      include: { wagers: true },
    });

    await prisma.preset.update({
      where: { id: preset.id },
      data: { forksCount: { increment: 1 } },
    });

    await prisma.presetUsage.upsert({
      where: { userId_presetId: { userId: req.userId, presetId: preset.id } },
      update: {},
      create: { userId: req.userId, presetId: preset.id, isOriginal: false },
    });

    res.status(201).json({ habit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/stop-using', async (req, res) => {
  try {
    const usage = await prisma.presetUsage.findUnique({
      where: { userId_presetId: { userId: req.userId, presetId: req.params.id } },
    });
    if (!usage) return res.status(404).json({ error: 'Not using this preset' });

    await prisma.presetUsage.delete({ where: { id: usage.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/users', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const usages = await prisma.presetUsage.findMany({
      where: { presetId: req.params.id },
      include: {
        user: { select: { id: true, name: true, avatar: true, username: true } },
      },
      orderBy: { completions: 'desc' },
    });

    const users = usages.map(u => ({
      user: u.user,
      completions: u.completions,
      currentStreak: u.currentStreak,
      bestStreak: u.bestStreak,
      since: u.createdAt,
    }));

    res.json({ users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/report', async (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const report = await prisma.report.create({
      data: {
        reporterId: req.userId,
        targetType: 'preset',
        targetId: req.params.id,
        reason,
        description: description || null,
      },
    });

    res.status(201).json({ report });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
