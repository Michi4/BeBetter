const prisma = require('./prisma');

const BAI_BASE = (process.env.B_AI_BASE_URL || 'https://api.b.ai/v1').replace(/\/$/, '');
const BAI_KEY = () => process.env.B_AI_API_KEY || '';
// Only models verified working (200 + tool calls) on the current key.
// Everything else on b.ai 403s with insufficient credit — dead entries used
// to burn 30-45s of "Thinking…" before the fallback kicked in.
const DEFAULT_CHAIN = ['glm-5.3-flash', 'hy3'];

function modelChain(preferred) {
  const fromEnv = (process.env.AI_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const chain = [...(preferred ? [preferred] : []), ...fromEnv, ...DEFAULT_CHAIN];
  return [...new Set(chain)];
}

// Second provider: Google Gemini free tier via the OpenAI-compatible endpoint
// (same chat-completions shape incl. tools + SSE streaming). Needs only a
// free AI Studio key — used when b.ai has no usable model left.
const GEMINI_BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/').replace(/\/$/, '');
const GEMINI_KEY = () => process.env.GEMINI_API_KEY || '';

function geminiModels(preferred) {
  const fromEnv = (process.env.GEMINI_MODELS || 'gemini-2.5-flash')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const chain = [...(preferred && !modelChain().includes(preferred) ? [preferred] : []), ...fromEnv];
  return [...new Set(chain)];
}

// Third provider: TokenHarbor (OpenAI-compatible) — primary paid route,
// e.g. DeepSeek V4.1 Flash. Env: TOKENHARBOR_API_KEY / TOKENHARBOR_BASE_URL /
// TOKENHARBOR_MODELS.
const TH_BASE = (process.env.TOKENHARBOR_BASE_URL || 'https://tokenharbor.ai/v1').replace(/\/$/, '');
const TH_KEY = () => process.env.TOKENHARBOR_API_KEY || '';

function thModels(preferred) {
  const fromEnv = (process.env.TOKENHARBOR_MODELS || 'deepseek-v4.1-flash:free,deepseek-v4.1-flash')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const known = [...modelChain(), ...geminiModels()];
  const chain = [...(preferred && !known.includes(preferred) ? [preferred] : []), ...fromEnv];
  return [...new Set(chain)];
}

// All selectable models (settings dropdown): every keyed provider's chain.
function availableModels(settings) {
  const base = modelChain();
  if (TH_KEY()) {
    for (const m of thModels()) if (!base.includes(m)) base.push(m);
  }
  if (GEMINI_KEY()) {
    for (const m of geminiModels()) if (!base.includes(m)) base.push(m);
  }
  const custom = settings ? customProviderFromSettings(settings) : null;
  if (custom && !base.includes(custom.model)) base.push(custom.model);
  return base;
}

// A response means "no usable quota on this provider" (vs transient errors).
// 429 throttling is ALWAYS transient — even Google's "check plan and billing"
// wording recovers on its own. Money words only count on 400/402/403.
function isQuotaError(status, text) {
  if (status === 429) return false;
  const t = String(text || '');
  if (/insufficient|balance|out of credit|top up|billing|deposit required|payment/i.test(t)) return true;
  if (status === 402) return true;
  if (status === 400 || status === 403) {
    return /quota|credit/i.test(t);
  }
  return false;
}

function customProviderFromSettings(settings) {
  if (!settings || !settings.customEnabled) return null;
  const { decrypt } = require('./encryption');
  const key = settings.customApiKey ? decrypt(settings.customApiKey) : null;
  const base = settings.customBaseUrl ? String(settings.customBaseUrl).trim().replace(/\/$/, '') : null;
  const model = settings.customModel ? String(settings.customModel).trim() : null;
  if (!key || !base || !model) return null;
  try { new URL(base); } catch { return null; }
  if (!/^https:\/\//.test(base)) return null;
  return { base, key, model };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Models pass dates as strings — never let an invalid one reach Prisma.
function parseDueDate(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || !DATE_RE.test(v) || Number.isNaN(new Date(v).getTime())) return { invalid: true };
  return new Date(v);
}

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
      description: 'Create a task. dueDate (YYYY-MM-DD) for a due day, scheduledTime (HH:MM) for a reminder time. intervalDays repeats every N days from today. Repeat: isEveryday true for daily, or scheduledDays [0-6] for weekly repeats (0=Sun). reminderMinutes e.g. [0] at time, [15,0] for 15min before + at time.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' }, description: { type: 'string' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD' }, scheduledTime: { type: 'string', description: 'HH:MM' },
          isEveryday: { type: 'boolean' }, scheduledDays: { type: 'array', items: { type: 'integer' } },
          intervalDays: { type: 'integer', description: 'Repeat every N days (2-365) from today' },
          reminderMinutes: { type: 'array', items: { type: 'integer' }, description: 'Offsets in minutes, 0 = at time' },
        },
        required: ['title'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tasks_update',
      description: 'Update a task title/description/dueDate by id. Null clears a field.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
          dueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD or null to clear' },
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
      description: 'Create a habit. schedules is a list of {time: HH:MM|null, days: [0-6]}. Omit schedules for an untimed daily habit. intervalDays (2-365) makes it repeat every N days from today instead of weekdays.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' }, description: { type: 'string' },
          schedules: {
            type: 'array',
            items: { type: 'object', properties: { time: { type: ['string', 'null'] }, days: { type: 'array', items: { type: 'integer' } } }, additionalProperties: false },
          },
          intervalDays: { type: 'integer', description: 'Repeat every N days (2-365)' },
          reminderMinutes: { type: 'array', items: { type: 'integer' }, description: 'Offsets in minutes, 0 = at time' },
        },
        required: ['title'], additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'habits_update',
      description: 'Update a habit title/description/schedule by id. Use schedules [{time: HH:MM|null, days:[0-6]}] and/or intervalDays (every N days) and/or reminderMinutes [0,5...] to change when it is due and when to remind.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }, description: { type: 'string' },
          schedules: { type: 'array', items: { type: 'object', properties: { time: { type: ['string', 'null'] }, days: { type: 'array', items: { type: 'integer' } } }, additionalProperties: false } },
          intervalDays: { type: ['integer', 'null'], description: '2-365 or null to clear interval' },
          reminderMinutes: { type: 'array', items: { type: 'integer' } },
        },
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
      name: 'history_query',
      description: 'Look up past completions (habit + task logs) in a date range. Use for ANY question about the past: what was done, when, how often. Dates YYYY-MM-DD, defaults to the last 7 days. Max 93-day span.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD start, default 7 days ago' },
          to: { type: 'string', description: 'YYYY-MM-DD end, default today' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'link_read',
      description: 'Fetch a public web page or YouTube video and return its readable text (title + content). Use whenever the user shares a URL and asks about it, wants a summary, or wants info from it. Never invent link contents — always read first.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full http(s) URL to read' },
          maxChars: { type: 'integer', description: 'Max characters of text to return (default 8000, max 20000)' },
        },
        required: ['url'],
        additionalProperties: false,
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
  history_query: { group: 'statsLevel', need: 1, write: false },
  link_read: { group: 'statsLevel', need: 1, write: false },
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
  // Short subject-only chip: the reply text around it carries the meaning.
  const a = args || {};
  const q = (s) => (s == null || s === '' ? '' : ` "${String(s).slice(0, 60)}"`);
  switch (tool) {
    case 'tasks_create': return `Task${q(a.title)}`;
    case 'tasks_update': return `Updated${q(a.title)}`;
    case 'tasks_complete': return 'Completed';
    case 'tasks_uncomplete': return 'Reopened';
    case 'tasks_delete': return 'Deleted';
    case 'habits_create': return `Habit${q(a.title)}`;
    case 'habits_update': return `Updated${q(a.title)}`;
    case 'habits_delete': return 'Deleted';
    case 'habits_log': return 'Logged';
    case 'habits_unlog': return 'Unlogged';
    case 'history_query': return 'History';
    case 'link_read': return `Link${q(String(a.url || '').replace(/^https?:\/\//, '').slice(0, 40))}`;
    default: return 'Done';
  }
}

