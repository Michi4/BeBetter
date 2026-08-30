const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware, demoGuard } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

const authorSelect = { id: true, username: true, avatar: true };

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
        author: { select: authorSelect },
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

router.post('/', demoGuard, async (req, res) => {
  try {
    const { title, description, config, category, emoji, frequencyType, daysPerWeek, verificationType, schedules } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const author = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });

    const scheduleDays = Array.isArray(schedules) && schedules.length
      ? [...new Set(schedules.flatMap(s => Array.isArray(s.days) ? s.days : []))]
      : null;

    const preset = await prisma.preset.create({
      data: {
        authorId: req.userId,
        authorName: author.username,
        title,
        description: description || '',
        config: config || undefined,
        category: category || 'general',
        emoji: emoji || '🎯',
        frequencyType: scheduleDays ? 'daily' : (frequencyType || 'daily'),
        daysPerWeek: scheduleDays ? scheduleDays : (daysPerWeek || JSON.stringify([1, 2, 3, 4, 5, 6, 7])),
        schedules: Array.isArray(schedules) && schedules.length ? schedules : undefined,
        verificationType: verificationType || 'honor',
        isPublished: true,
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
        author: { select: authorSelect },
        usages: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
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
        username: u.user.username,
        avatar: u.user.avatar,
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

    // Atomic toggle in a transaction — a double-click must not 500 on the
    // unique constraint nor drift the counter.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.presetLike.findUnique({
        where: { userId_presetId: { userId: req.userId, presetId: req.params.id } },
      });
      if (existing) {
        await tx.presetLike.delete({ where: { id: existing.id } });
        const updated = await tx.preset.update({
          where: { id: req.params.id },
          data: { likesCount: { decrement: 1 } },
        });
        return { liked: false, likesCount: updated.likesCount };
      }
      await tx.presetLike.create({ data: { userId: req.userId, presetId: req.params.id } });
      const updated = await tx.preset.update({
        where: { id: req.params.id },
        data: { likesCount: { increment: 1 } },
      });
      return { liked: true, likesCount: updated.likesCount };
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/fork', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const habit = await prisma.habit.create({
      data: {
        userId: req.userId,
        title: preset.title,
        description: preset.description || '',
        emoji: preset.emoji || '🎯',
        frequencyType: Array.isArray(preset.schedules) && preset.schedules.length ? 'daily' : (preset.frequencyType || 'daily'),
        daysPerWeek: Array.isArray(preset.schedules) && preset.schedules.length
          ? [...new Set(preset.schedules.flatMap(s => Array.isArray(s.days) ? s.days : []))]
          : (preset.daysPerWeek || JSON.stringify([1, 2, 3, 4, 5, 6, 7])),
        schedules: Array.isArray(preset.schedules) && preset.schedules.length ? preset.schedules : undefined,
        verificationType: preset.verificationType || 'honor',
        config: preset.config || undefined,
      },
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

router.post('/:id/use', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const existingUsage = await prisma.presetUsage.findUnique({
      where: { userId_presetId: { userId: req.userId, presetId: preset.id } },
    });
    if (existingUsage) return res.status(400).json({ error: 'Already using this preset' });

    const habit = await prisma.habit.create({
      data: {
        userId: req.userId,
        title: preset.title,
        description: preset.description || '',
        emoji: preset.emoji || '🎯',
        frequencyType: Array.isArray(preset.schedules) && preset.schedules.length ? 'daily' : (preset.frequencyType || 'daily'),
        daysPerWeek: Array.isArray(preset.schedules) && preset.schedules.length
          ? [...new Set(preset.schedules.flatMap(s => Array.isArray(s.days) ? s.days : []))]
          : (preset.daysPerWeek || JSON.stringify([1, 2, 3, 4, 5, 6, 7])),
        schedules: Array.isArray(preset.schedules) && preset.schedules.length ? preset.schedules : undefined,
        verificationType: preset.verificationType || 'honor',
        config: preset.config || undefined,
      },
    });

    await prisma.presetUsage.create({
      data: { userId: req.userId, presetId: preset.id, isOriginal: preset.authorId === req.userId },
    });

    await prisma.preset.update({
      where: { id: preset.id },
      data: { usagesCount: { increment: 1 } },
    }).catch(() => {});

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
    await prisma.preset.update({
      where: { id: req.params.id },
      data: { usagesCount: { decrement: 1 } },
    }).catch(() => {});
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
        user: { select: { id: true, username: true, avatar: true } },
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

    const author = await prisma.user.findUnique({ where: { id: preset.authorId }, select: { id: true, username: true, email: true } });

    const report = await prisma.report.create({
      data: {
        reporterId: req.userId,
        targetType: 'preset',
        targetId: req.params.id,
        targetData: {
          title: preset.title,
          description: preset.description,
          category: preset.category,
          authorId: preset.authorId,
          authorUsername: author?.username || preset.authorName || 'Unknown',
          authorEmail: author?.email || null,
        },
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

router.put('/:id', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (preset.authorId !== req.userId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, category, emoji, verificationType, schedules } = req.body;
    const updated = await prisma.preset.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(emoji !== undefined && { emoji }),
        ...(verificationType !== undefined && { verificationType }),
        ...(schedules !== undefined && { schedules }),
      },
    });

    res.json({ preset: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (preset.authorId !== req.userId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.presetLike.deleteMany({ where: { presetId: req.params.id } });
    await prisma.presetUsage.deleteMany({ where: { presetId: req.params.id } });
    await prisma.preset.delete({ where: { id: req.params.id } });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
