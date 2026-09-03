const { Router } = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware, demoGuard } = require('../middleware/auth');
const {
  TOOLS, TOOL_POLICY, summarizeCall, deniedMessage,
  execTool, chatComplete, systemPrompt,
} = require('../lib/assistant');

const router = Router();
router.use(authMiddleware, demoGuard);

const DEFAULTS = {
  enabled: false, confirmBeforeExecute: true,
  tasksLevel: 2, habitsLevel: 2, logsLevel: 2, statsLevel: 1,
};

async function getSettings(userId) {
  let s = await prisma.assistantSettings.findUnique({ where: { userId } });
  if (!s) {
    s = await prisma.assistantSettings.create({ data: { userId, ...DEFAULTS } });
  }
  return s;
}

function sanitizeLevels(body) {
  const out = {};
  const clamp = (v, max) => Math.max(0, Math.min(max, Number.isInteger(v) ? v : parseInt(v, 10) || 0));
  if (body.tasksLevel !== undefined) out.tasksLevel = clamp(body.tasksLevel, 3);
  if (body.habitsLevel !== undefined) out.habitsLevel = clamp(body.habitsLevel, 3);
  if (body.logsLevel !== undefined) out.logsLevel = clamp(body.logsLevel, 3);
  if (body.statsLevel !== undefined) out.statsLevel = clamp(body.statsLevel, 1);
  if (body.enabled !== undefined) out.enabled = !!body.enabled;
  if (body.confirmBeforeExecute !== undefined) out.confirmBeforeExecute = !!body.confirmBeforeExecute;
  return out;
}

router.get('/settings', async (req, res) => {
  try {
    const s = await getSettings(req.userId);
    res.json({ settings: s });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    await getSettings(req.userId);
    const data = sanitizeLevels(req.body || {});
    const s = await prisma.assistantSettings.update({ where: { userId: req.userId }, data });
    res.json({ settings: s });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Order-independent arg fingerprint: models don't serialize keys deterministically.
function stableKey(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableKey).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableKey(v[k])}`).join(',')}}`;
}

// Simple per-user rate limit: 20 chats/minute (protects the shared key)
const hits = new Map();
function rateLimited(userId) {
  const now = Date.now();
  const arr = (hits.get(userId) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(userId, arr);
  return arr.length > 20;
}

router.post('/chat', async (req, res) => {
  try {
    const settings = await getSettings(req.userId);
    if (!settings.enabled) {
      return res.status(403).json({ error: 'AI assistant is off. Enable it in Profile → AI Assistant.' });
    }
    if (rateLimited(req.userId)) {
      return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
    }

    const { messages, confirmedActions } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages required' });
    }
    const history = messages.slice(-20).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 4000),
    }));
    const confirmed = new Set(
      (Array.isArray(confirmedActions) ? confirmedActions : []).map((a) => `${a.tool}::${stableKey(a.arguments || {})}`)
    );

    const convo = [{ role: 'system', content: systemPrompt(settings) }, ...history];
    const actions = [];
    const needsConfirmation = [];
    let reply = '';
    let usedModel = '';
    let progressed = false;

    // Accepted actions execute deterministically — never depend on the model
    // regenerating the identical call.
    const executed = new Set();
    if (confirmed.size) {
      for (const a of confirmedActions) {
        const policy = TOOL_POLICY[a.tool];
        if (!policy) continue;
        if ((settings[policy.group] ?? 0) < policy.need) {
          actions.push({ tool: a.tool, status: 'denied', summary: summarizeCall(a.tool, a.arguments) });
          progressed = true;
          continue;
        }
        try {
          const result = await execTool(req.userId, a.tool, a.arguments || {});
          actions.push({ tool: a.tool, status: result?.error ? 'error' : 'done', summary: summarizeCall(a.tool, a.arguments), result });
        } catch {
          actions.push({ tool: a.tool, status: 'error', summary: summarizeCall(a.tool, a.arguments) });
        }
        executed.add(`${a.tool}::${stableKey(a.arguments || {})}`);
        progressed = true;
      }
      if (progressed) {
        convo.push({
          role: 'user',
          content: 'The user confirmed. Executed: ' + actions.map((x) => `${x.summary} [${x.status}]`).join('; ') + '. Summarize briefly what was done.',
        });
      }
    }

    for (let step = 0; step < 3; step++) {
      let out;
      try {
        out = await chatComplete({ messages: convo, tools: TOOLS });
      } catch (e) {
        if (e.code === 'NO_KEY') return res.status(503).json({ error: 'AI is not configured yet. Please try again later.' });
        // If tools already ran, report them instead of failing the request —
        // the actions happened, only the summary text is missing.
        if (progressed) break;
        return res.status(502).json({ error: 'AI is temporarily unavailable. Please try again in a moment.' });
      }
      usedModel = out.model;
      const msg = out.data?.choices?.[0]?.message || {};
      const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];

      if (msg.content) reply = msg.content;
      convo.push({ role: 'assistant', content: msg.content || '', tool_calls: calls.length ? calls : undefined });

      if (!calls.length) break;

      for (const call of calls) {
        const tool = call.function?.name;
        let args = {};
        try { args = JSON.parse(call.function?.arguments || '{}'); } catch { args = {}; }
        const policy = TOOL_POLICY[tool];
        if (!policy) {
          convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: `Unknown tool ${tool}` }) });
          continue;
        }
        const level = settings[policy.group] ?? 0;
        if (level < policy.need) {
          convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: deniedMessage(tool) }) });
          actions.push({ tool, status: 'denied', summary: summarizeCall(tool, args) });
          progressed = true;
          continue;
        }
        const key = `${tool}::${stableKey(args)}`;
        if (executed.has(key)) {
          convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ alreadyDone: true, note: 'Already executed after user confirmation.' }) });
          continue;
        }
        if (policy.write && settings.confirmBeforeExecute && !confirmed.has(key)) {
          needsConfirmation.push({ id: key, tool, arguments: args, summary: summarizeCall(tool, args) });
          convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ deferred: true, note: 'Waiting for user confirmation.' }) });
          progressed = true;
          continue;
        }
        try {
          const result = await execTool(req.userId, tool, args);
          convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 4000) });
          actions.push({ tool, status: result?.error ? 'error' : 'done', summary: summarizeCall(tool, args), result });
          progressed = true;
        } catch (e) {
          convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'Action failed. Nothing was changed.' }) });
          actions.push({ tool, status: 'error', summary: summarizeCall(tool, args) });
          progressed = true;
        }
      }
    }

    if (!reply) {
      if (needsConfirmation.length) reply = 'Please confirm below and I’ll do it right away.';
      else if (actions.length) reply = actions.map((a) => `${a.status === 'done' ? '✓' : '•'} ${a.summary}`).join('\n');
    }
    res.json({ reply: reply || 'Done.', actions, needsConfirmation, model: usedModel });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