// ---- Link reading (SSRF-safe) ----
const dns = require('dns').promises;

function ipIsPrivate(ip) {
  if (!ip) return true;
  if (ip.includes(':')) {
    const l = ip.toLowerCase();
    return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') ||
      l.startsWith('fe80') || l.startsWith('ff');
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) || (p[0] === 169 && p[1] === 254);
}

async function assertPublicUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { throw new Error('Invalid URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http(s) URLs allowed');
  if (!u.hostname || u.hostname.toLowerCase() === 'localhost') throw new Error('URL not allowed');
  let addrs;
  try {
    addrs = await dns.lookup(u.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('Could not resolve host');
  }
  if (!addrs.length || addrs.some((a) => ipIsPrivate(a.address))) {
    throw new Error('URL not allowed');
  }
  return u.toString();
}

function htmlToText(html, maxChars) {
  let t = String(html || '');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<(nav|footer|header|aside|form|noscript|svg|canvas)[\s\S]*?<\/\1>/gi, ' ');
  const title = (t.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const desc = (t.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  const head = [title.trim(), desc.trim()].filter(Boolean).join('\n');
  const body = t.slice(0, maxChars);
  return { title: title.trim().slice(0, 300), text: (head ? head + '\n' : '') + body, truncated: t.length > maxChars };
}

async function fetchCapped(url, maxBytes = 200000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    let current = url;
    for (let hop = 0; hop < 4; hop++) {
      await assertPublicUrl(current);
      const res = await fetch(current, {
        headers: { 'User-Agent': 'BeBetterAssistant/1.0 (+https://bebetter.websters.at)', Accept: 'text/html,application/xhtml+xml' },
        signal: ctrl.signal, redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location'), current).toString();
        await res.arrayBuffer().catch(() => null);
        continue;
      }
      if (!res.ok && res.status !== 200) throw new Error(`Fetch failed: ${res.status}`);
      const reader = res.body.getReader();
      const chunks = [];
      let bytes = 0;
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        done = d;
        if (value) {
          bytes += value.length;
          if (bytes > maxBytes) { try { await reader.cancel(); } catch {} break; }
          chunks.push(value);
        }
      }
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      return { finalUrl: current, text: buf.toString('utf8'), contentType: res.headers.get('content-type') || '' };
    }
    throw new Error('Too many redirects');
  } finally {
    clearTimeout(timer);
  }
}

function youTubeId(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    const h = u.hostname.toLowerCase().replace(/^www\./, '');
    if (h === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return /^[A-Za-z0-9_-]{6,20}$/.test(id || '') ? id : null;
    }
    if (h === 'youtube.com' || h === 'm.youtube.com' || h.endsWith('.youtube.com')) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        return /^[A-Za-z0-9_-]{6,20}$/.test(id || '') ? id : null;
      }
      const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{6,20})/);
      if (m) return m[2];
    }
  } catch {}
  return null;
}

