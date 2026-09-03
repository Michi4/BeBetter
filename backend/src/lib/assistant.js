const prisma = require('./prisma');

const BAI_BASE = (process.env.B_AI_BASE_URL || 'https://api.b.ai/v1').replace(/\/$/, '');
const BAI_KEY = () => process.env.B_AI_API_KEY || '';
const DEFAULT_CHAIN = ['glm-5.3-flash', 'hy3', 'mimo-v2.5', 'deepseek-v4-flash', 'qwen3.8-flash'];

function modelChain() {
  const fromEnv = (process.env.AI_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const chain = [...fromEnv, ...DEFAULT_CHAIN];
  return [...new Set(chain)];
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseDays(v) {
  if (!Array.isArray(v)) return null;
  const days = v.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days;
}

// ---- Tool definitions (OpenAI Chat Completions function-calling) ----
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'tasks_list',
      description: 'List the user tasks due today (or all active). Returns id, title, due state.',
      parameters: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' } }, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tasks_create',
      description: 'Create a one-time task. Prefer dueDate (YYYY-MM-DD) and optional scheduledTime (HH:MM).',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' }, description: { type: 'string' }, emoji: { type: 'string' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD' }, scheduledTime: { type: 'string', description: 'HH:MM' },
        },
        required: ['title'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tasks_update',
      description: 'Update a task title/description/emoji/dueDate by id. Null clears a field.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
          emoji: { type: 'string' }, dueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD or null to clear' },
        },
        required: ['id'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tasks_complete',
      description: 'Mark a task done for today.',
      parameters: { type: 'object', properties: { id: { type: 'string' }, note: { type: 'string' } }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tasks_uncomplete',
      description: 'Undo today completion of a task (reactivates one-time tasks).',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tasks_delete',
      description: 'Permanently delete a task and its history. Use only when the user explicitly asks to delete/remove it.',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'habits_list',
      description: 'List the user active habits with schedules.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'habits_create',
      description: 'Create a habit. schedules is a list of {time: HH:MM|null, days: [0-6]}. Omit schedules for an untimed daily habit.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' }, description: { type: 'string' }, emoji: { type: 'string' },
          schedules: {
            type: 'array',
            items: { type: 'object', properties: { time: { type: ['string', 'null'] }, days: { type: 'array', items: { type: 'integer' } } }, additionalProperties: false },
          },
        },
        required: ['title'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'habits_update',
      description: 'Update a habit title/description/emoji by id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, emoji: { type: 'string' } },
        required: ['id'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'habits_delete',
      description: 'Permanently delete a habit and its history. Use only when the user explicitly asks to delete/remove it.',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'habits_log',
      description: 'Log a habit completion for today (optionally a specific timed slot HH:MM).',
      parameters: {
        type: 'object',
        properties: { habitId: { type: 'string' }, scheduledTime: { type: 'string', description: 'HH:MM slot, if the habit has timed schedules' } },
        required: ['habitId'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'habits_unlog',
      description: 'Undo today completion of a habit (optionally a specific timed slot HH:MM).',
      parameters: {
        type: 'object',
        properties: { habitId: { type: 'string' }, scheduledTime: { type: 'string', description: 'HH:MM slot, if the habit has timed schedules' } },
        required: ['habitId'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stats_overview',
      description: 'Get streak, consistency, totals and today progress.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'today_summary',
      description: 'Summarize what is due today: tasks and scheduled habits with completion state.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
];

// tool -> minimum required level, and whether it mutates
const TOOL_POLICY = {
  tasks_list: { group: 'tasksLevel', need: 1, write: false },
  tasks_create: { group: 'tasksLevel', need: 2, write: true },
  tasks_update: { group: 'tasksLevel', need: 3, write: true },
  tasks_complete: { group: 'tasksLevel', need: 3, write: true },
  tasks_uncomplete: { group: 'tasksLevel', need: 3, write: true },
  tasks_delete: { group: 'tasksLevel', need: 3, write: true },
  habits_list: { group: 'habitsLevel', need: 1, write: false },
  habits_create: { group: 'habitsLevel', need: 2, write: true },
  habits_update: { group: 'habitsLevel', need: 3, write: true },
  habits_delete: { group: 'habitsLevel', need: 3, write: true },
  habits_log: { group: 'logsLevel', need: 2, write: true },
  habits_unlog: { group: 'logsLevel', need: 2, write: true },
  stats_overview: { group: 'statsLevel', need: 1, write: false },
  today_summary: { group: 'statsLevel', need: 1, write: false },
};

const GROUP_LABEL = { tasksLevel: 'Tasks', habitsLevel: 'Habits', logsLevel: 'Activity log', statsLevel: 'Insights' };

function deniedMessage(tool) {
  const p = TOOL_POLICY[tool];
  const label = p ? GROUP_LABEL[p.group] : 'AI access';
  return `I don't have access for that yet (${label}). You can change it anytime in Profile → AI Assistant.`;
}

function summarizeCall(tool, args) {
  const a = args || {};
  const q = (s) => (s == null || s === '' ? '' : ` "${String(s).slice(0, 60)}"`);
  switch (tool) {
    case 'tasks_create': return `Create task${q(a.title)}`;
    case 'tasks_update': return `Update task${q(a.title)}`;
    case 'tasks_complete': return 'Mark task done';
    case 'tasks_uncomplete': return 'Undo task completion';
    case 'tasks_delete': return 'Delete task';
    case 'habits_create': return `Create habit${q(a.title)}`;
    case 'habits_update': return `Update habit${q(a.title)}`;
    case 'habits_delete': return 'Delete habit';
    case 'habits_log': return 'Log habit completion';
    case 'habits_unlog': return 'Undo habit completion';
    default: return tool;
  }
}

// ---- Executors (all scoped to userId, same validation as routes) ----
async function execTool(userId, tool, args = {}) {
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  switch (tool) {
    case 'tasks_list': {
      const tasks = await prisma.task.findMany({
        where: { userId, isActive: true },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 50,
      });
      const d = dayStart();
      const logs = await prisma.taskLog.findMany({ where: { userId, completedAt: d }, select: { taskId: true } });
      const done = new Set(logs.map((l) => l.taskId));
      return tasks.map((t) => ({ id: t.id, title: t.title, emoji: t.emoji, dueDate: t.dueDate, scheduledTime: t.scheduledTime, completedToday: done.has(t.id) }));
    }
    case 'tasks_create': {
      if (!args.title || !String(args.title).trim()) return { error: 'Title required' };
      if (args.scheduledTime && !TIME_RE.test(args.scheduledTime)) return { error: 'scheduledTime must be HH:MM' };
      const task = await prisma.task.create({
        data: {
          userId,
          title: String(args.title).trim().slice(0, 200),
          description: args.description ? String(args.description).slice(0, 2000) : '',
          emoji: args.emoji ? String(args.emoji).slice(0, 8) : '📝',
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
          scheduledTime: args.scheduledTime || undefined,
        },
      });
      return { id: task.id, title: task.title };
    }
    case 'tasks_update': {
      const task = await prisma.task.findUnique({ where: { id: args.id } });
      if (!task || task.userId !== userId) return { error: 'Task not found' };
      const data = {};
      if (args.title !== undefined) data.title = String(args.title).trim().slice(0, 200);
      if (args.description !== undefined) data.description = String(args.description ?? '').slice(0, 2000);
      if (args.emoji !== undefined) data.emoji = String(args.emoji).slice(0, 8);
      if (args.dueDate !== undefined) data.dueDate = args.dueDate ? new Date(args.dueDate) : null;
      const updated = await prisma.task.update({ where: { id: args.id }, data });
      return { id: updated.id, title: updated.title };
    }
    case 'tasks_complete':
    case 'tasks_uncomplete': {
      const task = await prisma.task.findUnique({ where: { id: args.id } });
      if (!task || task.userId !== userId) return { error: 'Task not found' };
      const today = dayStart();
      if (tool === 'tasks_complete') {
        const existing = await prisma.taskLog.findFirst({ where: { taskId: args.id, userId, completedAt: today } });
        if (existing) return { alreadyDone: true };
        await prisma.taskLog.create({ data: { taskId: args.id, userId, note: args.note || '', completedAt: today } });
        let recurring = !!task.isEveryday;
        if (task.scheduledDays) {
          try {
            const sd = typeof task.scheduledDays === 'string' ? JSON.parse(task.scheduledDays) : task.scheduledDays;
            if (Array.isArray(sd) && sd.length) recurring = true;
          } catch { /* treat as one-time */ }
        }
        if (!recurring) await prisma.task.update({ where: { id: args.id }, data: { isActive: false } });
        return { ok: true, completed: true };
      }
      const log = await prisma.taskLog.findFirst({ where: { taskId: args.id, userId, completedAt: today } });
      if (!log) return { error: 'No completion found for today' };
      await prisma.taskLog.delete({ where: { id: log.id } });
      await prisma.task.update({ where: { id: args.id }, data: { isActive: true } });
      return { ok: true, completed: false };
    }
    case 'tasks_delete': {
      const task = await prisma.task.findUnique({ where: { id: args.id } });
      if (!task || task.userId !== userId) return { error: 'Task not found' };
      await prisma.taskLog.deleteMany({ where: { taskId: args.id } });
      await prisma.task.delete({ where: { id: args.id } });
      return { ok: true, deleted: true };
    }
    case 'habits_list': {
      const habits = await prisma.habit.findMany({
        where: { userId, active: true },
        select: { id: true, title: true, emoji: true, frequencyType: true, schedules: true, daysPerWeek: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return habits.map((h) => ({ id: h.id, title: h.title, emoji: h.emoji, frequencyType: h.frequencyType, schedules: h.schedules, daysPerWeek: h.daysPerWeek }));
    }
    case 'habits_create': {
      if (!args.title || !String(args.title).trim()) return { error: 'Title required' };
      let schedules;
      if (Array.isArray(args.schedules) && args.schedules.length) {
        for (const s of args.schedules) {
          if (s && typeof s === 'object') {
            if (Array.isArray(s.days)) for (const d of s.days) {
              if (!Number.isInteger(d) || d < 0 || d > 6) return { error: 'Schedule days must be 0-6' };
            }
            if (s.time && !TIME_RE.test(s.time)) return { error: 'Schedule time must be HH:MM' };
          }
        }
        schedules = args.schedules;
      }
      const habit = await prisma.habit.create({
        data: {
          userId,
          title: String(args.title).trim().slice(0, 200),
          description: args.description ? String(args.description).slice(0, 2000) : '',
          emoji: args.emoji ? String(args.emoji).slice(0, 8) : '🎯',
          frequencyType: 'daily',
          daysPerWeek: [0, 1, 2, 3, 4, 5, 6],
          schedules: schedules || undefined,
          verificationType: 'honor',
        },
      });
      return { id: habit.id, title: habit.title };
    }
    case 'habits_update': {
      const habit = await prisma.habit.findUnique({ where: { id: args.id } });
      if (!habit || habit.userId !== userId) return { error: 'Habit not found' };
      const data = {};
      if (args.title !== undefined) data.title = String(args.title).trim().slice(0, 200);
      if (args.description !== undefined) data.description = String(args.description ?? '').slice(0, 2000);
      if (args.emoji !== undefined) data.emoji = String(args.emoji).slice(0, 8);
      const updated = await prisma.habit.update({ where: { id: args.id }, data });
      return { id: updated.id, title: updated.title };
    }
    case 'habits_delete': {
      const habit = await prisma.habit.findUnique({ where: { id: args.id } });
      if (!habit || habit.userId !== userId) return { error: 'Habit not found' };
      await prisma.habitLog.deleteMany({ where: { habitId: args.id } });
      await prisma.habit.delete({ where: { id: args.id } });
      return { ok: true, deleted: true };
    }
    case 'habits_log':
    case 'habits_unlog': {
      const habit = await prisma.habit.findUnique({ where: { id: args.habitId }, include: { breaks: true } });
      if (!habit || habit.userId !== userId) return { error: 'Habit not found' };
      const today = dayStart();
      if (tool === 'habits_log') {
        const where = { habitId: args.habitId, userId, completedAt: today };
        if (args.scheduledTime) where.scheduledTime = args.scheduledTime;
        const existing = await prisma.habitLog.findFirst({ where });
        if (existing) return { alreadyDone: true };
        await prisma.habitLog.create({
          data: { habitId: args.habitId, userId, completedAt: today, scheduledTime: args.scheduledTime || undefined, status: 'completed' },
        });
        return { ok: true, completed: true };
      }
      const where = { habitId: args.habitId, userId, completedAt: today };
      if (args.scheduledTime) where.scheduledTime = args.scheduledTime;
      const logs = await prisma.habitLog.findMany({ where });
      if (!logs.length) return { error: 'No completion found for today' };
      await prisma.habitLog.deleteMany({ where: { id: { in: logs.map((l) => l.id) } } });
      return { ok: true, completed: false };
    }
    case 'stats_overview':
    case 'today_summary': {
      const today = dayStart();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [activeHabits, todayLogs, totalLogs] = await Promise.all([
        prisma.habit.count({ where: { userId, active: true } }),
        prisma.habitLog.count({ where: { userId, completedAt: { gte: today, lt: tomorrow } } }),
        prisma.habitLog.count({ where: { userId } }),
      ]);
      const tasks = await prisma.task.findMany({ where: { userId, isActive: true }, select: { id: true, title: true } });
      const doneIds = new Set((await prisma.taskLog.findMany({ where: { userId, completedAt: today }, select: { taskId: true } })).map((l) => l.taskId));
      return {
        activeHabits, todayLogs, totalLogs,
        tasksOpen: tasks.filter((t) => !doneIds.has(t.id)).map((t) => ({ id: t.id, title: t.title })),
        tasksDoneToday: doneIds.size,
      };
    }
    default:
      return { error: `Unknown tool ${tool}` };
  }
}

// ---- b.ai chat client with model fallback chain ----
async function chatComplete({ messages, tools, temperature = 0.2 }) {
  const key = BAI_KEY();
  if (!key) {
    const e = new Error('AI is not configured yet (missing API key).');
    e.code = 'NO_KEY';
    throw e;
  }
  const chain = modelChain();
  let lastErr = null;
  for (const model of chain) {
    try {
      const res = await fetch(`${BAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, tools, tool_choice: 'auto', temperature, max_tokens: 1200 }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        lastErr = new Error(`model ${model} failed: ${res.status} ${text.slice(0, 200)}`);
        continue;
      }
      const data = await res.json();
      return { data, model };
    } catch (e) {
      lastErr = e;
    }
  }
  const err = new Error(`All AI models failed. Last error: ${lastErr?.message || 'unknown'}`);
  err.code = 'ALL_FAILED';
  throw err;
}

function systemPrompt(settings) {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]})`;
  return [
    'You are the BeBetter in-app assistant. Today is ' + today + '.',
    'Reply in the user language. Be brief and warm.',
    'You can read and manage the user own tasks, habits, logs and stats via tools.',
    'Rules:',
    '- Use tools for facts; never invent ids, titles or stats.',
    '- For create/update/log actions state exactly what you will do; the app may ask the user to confirm first.',
    '- Deletions only when the user explicitly asked to delete/remove.',
    '- If a tool result contains {error} about missing access, tell the user they can enable it anytime in Profile → AI Assistant.',
    '- Times are HH:MM 24h, days 0=Sun..6=Sat, dates YYYY-MM-DD.',
  ].join('\n');
}

module.exports = {
  TOOLS, TOOL_POLICY, GROUP_LABEL, deniedMessage, summarizeCall,
  execTool, chatComplete, systemPrompt, modelChain,
};
