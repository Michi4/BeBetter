const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');

const router = Router();
const prisma = new PrismaClient();

const authorSelect = { id: true, username: true, avatar: true };

router.get('/:id', async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({
      where: { id: req.params.id, isPublished: true },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, usages: true } },
      },
    });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });

    res.json({
      preset: {
        ...preset,
        likes: preset._count.likes,
        forks: preset.forksCount,
        usages: preset._count.usages,
        _count: undefined,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