async function readLink(rawUrl, maxChars) {
  const n = Number(maxChars);
  const limit = Number.isInteger(n) ? Math.min(Math.max(n, 500), 20000) : 8000;
  const youId = youTubeId(rawUrl);
  let prefix = '';
  if (youId) {
    // oEmbed gives reliable title/author without scraping the watch page.
    try {
      const oUrl = await assertPublicUrl(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youId}`)}&format=json`);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const r = await fetch(oUrl, { signal: ctrl.signal });
        if (r.ok) {
          const o = await r.json();
          if (o.title || o.author_name) prefix = [`Video: ${o.title || 'YouTube video'}`, o.author_name ? `Channel: ${o.author_name}` : null].filter(Boolean).join('\n') + '\n';
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {}
  }
  const { finalUrl, text, contentType } = await fetchCapped(rawUrl);
  if (!/html|text\//i.test(contentType) && contentType && !/^\s*</.test(text)) {
    return { url: finalUrl, title: prefix.split('\n')[0] || '', text: (prefix + '(not a readable page)').slice(0, limit), truncated: false };
  }
  const { title, text: body, truncated } = htmlToText(text, limit - Math.min(prefix.length, 1000));
  return { url: finalUrl, title: title || prefix.split('\n')[0] || '', text: (prefix + body).slice(0, limit), truncated: truncated || (prefix.length + body.length) >= limit };
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
      const due = parseDueDate(args.dueDate);
      if (due && due.invalid) return { error: 'dueDate must be YYYY-MM-DD' };
      let schedDays;
      if (args.scheduledDays !== undefined) {
        if (!Array.isArray(args.scheduledDays) || !args.scheduledDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
          return { error: 'scheduledDays must be an array of 0-6' };
        }
        schedDays = [...args.scheduledDays].sort((a, b) => a - b);
      }
      let taskInterval;
      if (args.intervalDays !== undefined && args.intervalDays !== null) {
        taskInterval = Number(args.intervalDays);
        if (!Number.isInteger(taskInterval) || taskInterval < 2 || taskInterval > 365) {
          return { error: 'intervalDays must be a whole number between 2 and 365' };
        }
      }
      let remMinutes;
      if (args.reminderMinutes !== undefined) {
        if (!Array.isArray(args.reminderMinutes) || !args.reminderMinutes.every((m) => Number.isInteger(m) && m >= 0 && m <= 1440)) {
          return { error: 'reminderMinutes must be integers 0-1440' };
        }
        remMinutes = args.reminderMinutes;
      }
      const task = await prisma.task.create({
        data: {
          userId,
          title: String(args.title).trim().slice(0, 200),
          description: args.description ? String(args.description).slice(0, 2000) : '',
          dueDate: due || undefined,
          scheduledTime: args.scheduledTime || undefined,
          isEveryday: args.isEveryday === true ? true : undefined,
          intervalDays: taskInterval !== undefined ? taskInterval : undefined,
          scheduledDays: schedDays !== undefined ? JSON.stringify(schedDays) : undefined,
          reminderMinutes: remMinutes !== undefined ? remMinutes : (args.scheduledTime ? [0] : undefined),
        },
      });
      return { id: task.id, title: task.title };
    }
    case 'tasks_update': {
      const task = await prisma.task.findUnique({ where: { id: args.id } });
      if (!task || task.userId !== userId) return { error: 'Task not found' };
      const data = {};
      if (args.title !== undefined) {
        const t = String(args.title).trim();
        if (!t) return { error: 'Title cannot be empty' };
        data.title = t.slice(0, 200);
      }
      if (args.description !== undefined) data.description = String(args.description ?? '').slice(0, 2000);
      if (args.dueDate !== undefined) {
        const due = parseDueDate(args.dueDate);
        if (due && due.invalid) return { error: 'dueDate must be YYYY-MM-DD' };
        data.dueDate = due;
      }
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
      let intervalDays;
      if (args.intervalDays !== undefined && args.intervalDays !== null) {
        intervalDays = Number(args.intervalDays);
        if (!Number.isInteger(intervalDays) || intervalDays < 2 || intervalDays > 365) {
          return { error: 'intervalDays must be a whole number between 2 and 365' };
        }
      }
      let remMinutes;
      if (args.reminderMinutes !== undefined) {
        if (!Array.isArray(args.reminderMinutes) || !args.reminderMinutes.every((m) => Number.isInteger(m) && m >= 0 && m <= 1440)) {
          return { error: 'reminderMinutes must be integers 0-1440' };
        }
        remMinutes = args.reminderMinutes;
      }
      const habit = await prisma.habit.create({
        data: {
          userId,
          title: String(args.title).trim().slice(0, 200),
          description: args.description ? String(args.description).slice(0, 2000) : '',
          frequencyType: 'daily',
          daysPerWeek: [0, 1, 2, 3, 4, 5, 6],
          schedules: schedules || undefined,
          intervalDays: intervalDays !== undefined ? intervalDays : undefined,
          reminderMinutes: remMinutes !== undefined ? remMinutes
            : (Array.isArray(schedules) && schedules.some((s) => s && s.time) ? [0] : undefined),
          verificationType: 'honor',
        },
      });
      return { id: habit.id, title: habit.title };
    }
    case 'habits_update': {
      const habit = await prisma.habit.findUnique({ where: { id: args.id } });
      if (!habit || habit.userId !== userId) return { error: 'Habit not found' };
      const data = {};
      if (args.title !== undefined) {
        const t = String(args.title).trim();
        if (!t) return { error: 'Title cannot be empty' };
        data.title = t.slice(0, 200);
      }
      if (args.description !== undefined) data.description = String(args.description ?? '').slice(0, 2000);
      if (args.schedules !== undefined) {
        if (args.schedules === null) {
          data.schedules = null;
        } else {
          if (!Array.isArray(args.schedules)) return { error: 'schedules must be an array' };
          for (const s of args.schedules) {
            if (s && typeof s === 'object') {
              if (Array.isArray(s.days)) for (const d of s.days) if (!Number.isInteger(d) || d < 0 || d > 6) return { error: 'Schedule days must be 0-6' };
              if (s.time && !TIME_RE.test(s.time)) return { error: 'Schedule time must be HH:MM' };
            }
          }
          data.schedules = args.schedules;
          // keep daysPerWeek in sync
          const union = new Set();
          for (const s of args.schedules) if (Array.isArray(s.days)) for (const d of s.days) union.add(d);
          if (union.size) { data.daysPerWeek = [...union].sort((a, b) => a - b); data.frequencyType = 'daily'; }
        }
      }
      if (args.intervalDays !== undefined) {
        if (args.intervalDays === null) data.intervalDays = null;
        else {
          const n = Number(args.intervalDays);
          if (!Number.isInteger(n) || n < 2 || n > 365) return { error: 'intervalDays must be 2-365' };
          data.intervalDays = n;
        }
      }
      if (args.reminderMinutes !== undefined) {
        if (!Array.isArray(args.reminderMinutes)) return { error: 'reminderMinutes must be an array' };
        for (const m of args.reminderMinutes) if (!Number.isInteger(m) || m < 0 || m > 1440) return { error: 'reminderMinutes must be 0-1440' };
        data.reminderMinutes = args.reminderMinutes;
      }
      if (!Object.keys(data).length) return { error: 'Nothing to update' };
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
      if (args.scheduledTime && !TIME_RE.test(args.scheduledTime)) return { error: 'scheduledTime must be HH:MM' };
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
    case 'history_query': {
      const dayKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const parseDay = (v, fb) => {
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          const p = v.split('-').map(Number);
          const d = new Date(p[0], p[1] - 1, p[2]);
          if (!Number.isNaN(d.getTime())) return d;
        }
        return fb;
      };
      const today = dayStart();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      let from = parseDay(args.from, weekAgo);
      let to = parseDay(args.to, today);
      if (from > to) [from, to] = [to, from];
      // Clamp span to 93 days.
      if ((to - from) / 86400000 > 93) {
        from = new Date(to);
        from.setDate(from.getDate() - 93);
      }
      const toNext = new Date(to);
      toNext.setDate(toNext.getDate() + 1);
      const [hLogs, tLogs, habitTotal, taskTotal] = await Promise.all([
        prisma.habitLog.findMany({
          where: { userId, completedAt: { gte: from, lt: toNext } },
          include: { habit: { select: { title: true } } },
          orderBy: { completedAt: 'desc' },
          take: 100,
        }),
        prisma.taskLog.findMany({
          where: { userId, completedAt: { gte: from, lt: toNext } },
          include: { task: { select: { title: true } } },
          orderBy: { completedAt: 'desc' },
          take: 100,
        }),
        prisma.habitLog.count({ where: { userId, completedAt: { gte: from, lt: toNext } } }),
        prisma.taskLog.count({ where: { userId, completedAt: { gte: from, lt: toNext } } }),
      ]);
      const entries = [
        ...hLogs.map((l) => ({ date: dayKeyOf(l.completedAt), type: 'habit', title: l.habit?.title || 'Habit' })),
        ...tLogs.map((l) => ({ date: dayKeyOf(l.completedAt), type: 'task', title: l.task?.title || 'Task' })),
      ].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 100);
      return {
        from: dayKeyOf(from), to: dayKeyOf(to),
        habitCompletions: habitTotal, taskCompletions: taskTotal,
        truncated: entries.length >= 100 || habitTotal > 100 || taskTotal > 100,
        entries,
      };
    }
    case 'link_read': {
      if (!args.url || typeof args.url !== 'string') return { error: 'url required' };
      try {
        return await readLink(args.url, args.maxChars);
      } catch (e) {
        return { error: String(e.message || 'Could not read link').slice(0, 200) };
      }
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
function extractSseData(buffer) {
  // Returns {events, rest} — complete `data:` payloads split out of the raw
  // SSE stream (chunks can split lines mid-buffer).
  const events = [];
  let rest = buffer;
  let idx;
  while ((idx = rest.indexOf('\n')) !== -1) {
    const line = rest.slice(0, idx).replace(/\r$/, '');
    rest = rest.slice(idx + 1);
    if (line.startsWith('data:')) events.push(line.slice(5).trim());
  }
  return { events, rest };
}

// Streaming variant: calls onDelta(tokenText) as tokens arrive so the UI can
// render the reply live. Falls back to non-streaming for models that reject
// stream:true. Resolves {data, model} with the assembled final message.
async function chatStream({ messages, tools, temperature = 0.2, preferred, custom, signal, onDelta, onThinking }) {
  // Provider order: custom first if configured, then tokenharbor → b.ai → gemini.
  const providers = [];
  if (custom && custom.base && custom.key && custom.model) {
    providers.push({ name: 'custom', base: custom.base, key: custom.key, models: [custom.model] });
  }
  // Default order: tokenharbor (paid primary) → b.ai → gemini (free backup).
  if (TH_KEY()) providers.push({ name: 'tokenharbor', base: TH_BASE, key: TH_KEY(), models: thModels(preferred) });
  if (BAI_KEY()) providers.push({ name: 'b.ai', base: BAI_BASE, key: BAI_KEY(), models: modelChain(preferred) });
  if (GEMINI_KEY()) providers.push({ name: 'gemini', base: GEMINI_BASE, key: GEMINI_KEY(), models: geminiModels(preferred) });
  // A pinned model jumps its provider to the front (avoids slow dead-provider
  // timeouts before reaching the wanted one).
  if (preferred) {
    const owner = providers.find((p) => p.models[0] === preferred);
    if (owner) {
      providers.sort((a, b) => (a === owner ? -1 : b === owner ? 1 : 0));
    }
  }
  if (!providers.length) {
    const e = new Error('AI is not configured yet (missing API key).');
    e.code = 'NO_KEY';
    throw e;
  }
  const effective = signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000);
  let lastErr = null;
  let quotaDead = 0;
  const quotaProviders = providers.length;
  for (const p of providers) {
    let providerQuotaDead = true;
    for (const model of p.models) {
      try {
        const out = await tryModel(p, model, { messages, tools, temperature, signal: effective, onDelta, onThinking });
        return { ...out, provider: p.name };
      } catch (e) {
        lastErr = e;
        if (signal?.aborted) {
          const err = new Error('Client disconnected');
          err.code = 'CLIENT_GONE';
          throw err;
        }
        if (e.quota) {
          console.warn('[assistant] quota dead:', `${p.name}/${model}`.slice(0, 120));
          continue;
        }
        providerQuotaDead = false;
        console.warn('[assistant] falling back:', `${p.name}/${model}: ${e.message}`.slice(0, 160));
      }
    }
    if (providerQuotaDead) quotaDead++;
  }
  if (quotaDead >= quotaProviders) {
    const err = new Error('All AI providers are out of credit. Last error: ' + (lastErr?.message || 'unknown'));
    err.code = 'QUOTA_EXHAUSTED';
    throw err;
  }
  const err = new Error(`All AI models failed. Last error: ${lastErr?.message || 'unknown'}`);
  err.code = 'ALL_FAILED';
  throw err;
}

