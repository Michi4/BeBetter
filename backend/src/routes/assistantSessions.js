const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { modelChain } = require('../lib/assistant');

const router = Router();
router.use(authMiddleware);

const LIST_LIMIT = 50;
const MESSAGES_LIMIT = 200;

// Never let a session list/search hit another user's data.
function ownSession(userId, id) {
  return prisma.chatSession.findFirst({ where: { id, userId } });
}

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    const where = { userId: req.userId };
    if (q) where.title = { contains: q, mode: 'insensitive' };
    const sessions = await prisma.chatSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: LIST_LIMIT,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } } },
    });
    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        preview: s.messages[0]?.content?.slice(0, 80) || '',
      })),
    });
  } catch (e) {
    console.error('[assistant] sessions list:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const session = await ownSession(req.userId, req.params.id);
    if (!session) return res.status(404).json({ error: 'Chat not found' });
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: MESSAGES_LIMIT,
    });
    res.json({ session: { id: session.id, title: session.title, updatedAt: session.updatedAt }, messages });
  } catch (e) {
    console.error('[assistant] session get:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const session = await ownSession(req.userId, req.params.id);
    if (!session) return res.status(404).json({ error: 'Chat not found' });
    const title = String(req.body?.title || '').trim().slice(0, 120);
    if (!title) return res.status(400).json({ error: 'title required' });
    const updated = await prisma.chatSession.update({ where: { id: session.id }, data: { title } });
    res.json({ session: { id: updated.id, title: updated.title, updatedAt: updated.updatedAt } });
  } catch (e) {
    console.error('[assistant] session rename:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const session = await ownSession(req.userId, req.params.id);
    if (!session) return res.status(404).json({ error: 'Chat not found' });
    await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
    await prisma.chatSession.delete({ where: { id: session.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[assistant] session delete:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Expose the available model list for the Profile picker.
router.get('/meta/models', async (req, res) => {
  try {
    res.json({ models: modelChain() });
  } catch (e) {
    console.error('[assistant] models meta:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
