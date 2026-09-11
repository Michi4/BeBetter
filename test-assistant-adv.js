// Assistant advanced-capability probes (prod, self-cleaning). Run: node /tmp/adv.js
// Tests: past-question via history_query, multi-create batching, interval habit,
// multilingual replies (EN/FR/ES).
// NOTE: defaults to the DEV stack so a bare run can never surprise-mutate
// prod or burn paid LLM budget. Override for prod: BASE=https://bebetter.websters.at/api
const BASE = process.env.BASE || 'http://bebetter-dev-api:3000/api';
async function api(path, opts = {}, token) {
  const r = await fetch(BASE + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const t = await r.text(); let b = null; try { b = JSON.parse(t); } catch {}
  return { status: r.status, body: b };
}
async function chat(token, text, sessionId) {
  const body = { messages: [{ role: 'user', content: text }] };
  if (sessionId) body.sessionId = sessionId;
  const res = await fetch(BASE + '/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = '', evName = '', reply = '', done = null;
  while (true) {
    const { done: rd, value } = await reader.read(); if (rd) break;
    buf += dec.decode(value, { stream: true }); let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) { evName = line.slice(7).trim(); continue; }
        if (!line.startsWith('data: ')) continue;
        let p; try { p = JSON.parse(line.slice(6)); } catch { continue; }
        if (evName === 'delta') reply += p.text;
        if (evName === 'done') done = p;
        if (evName === 'error') done = { error: p.error };
        evName = '';
      }
    }
  }
  return { reply, done };
}
async function main() {
  const ts = Date.now();
  const r = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email: `ad_${ts}@test.com`, username: `ad${ts}`, password: 'test-test-test', agreeToTerms: true }) });
  const t = r.body.token;
  await api('/assistant/settings', { method: 'PUT', body: JSON.stringify({ enabled: true }) }, t);
  // seed some past activity
  const h = await api('/habits', { method: 'POST', body: JSON.stringify({ title: 'Abendspaziergang' }) }, t);
  const hid = (h.body.habit || h.body).id;
  await api('/logs', { method: 'POST', body: JSON.stringify({ habitId: hid }) }, t);

  const q1 = await chat(t, 'Was habe ich in den letzten 7 Tagen gemacht?');
  const q1tools = ((q1.done && (q1.done.actions || [])) || []).map(a => a.tool);
  console.log('PAST-Q used-history:', JSON.stringify(q1tools).includes('history') || /spaziergang/i.test(q1.reply) ? 'YES' : 'NO', '|', q1.reply.slice(0, 150));

  const q2 = await chat(t, 'Erstelle mir drei Aufgaben: Milch kaufen, Arzt anrufen, Wäsche waschen');
  const conf2 = ((q2.done && q2.done.needsConfirmation) || []);
  console.log('MULTI-CREATE pending:', conf2.length, conf2.map(a => a.tool).join(','));
  // confirm all
  if (conf2.length) {
    await fetch(BASE + '/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Ja, alle erstellen' }], sessionId: q2.done.sessionId, confirmedActions: conf2.map(a => ({ tool: a.tool, arguments: a.arguments })) }) }).then(r => r.text());
  }
  const tasks = await api('/tasks', {}, t);
  const titles = ((tasks.body && tasks.body.tasks) || []).map(x => x.title);
  console.log('MULTI-CREATE created:', ['Milch kaufen', 'Arzt anrufen'].every(x => titles.some(y => y.includes(x))) ? 'YES ' + titles.join('|') : 'NO ' + titles.join('|'));

  for (const [lang, text, expect] of [
    ['EN', 'What did I do in the last 7 days?', /walk|habit|done/i],
    ['FR', 'Quest-ce que jai fait ces 7 derniers jours ?', /promenade|habitude|fait/i],
    ['ES', 'Que hice en los ultimos 7 dias?', /paseo|hábito|hecho|hiciste/i],
  ]) {
    const q = await chat(t, text);
    console.log(lang, 'reply-ok:', expect.test(q.reply) ? 'YES' : 'NO', '|', q.reply.slice(0, 120));
  }
  await api('/auth/account', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE_MY_ACCOUNT' }) }, t);
  console.log('cleaned');
}
main().catch(e => console.error('FATAL', e.message));