async function tryModel(p, model, { messages, tools, temperature, signal, onDelta, onThinking }) {
  const res = await fetch(`${p.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}`, Accept: 'text/event-stream' },
    body: JSON.stringify({ model, messages, tools, tool_choice: 'auto', temperature, max_tokens: 1200, stream: true }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const e = new Error(`model ${model} failed: ${res.status} ${text.slice(0, 200)}`);
    if (isQuotaError(res.status, text)) e.quota = true;
    throw e;
  }
  if (!res.body) throw new Error(`model ${model}: no body`);
  // Non-streaming fallback: some models error on stream:true.
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('event-stream')) {
    const data = await res.json();
    return { data, model };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let content = '';
  let toolCalls = null;
  let sawAny = false;
  let finish = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const { events, rest } = extractSseData(buf);
    buf = rest;
    for (const ev of events) {
      if (!ev || ev === '[DONE]') continue;
      let j;
      try { j = JSON.parse(ev); } catch { continue; }
      const delta = j.choices?.[0]?.delta || {};
      if (delta.content) {
        content += delta.content;
        sawAny = true;
        try { onDelta?.(delta.content); } catch {}
      }
      if (delta.reasoning_content) {
        sawAny = true;
        try { onThinking?.(delta.reasoning_content); } catch {}
      }
      if (Array.isArray(delta.tool_calls)) {
        toolCalls = toolCalls || [];
        for (const tc of delta.tool_calls) {
          const i = tc.index ?? 0;
          if (!toolCalls[i]) {
            toolCalls[i] = { id: tc.id || `call_${i}`, type: 'function', function: { name: tc.function?.name || '', arguments: '' } };
          }
          if (tc.id) toolCalls[i].id = tc.id;
          if (tc.function?.name) toolCalls[i].function.name = tc.function.name;
          if (tc.function?.arguments) toolCalls[i].function.arguments += tc.function.arguments;
        }
        sawAny = true;
      }
      if (j.choices?.[0]?.finish_reason) finish = j.choices[0].finish_reason;
    }
  }
  if (!sawAny && !content && !toolCalls) throw new Error(`model ${model}: empty stream`);
  const message = { role: 'assistant', content };
  if (toolCalls) message.tool_calls = toolCalls.filter(Boolean);
  return { data: { choices: [{ message, finish_reason: finish || 'stop' }] }, model };
}

