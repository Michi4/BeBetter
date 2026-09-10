#!/usr/bin/env node
// BeBetter FULL E2E sweep — every feature, happy path + key edges. Committed audit artifact.
// Self-cleaning (account delete cascades). Stays under rate limits (2 registers, few logins).
// Usage: BASE=http://host:port/api node test-e2e-full.js
const BASE = process.env.BASE || 'http://bebetter-dev-api:3000/api';
const ts = Date.now();
let pass = 0, fail = 0;
const ok = (c, label, extra) => { if (c) { pass++; console.log(`[PASS] ${label}`); } else { fail++; console.log(`[FAIL] ${label}${extra ? ' :: ' + extra : ''}`); } };
async function api(path, opts = {}, token) {
  const r = await fetch(BASE + path, { ...opts, headers: { ...(opts && opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...((opts && opts.headers) || {}) } });
  const t = await r.text(); let b = null; try { b = JSON.parse(t); } catch {}
  return { status: r.status, body: b, raw: t.slice(0, 160) };
}
const uid = (o) => (o && (o.id || (o.habit && o.habit.id) || (o.task && o.task.id) || (o.preset && o.preset.id) || (o.challenge && o.challenge.id)));
async function main() {
  const A = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email: `fa_${ts}@test.com`, username: `fa${ts}`, password: 'test-test-test', agreeToTerms: true }) });
  const B = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email: `fb_${ts}@test.com`, username: `fb${ts}`, password: 'test-test-test', agreeToTerms: true }) });
  const ta = A.body && A.body.token, tb = B.body && B.body.token;
  ok(!!ta && !!tb, 'register A+B');
  const bad1 = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email: `fx_${ts}@test.com`, username: 'x', password: 'test-test-test', agreeToTerms: true }) });
  ok(bad1.status === 400, 'register short username 400');
  const bad2 = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email: `fa_${ts}@test.com`, username: `fz${ts}`, password: 'test-test-test', agreeToTerms: true }) });
  ok(bad2.status === 409, 'register dup email 409');

  // ---- auth/me ----
  const me = await api('/auth/me', {}, ta);
  ok(me.status === 200 && me.body && me.body.user && me.body.user.email === `fa_${ts}@test.com`, 'GET /me');
  const mePut = await api('/auth/me', { method: 'PUT', body: JSON.stringify({ bio: 'sweep bio', isPublic: true }) }, ta);
  ok(mePut.status === 200, 'PUT /me bio+public');
  await api('/auth/me', { method: 'PUT', body: JSON.stringify({ isPublic: true }) }, tb);

  // ---- habits ----
  const h1 = await api('/habits', { method: 'POST', body: JSON.stringify({ title: 'Daily run', frequencyType: 'daily', reminderMinutes: [0] }) }, ta);
  const hid = uid(h1.body);
  ok(h1.status === 200 || h1.status === 201, 'habit create daily');
  const hBad = await api('/habits', { method: 'POST', body: JSON.stringify({ title: 'Bad', schedules: [{ time: '99:99', days: [1] }] }) }, ta);
  ok(hBad.status === 400, 'habit bad time 400');
  const hPhoto = await api('/habits', { method: 'POST', body: JSON.stringify({ title: 'Photo proof', verificationType: 'photo' }) }, ta);
  ok(hPhoto.status === 200 || hPhoto.status === 201, 'habit photo type create');
  const hUpd = await api(`/habits/${hid}`, { method: 'PUT', body: JSON.stringify({ description: 'sweep desc' }) }, ta);
  ok(hUpd.status === 200, 'habit update own');
  const hCross = await api(`/habits/${hid}`, { method: 'PUT', body: JSON.stringify({ description: 'hijack' }) }, tb);
  ok(hCross.status === 403 || hCross.status === 404, `habit cross-user edit blocked (${hCross.status})`);

  // ---- logs ----
  const log1 = await api('/logs', { method: 'POST', body: JSON.stringify({ habitId: hid }) }, ta);
  ok(log1.status === 200 || log1.status === 201, 'habit log create');
  const logCross = await api('/logs', { method: 'POST', body: JSON.stringify({ habitId: hid }) }, tb);
  ok(logCross.status === 403 || logCross.status === 404, `habit cross-user log blocked (${logCross.status})`);
  const logId = log1.body && (log1.body.id || (log1.body.log && log1.body.log.id));
  if (logId) {
    const del = await api(`/logs/${logId}`, { method: 'DELETE' }, ta);
    ok(del.status === 200, 'habit log delete');
  } else ok(false, 'habit log delete', 'no id returned');
  await api('/logs', { method: 'POST', body: JSON.stringify({ habitId: hid }) }, ta);

  // ---- habit break/finish ----
  const brk = await api(`/habits/${hid}/break/start`, { method: 'POST', body: JSON.stringify({ reason: 'sweep' }) }, ta);
  ok(brk.status === 200, `break start (${brk.status})`);
  const brkEnd = await api(`/habits/${hid}/break/end`, { method: 'POST', body: JSON.stringify({}) }, ta);
  ok(brkEnd.status === 200, `break end (${brkEnd.status})`);

  // ---- tasks ----
  const t1 = await api('/tasks', { method: 'POST', body: JSON.stringify({ title: 'Sweep task', dueDate: '2026-09-10' }) }, ta);
  const tid = uid(t1.body);
  ok(t1.status === 200 || t1.status === 201, 'task create');
  const tBad = await api('/tasks', { method: 'POST', body: JSON.stringify({ title: 'Bad date', dueDate: 'garbage' }) }, ta);
  ok(tBad.status === 400, `task bad date 400 (${tBad.status})`);
  const tSched = await api('/tasks', { method: 'POST', body: JSON.stringify({ title: 'Timed', scheduledTime: '18:00', scheduledDays: [1, 2, 3], reminderMinutes: [15] }) }, ta);
  ok(tSched.status === 200 || tSched.status === 201, 'task scheduled create');
  const tDone = await api(`/tasks/${tid}/complete`, { method: 'POST', body: JSON.stringify({}) }, ta);
  ok(tDone.status === 200, 'task complete');
  const tUndone = await api(`/tasks/${tid}/uncomplete`, { method: 'DELETE' }, ta);
  ok(tUndone.status === 200, `task uncomplete (${tUndone.status})`);

  // ---- grid + stats ----
  const grid = await api('/grid', {}, ta);
  ok(grid.status === 200, 'grid year');
  const day = await api('/grid/day?date=2026-09-07', {}, ta);
  ok(day.status === 200, 'grid day');
  const ov = await api('/stats/overview', {}, ta);
  ok(ov.status === 200, 'stats overview');
  const st = await api(`/stats/streak?habitId=${hid}`, {}, ta);
  ok(st.status === 200, 'stats streak own');
  const stX = await api(`/stats/streak?habitId=${hid}`, {}, tb);
  ok(stX.status === 404, `stats streak cross-user 404 (${stX.status})`);
  const con = await api('/stats/consistency', {}, ta);
  ok(con.status === 200, 'stats consistency');
  const wk = await api('/stats/weekly?weeks=4', {}, ta);
  ok(wk.status === 200, 'stats weekly');

  // ---- friends ----
  const fr = await api('/friends/request', { method: 'POST', body: JSON.stringify({ userId: (await api('/auth/me', {}, tb)).body.user.id }) }, ta);
  ok(fr.status === 200 || fr.status === 201, `friend request (${fr.status})`);
  const frId = fr.body && (fr.body.id || (fr.body.request && fr.body.request.id));
  const frAcc = await api(`/friends/request/${frId}/accept`, { method: 'POST', body: JSON.stringify({}) }, tb);
  ok(frAcc.status === 200, `friend accept (${frAcc.status})`);
  const feed = await api('/friends/feed', {}, ta);
  ok(feed.status === 200, `activity feed (${feed.status})`);
  const prof = await api(`/friends/profile/${(await api('/auth/me', {}, tb)).body.user.id}`, {}, ta);
  ok(prof.status === 200, `friend profile public (${prof.status})`);

  // ---- challenges ----
  const ch = await api('/challenges', { method: 'POST', body: JSON.stringify({ habitId: hid, opponentId: (await api('/auth/me', {}, tb)).body.user.id, title: 'Sweep battle' }) }, ta);
  const chid = uid(ch.body);
  ok(ch.status === 200 || ch.status === 201, `challenge create (${ch.status})`);
  const chBad = await api('/challenges', { method: 'POST', body: JSON.stringify({ habitId: hid, opponentId: (await api('/auth/me', {}, tb)).body.user.id, endDate: 'garbage' }) }, ta);
  ok(chBad.status === 400, `challenge bad endDate 400 (${chBad.status})`);
  const chAcc = await api(`/challenges/${chid}/accept`, { method: 'POST', body: JSON.stringify({}) }, tb);
  ok(chAcc.status === 200, `challenge accept (${chAcc.status})`);
  const chRes = await api(`/challenges/${chid}/resolve`, { method: 'POST', body: JSON.stringify({ winnerId: (await api('/auth/me', {}, ta)).body.user.id }) }, ta);
  ok(chRes.status === 200, `challenge resolve (${chRes.status})`);
  const lb = await api('/leaderboard/global', {}, ta);
  ok(lb.status === 200, 'leaderboard global');

  // ---- presets ----
  const pr = await api('/presets', { method: 'POST', body: JSON.stringify({ title: 'Sweep preset' }) }, ta);
  const prid = uid(pr.body);
  ok(pr.status === 200 || pr.status === 201, 'preset create');
  const prGet = await api(`/presets/${prid}`, {}, tb);
  ok(prGet.status === 200, 'preset read published');
  const prUpdX = await api(`/presets/${prid}`, { method: 'PUT', body: JSON.stringify({ title: 'hijack' }) }, tb);
  ok(prUpdX.status === 403, `preset cross-user update 403 (${prUpdX.status})`);
  const like = await api(`/presets/${prid}/like`, { method: 'POST', body: JSON.stringify({}) }, tb);
  ok(like.status === 200, `preset like (${like.status})`);
  const fork = await api(`/presets/${prid}/fork`, { method: 'POST', body: JSON.stringify({}) }, tb);
  ok(fork.status === 200 || fork.status === 201, `preset fork (${fork.status})`);
  const pub = await api(`/presets/public/${prid}`, {});
  ok(pub.status === 200, `preset public read (${pub.status})`);
  const rep = await api(`/presets/${prid}/report`, { method: 'POST', body: JSON.stringify({ reason: 'sweep test' }) }, tb);
  ok(rep.status === 200 || rep.status === 201, `preset report (${rep.status})`);
  const prDel = await api(`/presets/${prid}`, { method: 'DELETE' }, ta);
  ok(prDel.status === 200, `preset delete (${prDel.status})`);

  // ---- public ----
  const land = await api('/public/landing', {});
  ok(land.status === 200, 'public landing');

  // ---- vacation ----
  const vac = await api('/vacation/start', { method: 'POST', body: JSON.stringify({ startDate: '2026-09-20', reason: 'sweep' }) }, ta);
  ok(vac.status === 200 || vac.status === 201, `vacation start (${vac.status})`);
  const vacEnd = await api('/vacation/end', { method: 'POST', body: JSON.stringify({}) }, ta);
  ok(vacEnd.status === 200, `vacation end (${vacEnd.status})`);

  // ---- notifications ----
  const nl = await api('/notifications?take=10', {}, ta);
  ok(nl.status === 200, 'notifications list');
  const pf = await api('/notifications/preferences', {}, ta);
  ok(pf.status === 200, 'prefs get');
  const pfBad = await api('/notifications/preferences', { method: 'PUT', body: JSON.stringify({ morningTime: '8am' }) }, ta);
  ok(pfBad.status === 400, `prefs bad time 400 (${pfBad.status})`);
  const pfOk = await api('/notifications/preferences', { method: 'PUT', body: JSON.stringify({ morningTime: '07:30' }) }, ta);
  ok(pfOk.status === 200, 'prefs put time');
  const unsub = await api('/notifications/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: 'https://x/y' }) }, ta);
  ok(unsub.status === 200, `unsubscribe noop (${unsub.status})`);
  const vapid = await api('/notifications/vapid-public-key', {});
  ok(vapid.status === 200, 'vapid key public');

  // ---- upload ----
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const fd = new FormData();
  fd.append('photo', new Blob([png], { type: 'image/png' }), 'sweep.png');
  const up = await api('/upload', { method: 'POST', body: fd }, ta);
  ok(up.status === 200 || up.status === 201, `upload png (${up.status})`);
  if (up.body && (up.body.url || up.body.path)) {
    const fname = String(up.body.url || up.body.path);
    ok(!/\d{13}\.png$/.test(fname) && /^[0-9a-f-]{36}\.png$/.test(fname.split('/').pop()), `uuid filename (${fname.split('/').pop()})`);
  }
  const fd2 = new FormData();
  fd2.append('photo', new Blob(['MZ...'], { type: 'application/octet-stream' }), 'evil.exe');
  const upBad = await api('/upload', { method: 'POST', body: fd2 }, ta);
  ok(upBad.status === 400, `upload exe rejected (${upBad.status})`);

  // ---- password flow (mail skipped without SMTP; assert shapes) ----
  // NOTE: nonexistent address on purpose — asserts the generic shape WITHOUT emitting real mail.
  const fg = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: `nobody_${ts}@test.com` }) }, ta);
  ok(fg.status === 200, 'forgot-password generic ok (no mail sent)');
  const rsBad = await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: 'garbage', password: 'newpass123' }) }, ta);
  ok(rsBad.status === 400, 'reset-password garbage 400');
  const chpw = await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: 'test-test-test', newPassword: 'test-test-test2' }) }, ta);
  ok(chpw.status === 200, 'change-password');

  // ---- cleanup ----
  const d1 = await api('/auth/account', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE_MY_ACCOUNT' }) }, ta);
  const d2 = await api('/auth/account', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE_MY_ACCOUNT' }) }, tb);
  ok(d1.status === 200 && d2.status === 200, 'cleanup accounts');
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
  console.log('CLEANED');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
