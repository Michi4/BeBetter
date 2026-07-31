const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

const habitInclude = {
  tags: { select: { id: true, name: true, color: true } },
  breaks: { orderBy: { startDate: 'desc' } },
  wagers: true,
  user: { select: { id: true, username: true, avatar: true } },
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [habits, challengeData] = await Promise.all([
      prisma.habit.findMany({
        where: { userId: req.userId },
        include: habitInclude,
        orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.challenge.findMany({
        where: { opponentId: req.userId, status: 'active' },
        include: {
          habit: { include: habitInclude },
          creator: { select: { id: true, username: true } },
        },
      }),
    ]);

    const enriched = habits.map((h) => {
      const activeBreak = h.breaks.find((b) => !b.endDate);
      const isActive = !activeBreak && h.active;
      const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'));
      return { ...h, scheduledDays: sched, activeBreak, isActive, challengeId: null };
    });

    for (const ch of challengeData) {
      const h = ch.habit;
      if (!enriched.find(e => e.id === h.id)) {
        const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'));
        enriched.push({ ...h, scheduledDays: sched, activeBreak: null, isActive: true, challengeId: ch.id, challengeOpponent: ch.creator });
      }
    }

    res.json({ habits: enriched });
  } catch (e) {
    console.error('habits GET error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/scheduled', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const d = date ? new Date(date) : new Date();
    const dayOfWeek = d.getDay();

    const isOnVacation = await prisma.vacation.findFirst({
      where: { userId: req.userId, startDate: { lte: d }, OR: [{ endDate: null }, { endDate: { gte: d } }] },
    });

    const [habits, challengeHabits] = await Promise.all([
      prisma.habit.findMany({
        where: { userId: req.userId, active: true },
        include: habitInclude,
        orderBy: [{ title: 'asc' }],
      }),
      prisma.challenge.findMany({
        where: { opponentId: req.userId, status: 'active' },
        include: {
          habit: { include: habitInclude },
          creator: { select: { id: true, username: true } },
        },
      }),
    ]);

    const scheduled = habits.map((h) => {
      const activeBreak = h.breaks.find((b) => !b.endDate);
      const hasBreak = !!activeBreak;
      const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'));
      let isScheduled = false;
      if (!hasBreak && !isOnVacation) {
        if (h.frequencyType === 'daily' || h.frequencyType === 'always') isScheduled = true;
        else if (Array.isArray(sched) && sched.includes(dayOfWeek)) isScheduled = true;
      }
      return { ...h, scheduled: isScheduled, activeBreak, hasBreak, challengeId: null };
    });

    for (const ch of challengeHabits) {
      const h = ch.habit;
      const sched = JSON.parse(typeof h.daysPerWeek === 'string' ? h.daysPerWeek : JSON.stringify(h.daysPerWeek || '[]'));
      let isScheduled = false;
      if (!isOnVacation) {
        if (h.frequencyType === 'daily' || h.frequencyType === 'always') isScheduled = true;
        else if (Array.isArray(sched) && sched.includes(dayOfWeek)) isScheduled = true;
      }
      if (isScheduled && !scheduled.find(s => s.id === h.id)) {
        scheduled.push({ ...h, scheduled: true, activeBreak: null, hasBreak: false, challengeId: ch.id, challengeOpponent: ch.creator });
      }
    }

    res.json({ habits: scheduled.filter(h => h.scheduled) });
  } catch (e) {
    console.error('habits/scheduled error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, emoji, frequencyType, daysPerWeek, schedule, verificationType, wagerDays, wagerAmount, makePublic, config, buddyIds, challengeFriendIds, endDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const sched = schedule || (frequencyType === 'daily' ? [1, 2, 3, 4, 5, 6, 7] : daysPerWeek || [1, 2, 3, 4, 5, 6, 7]);

    const habit = await prisma.habit.create({
      data: {
        userId: req.userId,
        title: title.trim(),
        description: description || '',
        emoji: emoji || '🎯',
        frequencyType: frequencyType || 'daily',
        daysPerWeek: Array.isArray(sched) ? JSON.stringify(sched) : sched,
        config: config || undefined,
        verificationType: verificationType || 'honor',
        isPublic: makePublic || false,
        wagerDays: wagerDays || 0,
        wagerAmount: wagerAmount || 0,
      },
      include: habitInclude,
    });

    if (wagerDays > 0 && wagerAmount > 0) {
      await prisma.wager.create({
        data: {
          habitId: habit.id,
          userId: req.userId,
          condition: `Complete ${wagerDays} days`,
          penaltyText: `${wagerAmount} penalty`,
          status: 'active',
        },
      }).catch(() => {});
    }

    if (makePublic) {
      const author = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
      await prisma.preset.create({
        data: {
          habitId: habit.id,
          authorId: req.userId,
          title: habit.title,
          description: habit.description,
          emoji: habit.emoji,
          frequencyType: habit.frequencyType,
          daysPerWeek: habit.daysPerWeek,
          verificationType: habit.verificationType,
          config: habit.config,
          authorName: author.username,
          isPublished: true,
        },
      }).catch(() => {});
    }

    if (Array.isArray(buddyIds) && buddyIds.length > 0) {
      for (const friendId of buddyIds) {
        if (friendId === req.userId) continue;
        await prisma.habitBuddy.create({
          data: { habitId: habit.id, friendId },
        }).catch(() => {});

        await prisma.notification.create({
          data: {
            userId: friendId,
            type: 'buddy_request',
            message: `You've been invited as an accountability buddy for "${habit.title}"`,
            data: { habitId: habit.id, habitTitle: habit.title },
          },
        }).catch(() => {});
      }
    }

    if (Array.isArray(challengeFriendIds) && challengeFriendIds.length > 0) {
      for (const friendId of challengeFriendIds) {
        if (friendId === req.userId) continue;

        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { user1Id: req.userId, user2Id: friendId },
              { user1Id: friendId, user2Id: req.userId },
            ],
          },
        });
        if (!friendship) continue;

        const challenge = await prisma.challenge.create({
          data: {
            creatorId: req.userId,
            opponentId: friendId,
            habitId: habit.id,
            title: `${habit.title} challenge`,
            startDate: new Date(),
            endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'pending',
          },
        }).catch(() => null);

        if (challenge) {
          await prisma.notification.create({
            data: {
              userId: friendId,
              type: 'challenge_invite',
              message: `You've been challenged to "${habit.title}"!`,
              data: { challengeId: challenge.id, habitTitle: habit.title },
            },
          }).catch(() => {});
        }
      }
    }

    res.json({ habit });
  } catch (e) {
    console.error('habits POST error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const { title, description, emoji, frequencyType, daysPerWeek, schedule, verificationType, config, isPublic } = req.body;
    const sched = schedule || daysPerWeek;

    const updated = await prisma.habit.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description : undefined,
        emoji: emoji !== undefined ? emoji : undefined,
        frequencyType: frequencyType || undefined,
        daysPerWeek: sched !== undefined ? (Array.isArray(sched) ? JSON.stringify(sched) : sched) : undefined,
        verificationType: verificationType || undefined,
        config: config !== undefined ? config : undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
      },
      include: habitInclude,
    });

    res.json({ habit: updated });
  } catch (e) {
    console.error('habits PUT error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    await prisma.habitLog.deleteMany({ where: { habitId: id } });
    await prisma.habitBreak.deleteMany({ where: { habitId: id } });
    await prisma.wager.deleteMany({ where: { habitId: id } });
    await prisma.preset.deleteMany({ where: { habitId: id } });
    await prisma.habit.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    console.error('habits DELETE error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/break/start', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const existingBreak = await prisma.habitBreak.findFirst({
      where: { habitId: id, userId: req.userId, endDate: null },
    });
    if (existingBreak) return res.status(400).json({ error: 'Already on break' });

    const brk = await prisma.habitBreak.create({
      data: { habitId: id, userId: req.userId, reason: reason || '', startDate: new Date() },
    });

    res.json({ break: brk });
  } catch (e) {
    console.error('break start error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/break/end', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const brk = await prisma.habitBreak.findFirst({
      where: { habitId: id, userId: req.userId, endDate: null },
    });
    if (!brk) return res.status(400).json({ error: 'No active break' });

    const updated = await prisma.habitBreak.update({
      where: { id: brk.id },
      data: { endDate: new Date() },
    });

    res.json({ break: updated });
  } catch (e) {
    console.error('break end error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/finish', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.habit.update({
      where: { id },
      data: { active: false, finishedNote: note || '', finishedAt: new Date() },
      include: habitInclude,
    });

    res.json({ habit: updated });
  } catch (e) {
    console.error('finish error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const habit = await prisma.habit.findUnique({
      where: { id },
      include: {
        ...habitInclude,
        logs: { orderBy: { completedAt: 'desc' }, take: 100 },
        buddies: {
          include: {
            friend: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });
    if (!habit) return res.status(404).json({ error: 'Not found' });

    const buddyProgress = await Promise.all(
      (habit.buddies || []).map(async (b) => {
        const friendId = b.friend.id;
        const totalLogs = await prisma.habitLog.count({ where: { habitId: id, userId: friendId } });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLog = await prisma.habitLog.findFirst({
          where: { habitId: id, userId: friendId, completedAt: today },
        });

        const recentLogs = await prisma.habitLog.findMany({
          where: { habitId: id, userId: friendId },
          orderBy: { completedAt: 'desc' },
          take: 7,
          select: { completedAt: true },
        });

        let currentStreak = 0;
        if (recentLogs.length > 0) {
          const sortedLogs = recentLogs.map(l => {
            const d = new Date(l.completedAt);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          }).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a);

          let streakDate = new Date();
          streakDate.setHours(0, 0, 0, 0);

          for (const logTs of sortedLogs) {
            const diff = Math.round((streakDate.getTime() - logTs) / (1000 * 60 * 60 * 24));
            if (diff <= 1) {
              currentStreak++;
              streakDate = new Date(logTs);
            } else {
              break;
            }
          }
        }

        return {
          buddyId: b.id,
          friend: b.friend,
          totalLogs,
          completedToday: !!todayLog,
          currentStreak,
        };
      })
    );

    res.json({ habit: { ...habit, buddyProgress } });
  } catch (e) {
    console.error('habit GET :id error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/buddy', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'friendId required' });

    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) return res.status(404).json({ error: 'Not found' });

    const existing = await prisma.habitBuddy.findUnique({ where: { habitId_friendId: { habitId: id, friendId } } });
    if (existing) return res.status(400).json({ error: 'Already a buddy' });

    const buddy = await prisma.habitBuddy.create({
      data: { habitId: id, friendId },
      include: { friend: { select: { id: true, username: true, avatar: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: friendId,
        type: 'buddy_request',
        message: `You've been invited as an accountability buddy for "${habit.title}"`,
        data: { habitId: id, habitTitle: habit.title },
      },
    }).catch(() => {});

    res.json({ buddy });
  } catch (e) {
    console.error('buddy POST error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/buddy/:buddyId', authMiddleware, async (req, res) => {
  try {
    const { buddyId } = req.params;
    const buddy = await prisma.habitBuddy.findUnique({ where: { id: buddyId } });
    if (!buddy) return res.status(404).json({ error: 'Not found' });

    const habit = await prisma.habit.findUnique({ where: { id: buddy.habitId } });
    if (!habit || (habit.userId !== req.userId && buddy.friendId !== req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.habitBuddy.delete({ where: { id: buddyId } });
    res.json({ ok: true });
  } catch (e) {
    console.error('buddy DELETE error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