function systemPrompt(settings) {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]})`;
  return [
    'You are the BeBetter in-app assistant. Today is ' + today + '.',
    'Be brief and warm.',
    'LANGUAGE: Always reply in the language the user writes in — German messages get German replies, English gets English, and so on. This applies to every reply, including confirmations, summaries and small talk.',
    'NO EMOJI: Never use emojis, emoticons or decorative symbols anywhere — not in replies, not in titles or descriptions you create. Plain text only.',
    'You can read and manage the user own tasks, habits, logs and stats via tools.',
    'Rules:',
    '- Use tools for facts; never invent ids, titles or stats.',
    '- For create/update/log actions CALL the matching tool immediately (never just announce it); the app may ask the user to confirm first.',
    '- Deletions only when the user explicitly asked to delete/remove.',
    '- If a tool result contains {error} about missing access, tell the user they can enable it anytime in Profile \u2192 AI Assistant.',
    '- Times are HH:MM 24h, days 0=Sun..6=Sat, dates YYYY-MM-DD. For a task due on a day without a specific time, pass only dueDate and leave scheduledTime out.',
    '- MULTIPLE CREATIONS: when the user asks for several tasks/habits at once, emit ALL the create calls together in a single turn (parallel tool calls) — never one per message, never ask "what else" between them.',
    '- PAST QUESTIONS: questions about what happened ("what did I do last week", "did I run yesterday", "how often") MUST be answered with history_query first — never guess, never say you cannot see the past. Compute the answer from its entries.',
    '- ADVANCED SCHEDULING: habits support intervalDays (every N days from today) and weekday schedules with times; tasks support dueDate + scheduledTime + weekly repeats (scheduledDays) or daily (isEveryday) + reminder offsets ([0] = at time). Offer these options when a request is vague instead of picking silently.',
    '- LINKS: when the user shares a URL (article, YouTube video, anything) and asks about it, use link_read FIRST and base your answer on what it returns — never invent video/article contents. If link_read errors, say so plainly.',
  ].join('\n');
}

module.exports = {
  TOOLS, TOOL_POLICY, GROUP_LABEL, deniedMessage, summarizeCall,
  execTool, chatStream, systemPrompt, modelChain,
  geminiModels, thModels, availableModels, customProviderFromSettings, isQuotaError,
};
