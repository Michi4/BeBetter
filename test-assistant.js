#!/usr/bin/env node
// BeBetter Assistant E2E — committed audit artifact (Phase 7 gap fix).
// Covers: register, enable, SSE streaming, German create+confirm flow,
// task persistence, sessions CRUD, models endpoint, no-emoji, no-default-emoji,
// account cleanup. Self-cleaning. Usage: BASE=http://host:port/api node test-assistant.js
const BASE = process.env.BASE || 'http://bebetter-dev-api:3000/api';
const ts = Date.now();
const email = `ai_${ts}@test.com`;
let pass = 0, fail = 0;
const ok = (c, label) => { if (c) { pass++; console.log(`[PASS] ${label}`); } else { fail++; console.log(`[FAIL] ${label}`); } };

async function api(path, opts = {}, token) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...((opts && opts.headers) || {}) },
  });
  const text = await res.text();
  let body = null; try { body = JSON.parse(text); } catch {}
  return { status: res.status, body, text };
}

// POST /assistant/chat and parse the SSE stream into events.
async function chat(token, messages, sessionId, confirmedActions) {
  const body = { messages };
  if (sessionId) body.sessionId = sessionId;
  if (confirmedActions) body.confirmedActions = confirmedActions;
  const res = await fetch(BASE + '/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const events = [];
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', evName = '', deltas = 0, thinking = false, done = null;
  while (true) {
    const { done: rdone, value } = await reader.read();
    if (rdone) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) { evName = line.slice(7).trim(); continue; }
        if (!line.startsWith('data: ')) continue;
        let payload; try { payload = JSON.parse(line.slice(6)); } catch { continue; }
        events.push({ event: evName, data: payload });
        if (evName === 'delta') deltas++;
        if (evName === 'thinking') thinking = true;
        if (evName === 'done') done = payload;
        if (evName === 'error') done = { error: payload.error };
        evName = '';
      }
    }
  }
  return { status: res.status, deltas, thinking, done, events };
}

async function main() {
  const r1 = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, username: `ai${ts}`, password: 'test-test-test', acceptTerms: true, agreeToTerms: true }) });
  const token = r1.body && (r1.body.token || r1.body.accessToken);
  ok(!!token, 'register + token');

  const en = await api('/assistant/settings', { method: 'PUT', body: JSON.stringify({ enabled: true }) }, token);
  ok(en.status === 200, `assistant enable (${en.status})`);

  // 1) German create -> must stream + land in needsConfirmation (confirmBeforeExecute default true)
  const c1 = await chat(token, [{ role: 'user', content: 'Erstelle mir eine Aufgabe "Zahnarzt anrufen" für morgen' }]);
  ok(c1.deltas > 0, `streaming deltas (${c1.deltas})`);
  ok(!!(c1.done && c1.done.sessionId), `sessionId in done (${c1.done && c1.done.sessionId})`);
  ok(Array.isArray(c1.done && c1.done.needsConfirmation) && c1.done.needsConfirmation.length > 0, 'needsConfirmation present');
  const reply1 = c1.events.filter(e => e.event === 'delta').map(e => e.data.text).join('') + ((c1.done && c1.done.reply) || '');
  ok(/[äöüß]|Aufgabe|erstellt|erstelle/i.test(reply1), `German reply`);
  const noEmoji = !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(reply1 + JSON.stringify((c1.done && c1.done.needsConfirmation) || []));
  ok(noEmoji, 'no emojis in reply/actions');

  // 2) confirm round executes the tool
  const conf = (c1.done.needsConfirmation || []).map((a) => ({ tool: a.tool, arguments: a.arguments }));
  await chat(token, [{ role: 'user', content: 'Ja, mach das' }], c1.done.sessionId, conf);
  const tasks = await api('/tasks', {}, token);
  const taskArr = (tasks.body && tasks.body.tasks) || tasks.body || [];
  ok(Array.isArray(taskArr) && taskArr.some(t => t.title === 'Zahnarzt anrufen'), 'task created via assistant');
  const created = taskArr.find(t => t.title === 'Zahnarzt anrufen');
  ok(created && !created.emoji, 'assistant-created task has no emoji');

  // 3) general question streams
  const c3 = await chat(token, [{ role: 'user', content: 'Was sind gute Gewohnheiten für morgens?' }]);
  ok(c3.deltas > 0 && !(c3.done && c3.done.error), `general Q streaming (${c3.deltas})`);

  // 4) sessions CRUD
  const sessions = await api('/assistant/sessions', {}, token);
  const sessionArr = (sessions.body && sessions.body.sessions) || sessions.body || [];
  ok(sessions.status === 200 && Array.isArray(sessionArr) && sessionArr.length >= 1, `sessions list (${sessionArr.length})`);
  ok(sessionArr[0] && (sessionArr[0].preview || sessionArr[0].updatedAt), 'session preview present');
  const sid = sessionArr[0] && sessionArr[0].id;
  const one = await api(`/assistant/sessions/${sid}`, {}, token);
  ok(one.status === 200 && ((one.body && one.body.messages && one.body.messages.length) || 0) >= 2, `session messages persisted (${one.body && one.body.messages && one.body.messages.length})`);
  const models = await api('/assistant/sessions/meta/models', {}, token);
  ok(models.status === 200 && (models.body && Array.isArray(models.body.models)), 'models endpoint');
  const rename = await api(`/assistant/sessions/${sid}`, { method: 'PATCH', body: JSON.stringify({ title: 'Meine Tests' }) }, token);
  ok(rename.status === 200 && ((rename.body && rename.body.title) === 'Meine Tests' || (rename.body && rename.body.session && rename.body.session.title === 'Meine Tests')), 'session rename');
  const del = await api(`/assistant/sessions/${sid}`, { method: 'DELETE' }, token);
  ok(del.status === 200, 'session delete');

  // 5) no default emoji via API creates
  const t2 = await api('/tasks', { method: 'POST', body: JSON.stringify({ title: 'No emoji task' }) }, token);
  ok(!((t2.body && t2.body.emoji) || (t2.body && t2.body.task && t2.body.task.emoji)), 'no default emoji on task');
  const h2 = await api('/habits', { method: 'POST', body: JSON.stringify({ title: 'No emoji habit' }) }, token);
  ok(!((h2.body && h2.body.emoji) || (h2.body && h2.body.habit && h2.body.habit.emoji)), 'no default emoji on habit');

  // cleanup
  if (t2.body && (t2.body.id || (t2.body.task && t2.body.task.id))) await api(`/tasks/${t2.body.id || t2.body.task.id}`, { method: 'DELETE' }, token);
  if (h2.body && (h2.body.id || (h2.body.habit && h2.body.habit.id))) await api(`/habits/${h2.body.id || h2.body.habit.id}`, { method: 'DELETE' }, token);
  const del2 = await api('/auth/account', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE_MY_ACCOUNT' }) }, token);
  ok(del2.status === 200 || del2.status === 204, 'cleanup account');
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
  console.log('CLEANED');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
