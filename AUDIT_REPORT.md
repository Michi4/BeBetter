# BeBetter — Production Readiness Audit Report

**Date:** 2026-09-06, re-audit round 2: 2026-09-10/11 · **Auditor:** automated full-stack audit (static analysis + live probes)
**Scope:** entire app — frontend, backend/API, security, data/DB, infra/deploy, E2E journeys, tests
**Live-test target:** round 1: dev stack (isolated `bebetter_dev_db`) + self-cleaning prod accounts for LLM paths. **Round 2 (this round): production, per explicit approval** — self-cleaning test accounts only, NO mail emitted (suites use nonexistent addresses), paced for rate limits.
**Method rule:** every finding below has file:line, endpoint+response, or command+output evidence. Items that could not be verified are marked as such.

## Phase 0 — Inventory

| Layer | Finding |
|---|---|
| Backend | Node 20 + Express + Prisma ORM (`backend/package.json`: express, @prisma/client, bcryptjs, jsonwebtoken, multer, nodemailer 6.10.1, web-push, uuid) |
| Frontend | Vue 3 + Vite + Pinia + vue-router + Tailwind + lucide-vue-next, axios client (`frontend/src/api/index.js`), DOMPurify+marked for assistant markdown |
| DB | PostgreSQL 18, 26 Prisma models, **no migrations directory** — schema applied via `npx prisma db push` on container boot (`Dockerfile:18`, `Dockerfile.dev` CMD) |
| Routes | 18 backend route files, ~100 endpoints; 23 frontend views (`frontend/src/views/`) |
| Env vars | `JWT_SECRET, DATABASE_URL/POSTGRES_*, B_AI_API_KEY, B_AI_BASE_URL, AI_MODELS, DEMO_USERNAME/PASSWORD, SMTP_HOST/PORT/USER/PASS/FROM, VAPID_* (file), FRONTEND_URL, PORT, NODE_ENV, ADMIN_PASSWORD` (seed only) |
| Third-party | b.ai LLM API (`B_AI_BASE_URL` default `https://api.b.ai/v1`), SMTP (`smtp.world4you.com` default), Web Push (VAPID), Cloudflare DNS (Traefik LE) |
| Deploy | `Dockerfile` (multi-stage: frontend built inside image, `COPY --from=frontend-build /frontend/dist ./public`), `docker-compose.yml` (postgres + backend + Traefik labels), `deploy.sh` (blue-green), prod host Frankfurt `130.61.104.107`, domains `bebetter.websters.at` + `app.bebetter.websters.at` |
| CI | **None** — no `.github/`, no pipeline; `test.sh` (83 curl tests) runs manually against **production** (`BASE="https://bebetter.websters.at/api"`, `test.sh:10`) incl. `docker exec bebetter-db psql … UPDATE "User"` (`test.sh:93`) |
| Docs | `README.md` (stack/layout/features — accurate), no OpenAPI/Swagger spec, `TODO.md` tracks fix rounds |

---

## Phase 2+3 — Backend, API & Security findings

### [CRITICAL] Production JWT secret is the public compose default — universal token forgery
**Where:** `docker-compose.yml:31` fallback; live prod container env
**Evidence:** remote boolean test (never printed the value): `docker exec bebetter-api sh -c 'test "$JWT_SECRET" = "bebetter-jwt-secret-change-me-in-prod" && echo IS-DEFAULT || echo NOT-DEFAULT'` → `IS-DEFAULT`. Frankfurt `.env` line length (49 chars = key + 38-char default, no newline) corroborates the value is the default string. Forgery path: `jwt.sign({sub: <any-user-id>}, 'bebetter-jwt-secret-change-me-in-prod')` → accepted by `authMiddleware` (`backend/src/middleware/auth.js:12-23`). Same secret signs friend-link tokens (`backend/src/routes/friends.js:9`, `backend/src/routes/auth.js:77`) and challenge invites (`backend/src/routes/challenges.js:10`) → forged friendships/challenges too.
**Impact:** anyone who has read the repo knows the secret; full account takeover of any user incl. admin, no password needed.
**Fix:** NEEDS HUMAN DECISION — rotate to `crypto.randomBytes(48)` secret in Frankfurt `.env` + redeploy (logs out all users/sessions once). Also remove code fallbacks (fix loop batch A does the code part).

### [CRITICAL] No migrations — `db push` mutates live schema on every boot, no rollback
**Where:** `Dockerfile:18` (`CMD ["sh", "-c", "npx prisma db push && node src/index.js"]`); `ls backend/prisma/` → `schema.prisma, seed.js` only, `NO-MIGRATIONS-DIR` confirmed
**Evidence:** command output above; `deploy.sh` keeps no snapshot/tag; `docker images` overwrites `bebetter-backend` tag each build.
**Impact:** schema drift or a bad push can drop/alter prod columns with no down-migration; combined with no-rollback deploys, a bad release is unrecoverable except from nightly dump.
**Fix:** NEEDS HUMAN DECISION — baseline `prisma migrate` (dev first). Proposed, not done (schema migration on live DB).

### [CRITICAL] test.sh runs 83 mutating tests against production, incl. direct prod DB writes
**Where:** `test.sh:10` (`BASE="https://bebetter.websters.at/api"`), `test.sh:93` (`docker exec bebetter-db psql … UPDATE "User" …`)
**Evidence:** file contents read; suite was executed vs prod during this audit (83/83 pass, self-cleaning).
**Impact:** test runs create/ban/delete real rows and uploads in the live DB; a failing run mid-suite can leave test users/bans behind; test traffic hits paid LLM + SMTP.
**Fix:** retarget suite at dev via `${BASE:-…}` override (fix loop).

### [CRITICAL] Shallow `/api/health` — broken builds get promoted by blue-green + Traefik
**Where:** `backend/src/index.js:75` (`app.get('/api/health', (_, res) => res.json({ ok: true }))`)
**Evidence:** code read; `deploy.sh` gates promotion on this endpoint + Traefik LB healthcheck `healthcheck.path=/api/health` (`docker-compose.yml` labels). Returns 200 with DB down.
**Impact:** a build that can't reach Postgres passes green `--wait` and receives traffic.
**Fix:** add `SELECT 1` DB check to the handler (fix loop).

### [CRITICAL] No rollback path in deploy
**Where:** `deploy.sh:26-40` (build → green up → rm blue → blue up → rm green → final curl, `exit 1` with no revert); `docker-compose.yml` image `bebetter-backend` (mutable tag)
**Evidence:** script read in full; orphan-green failure mode confirmed by reading `set -euo pipefail` + `up --wait` semantics.
**Impact:** failed final healthcheck leaves only the bad build live; previous image already overwritten.
**Fix:** tag previous image pre-build + `trap` cleanup of orphan green (fix loop).

### [CRITICAL] No CI — nothing gates merges or deploys
**Where:** repo root — `ls .github` → absent; no Jenkinsfile/GitLab CI config
**Evidence:** directory listing + subagent file search.
**Impact:** lint/tests/build never run automatically; breakage found only in prod (as happened with the `signal: req` SSE bug pattern).
**Fix:** add minimal GitHub Actions (lint + `vite build` + `node --check` + test.sh vs dev) (fix loop).

### [HIGH] Unpublished preset drafts readable by any authenticated user (verified live)
**Where:** `backend/src/routes/presets.js:88-100` (`findUnique({where:{id}})` — zero `published`/`author` scoping; `grep published backend/src/routes/presets.js` → no hits); model has `isPublished Boolean @default(false)` (`backend/prisma/schema.prisma:194`)
**Evidence:** live dev probe — user A `POST /api/presets {title:'Secret draft'}` → 201; user B `GET /api/presets/<id>` → **200** with full preset incl. `authorId/authorName` + usage leaderboard.
**Impact:** private/draft presets leak to any logged-in user who learns a UUID (IDs surface in leaderboards/activity).
**Fix:** scope read to `isPublished OR authorId == req.userId` (fix loop).

### [HIGH] Cross-user habit metadata oracle via /stats/streak (verified live)
**Where:** `backend/src/routes/stats.js:184-189` (`habit.findUnique({where:{id:habitId}})` — no `userId` scope; per-route `authMiddleware` present so auth'd only)
**Evidence:** live dev probe — user B `GET /api/stats/streak?habitId=<A's habit>` → **200** `{"bestStreak":0,"currentStreak":0}`. Logs query below is correctly scoped to caller, so leak is limited to `daysPerWeek/frequencyType/bestStreak` + existence.
**Impact:** habit existence + performance metadata enumerable across users.
**Fix:** require ownership (or shared-challenge relation) before returning (fix loop).

### [HIGH] Challenge-opponent can overwrite victim's habit.bestStreak (write primitive)
**Where:** `backend/src/routes/logs.js:294-322` — `DELETE /habit/:habitId` deletes only caller's own logs (`where:{habitId, userId:req.userId}` ✓) but recomputes `bestStreak` from **caller's** logs and writes it to **any** `habitId` via unscoped `habit.update({where:{id:habitId}})` (`logs.js:319`). Reachable because `POST /logs` legitimately lets a challenge opponent log to the shared habit (`logs.js:13-21` owner-or-opponent check).
**Evidence:** code paths read end-to-end (not executed live — would need a challenge fixture; marked partially verified).
**Impact:** opponent sets victim's displayed `bestStreak` to attacker's own value (integrity corruption, leaderboard/battle impact).
**Fix:** only write `bestStreak` when caller owns the habit (fix loop).

### [HIGH] No rate limiting on auth or public routes (verified live)
**Where:** `backend/src/routes/auth.js:39,113,218,256` (register/login/forgot/reset — no limiter; only `/demo` has `checkDemoRateLimit`), `backend/src/routes/public.js`, `presets-public.js`
**Evidence:** live dev probe — 25 rapid `POST /api/auth/login` with bad creds → `{"401":25}`, **zero 429s**.
**Impact:** credential stuffing, account enumeration timing, reset-mail spam, public-endpoint scraping/DB-flood.
**Fix:** per-IP in-memory limiter on auth + public routers (fix loop).

### [HIGH] Unbounded `?weeks=` hangs a request worker (verified live — request never finished)
**Where:** `backend/src/routes/stats.js:307-309` (`parseInt(weeks) || 4`, loop with per-week DB queries, no cap; same pattern `?days=` in consistency)
**Evidence:** live dev probe `GET /api/stats/weekly?weeks=100000` (authed) → **no response within 180s** (client timeout; dev-api stayed healthy). Code loop confirmed.
**Impact:** single authenticated request ties up an event-loop worker indefinitely (DoS, request pile-up).
**Fix:** clamp `weeks ≤ 52`, `days ≤ 366` (fix loop).

### [HIGH] Unbounded notification `ids[]` array (code evidence)
**Where:** `backend/src/routes/notifications.js:41` (`if (ids && Array.isArray(ids)) updateMany({where:{id:{in:ids}}})` — no length/cap)
**Evidence:** code read.
**Impact:** 100k-element array → giant `IN` query, CPU/DB DoS per authenticated call.
**Fix:** cap 200 + UUID-shape check (fix loop).

### [HIGH] Admin list endpoints unbounded (code evidence)
**Where:** `backend/src/routes/admin.js:71` (`user.findMany` + `_count` per user, no `take`), same for `GET /reports`
**Evidence:** code read.
**Impact:** full user table + counts per request; grows into a DoS/slow-admin page.
**Fix:** default `take: 50`, max 200 (fix loop).

### [HIGH] Proof photos enumerable + served without auth (code evidence)
**Where:** `backend/src/routes/upload.js:14` (filename `${req.userId}-${Date.now()}${ext}` — predictable), `backend/src/index.js:54` (`express.static` on `/uploads`, no auth)
**Evidence:** code read.
**Impact:** private verification photos guessable/enumerable by anyone.
**Fix:** uuid filenames (fix loop). Full auth-gated serving deferred (breaks `<img>` Bearer flow — needs signed-URL design; proposed).

### [HIGH] JWT 30-day expiry + seed footguns (code evidence)
**Where:** `backend/src/middleware/auth.js:7` (`expiresIn:'30d'`); `backend/prisma/seed.js:7` (`ADMIN_PASSWORD || 'Michael23'`), `seed.js:23,39` (`password123` demo/test users). Note: seed `upsert update:{role:'admin'}` does NOT overwrite an existing admin password — fresh-DB footgun only.
**Evidence:** code read.
**Impact:** stolen tokens valid 30d; fresh `db:seed` creates guessable admin/demo logins.
**Fix:** seed must throw without `ADMIN_PASSWORD` (fix loop); token lifetime shortening proposed (mobile/PWA UX tradeoff — human call).

### [MEDIUM] Grid date validation missing — 500 on garbage (verified live, safe shape)
**Where:** `backend/src/routes/grid.js:11` (`parseDayKey(from)` throws on arrays/garbage)
**Evidence:** live dev probes (authed): `GET /api/grid?from[]=x` → **500 `{"error":"Server error"}`**; `?from=not-a-date` → same. No leak (generic shape ✓), but unvalidated.
**Impact:** log noise + client can't distinguish bad input; garbage range queries possible.
**Fix:** `YYYY-MM-DD` regex + max span (fix loop).

### [MEDIUM] Broad missing server-side validation (code evidence, per-field)
**Where:** `habits.js:233` (title trim only; wager/reminder/enum unchecked), `tasks.js:81` (`new Date(dueDate)` → Invalid Date 500; POST `scheduledTime`/`scheduledDays` unchecked while PUT validates), `logs.js:86` (proofUrl/date unbounded), `challenges.js:135` (endDate garbage → 500), `friends.js:129` (receiverId existence unchecked → FK 500), `notifications.js:103` (push blobs unbounded), `presets.js:56` + admin announcements `admin.js:235` (no length caps), `vacation.js:28` (reason unbounded, no max duration), `assistant.js:99` (sessionId no UUID check; confirmedActions unbounded array), `auth.js:192` (`isPublic`/bio/avatar unchecked types)
**Evidence:** code reads per route (backend subagent, spot-verified).
**Impact:** 500s on malformed input; oversized payloads (5MB announcement → per-user fan-out); garbage persisted.
**Fix:** shared validators + length caps in fix loop batch (bounded scope: top-traffic routes first).

### [MEDIUM] No transactions on multi-step writes (code evidence)
**Where:** habits create fan-out (`habits.js:230`), friend accept (`friends.js:167`), task complete (`tasks.js:117`), preset fork/use (`presets.js:178`), challenge create (`challenges.js:128`), assistant turn persist (`assistant.js:256`), password-reset consume (`auth.js:271`), admin announcements (`admin.js:235` + per-user sequential push). (Account delete correctly uses `$transaction` — verified `auth.js:313`.)
**Evidence:** code reads.
**Impact:** crash mid-flow leaves partial state (habit without wager, friendship with pending request, reusable reset token).
**Fix:** wrap the 3 highest-risk (reset-consume, friend-accept, task-complete) in `$transaction` (fix loop); rest proposed.

### [MEDIUM] External calls without timeouts (code evidence)
**Where:** `webpush.sendNotification` (`scheduler.js:197`, also challenges/friends/admin fan-out), nodemailer transport (`backend/src/email.js:3` — no connection/greeting/socket timeout)
**Evidence:** code reads. (b.ai call correctly uses `AbortSignal.timeout` — verified `assistant.js`.)
**Impact:** dead push endpoint / hung SMTP stalls scheduler tick and request handlers (forgot-password hangs).
**Fix:** `Promise.race` timeout wrapper for webpush; nodemailer timeout opts (fix loop).

### [MEDIUM] Missing security headers: no CSP, no HSTS, no helmet (verified live)
**Where:** `backend/src/index.js:45-52` sets only XCTO/XFO/Referrer-Policy/Permissions-Policy
**Evidence:** live `GET /api/health` response headers: `permissions-policy, referrer-policy, x-content-type-options, x-frame-options` present; **no `content-security-policy`, no `strict-transport-security`**.
**Impact:** XSS escalation + first-visit SSL-strip unmitigated (mitigated in practice: Traefik terminates TLS; SPA has no inline event handlers; assistant HTML is DOMPurified).
**Fix:** HSTS safe to add (TLS-only site — fix loop). CSP deferred: inline `theme-init.js`/vite chunks need nonce/hash design — test on dev first, proposed.

### [MEDIUM] PasswordReset tokens stored plaintext (code evidence)
**Where:** `backend/src/routes/auth.js:230-234` (`crypto.randomBytes(32)` 256-bit ✓, 1h expiry ✓, generic reply ✓) but `PasswordReset.token` stored raw (`schema.prisma:371-379`)
**Evidence:** code + schema reads.
**Impact:** DB read access yields directly-usable reset links within the hour.
**Fix:** store `sha256(token)`, compare on consume (fix loop; invalidates outstanding tokens once — 1h window, acceptable).

### [MEDIUM] Cookie auth without CSRF token (code evidence)
**Where:** `auth.js:102,131,162` (`httpOnly, Secure only in production, SameSite=Lax, 30d`), `auth.js:12-13` (Bearer OR cookie accepted), no CSRF token anywhere
**Evidence:** code reads. Note: `NODE_ENV` is **never set** in `docker-compose.yml:29`, so the `Secure` flag branch is currently dead in prod (HIGH-adjacent config bug — fixed by adding `NODE_ENV=production`, fix loop).
**Impact:** top-level-GET CSRF surface; cookies leak over HTTP if TLS ever terminates early.
**Fix:** `NODE_ENV=production` in compose (fix loop); SameSite=Strict/CSRF-token design proposed (PWA Bearer-primary already mitigates).

### [MEDIUM] demoGuard gaps on state-changing routes (code evidence)
**Where:** challenge accept/decline/resolve (`challenges.js:271+`), friends accept/decline/delete/link-accept (`friends.js:160+`), habit delete/break/finish (`habits.js:418+`), task complete/delete/uncomplete (`tasks.js:97+`), session rename/delete + logs/notifications/vacation/preset interactions (`assistantSessions.js:58+` and siblings)
**Evidence:** per-route middleware reads.
**Impact:** demo account escapes its sandbox (hourly reset mitigates; demo is public-by-design).
**Fix:** add guards batch (fix loop).

### [LOW] (verified benign / info)
- **Friends public profile has no `authMiddleware`** (`friends.js:290`) — but in-handler privacy enforced: live probe `GET /api/friends/profile/<private-id>` unauthenticated → **403 `{"error":"Profile is private"}`**. Downgraded: keep as hardening (dedupe JWT logic, add rate limit).
- **Bio served raw** (`PUT /api/auth/me` → `GET profile` returns `<script>` verbatim — live probe `bio-served-raw: YES-raw-passthrough`) — standard API behavior; only render sink is `Assistant.vue:86` `v-html` which is DOMPurify-wrapped (verified), all else `{{ }}` escaped. No stored-XSS path.
- **`GET /api/tasks/:bad-uuid` with bad token → 404**: no such route exists (tasks.js has no `GET /:id`); Express JSON-404 fallback. Not an auth bypass.
- **No SQLi/command-injection/SSRF surface**: single parameterized `$queryRaw` (advisory lock int), zero `child_process/eval`, server fetch only to fixed b.ai host — all grep-verified.
- **CORS**: strict allowlist in production branch (`index.js:29-40`); non-prod open is dev-appropriate. **But** dead branch today due to missing `NODE_ENV` (see MEDIUM above).
- **Demo `DEMO_PASSWORD` fallback** (`scheduler.js:45`): demo is intentionally public + hourly-reset — accepted risk, documented.
- **Compose `.env` fallbacks** (`secretpassword` etc.): prod `.env` sets real values for POSTGRES_PASSWORD/B_AI_API_KEY (presence-verified); JWT elegantly excluded — see CRITICAL-1.

---

## Phase 4 — Data & DB findings

### [HIGH] Zero secondary indexes on hot-path tables (verified live via EXPLAIN)
**Where:** `backend/prisma/schema.prisma` — `Habit`, `Task`, `HabitLog`, `TaskLog`, `Notification`, `Activity` have no `@@index` (only pkeys + `ChatMessage[sessionId,createdAt]`)
**Evidence:** dev DB `EXPLAIN SELECT * FROM "Habit" WHERE "userId"=… ORDER BY "active" DESC, "createdAt" DESC` → **Seq Scan**; `pg_indexes` lists only `*_pkey` for Habit/Task/HabitLog/Notification (+ChatMessage composite). Affects habits list, tasks list, year grid ranges, leaderboard group-by, notification polling, activity feed.
**Impact:** full scans on every core view; degrades linearly with user growth.
**Fix:** NEEDS HUMAN DECISION — additive `@@index` + `db push` on live DB (online, non-blocking for reads, but a schema change on prod → approval). Safe to do on dev immediately.

### [HIGH] N+1 fan-outs on list/detail endpoints (code evidence)
**Where:** admin reports enrich (`admin.js:151`), habit-detail buddies (`habits.js:530`), stats streak per-habit full loads (`stats.js:217`, unbounded `findMany` — `stats.js:78`), challenges dual counts (`challenges.js:94`), scheduler per-user/per-slot queries (`scheduler.js:339`), announcement per-user loop (`admin.js:255`)
**Evidence:** code reads (loop + await-per-item patterns).
**Impact:** latency multipliers; scheduler tick cost grows per user (30s cadence).
**Fix:** proposed as follow-up batch (perf refactor, not correctness) — not in first fix loop except cheap `take` caps.

### [MEDIUM] Loose cross-model ids without FK (code/schema evidence)
**Where:** `PresetLike.userId` (no relation at all, `schema.prisma:207`), `Habit.presetId`, `Preset.habitId`, `Challenge.winnerId`, `FriendLink.usedById`, `HabitLog.verifiedBy` (plain Strings)
**Evidence:** schema reads. Delete-account audit: `$transaction` in `auth.js:313` explicitly clears 20 tables; `ChatSession/NotificationPreference/AssistantSettings/PasswordReset/PushSubscription` covered by `onDelete:Cascade` (schema-verified); `HabitTag`/`ChatMessage` cascade via parent ✓. Residual gaps: orphan `PresetLike` rows (dangling userId strings), stale `usedById` pointers, **uploaded proof photos never deleted from `/uploads`** (disk + PII retention).
**Impact:** dangling rows, disk growth, retained PII files post-delete.
**Fix:** DDL part needs migration approval; uploads cleanup on account delete = safe fix (fix loop).

### [MEDIUM] Backup runs but restore never tested
**Where:** infra (not repo): cron `17 3 * * * /usr/local/bin/bebetter-backup.sh`, files `bebetter-2026-09-05-0317.sql`, `bebetter-2026-09-06-0317.sql` present; script uses `pg_dump --clean --if-exists` + 14-day rotation (read in full, no secrets inside)
**Evidence:** `crontab -l` + backup dir listing + script contents (read-only).
**Impact:** retention exists on paper; untested restore = unproven recovery. No pre-deploy snapshot step.
**Fix:** propose restore-to-scratch-container test (non-destructive; needs approval to run on prod host).

### [LOW] Misc data notes (verified)
Unbounded `findMany` without `take` (stats overview, activity); `description ''` vs NULL dual states; `FriendRequest`/`HabitTag` missing `@@unique` (app-level checks only); `Report.targetData.authorEmail` PII retained post-delete (moderation-justified); demo reset leaves chat/prefs rows (hourly, harmless).

---

## Phase 1 — Frontend findings (static audit; no headless browser available → rendering/console/Vitals NOT verifiable, marked below)

### [HIGH] Missing error/empty states mislead users (code evidence)
**Where:** `Profile.vue:7` (blank on failed load), `HabitDetail.vue:396` (empty shell on bad id — note: prior TODO claims not-found pages exist for Challenge/Preset detail; HabitDetail still missing), `Admin.vue:304` (reports failure → false "No reports" empty state — abuse reports missed), `Habits.vue:371` (`catch {}` → false "Nothing logged" day)
**Evidence:** code reads.
**Impact:** users/admins mistake outages for empty data.
**Fix:** fix loop batch (small, safe).

### [HIGH] FriendAccept auto-accepts on mount (code evidence)
**Where:** `FriendAccept.vue:104` (`acceptFriend()` in `onMounted` when logged in); Decline is a plain router-link (`:39`) performing no server action
**Evidence:** code reads.
**Impact:** visiting an invite link instantly creates the friendship; no real decline path; link stays reusable.
**Fix:** NEEDS HUMAN DECISION (behavior change: require explicit Accept click + server-side decline/invalidate). Proposed, not done unilaterally.

### [MEDIUM] Validation-message swallowing + client/server gaps (code evidence)
Dashboard/Habits/Challenge `catch {}` toasts discard `e.response.data.error` (`Dashboard.vue:295` pattern); bio textarea unbounded both sides (`Profile.vue:84`); announcement `maxlength` client-only (`Admin.vue:204` vs `admin.js:235` no check); router catch-all masks 404s (`router/index.js:36`); sitemap↔robots contradiction (`sitemap.xml:9` vs `robots.txt`); challenge-tie copy contradiction (`ChallengeDetail.vue:120` vs `NewChallenge.vue:64`).
**Fix:** show server messages in toasts + add announced caps (fix loop, safe).

### [MEDIUM] Accessibility gaps (code evidence)
Placeholder-only inputs without labels (`ForgotPassword.vue:23` + Admin/Presets/HabitDetail searches), `BeBetterCam.vue:25` + `DayDetail.vue:72` missing alt, Assistant session rows Space-key inoperable (`Assistant.vue:28`), Leaderboard/Admin tabs missing tab semantics, TimeInput 24h-mode unnamed (`TimeInput.vue:31`), AI permission row overflow risk at 320px (`Profile.vue:281`).
**Fix:** labels/alt/roles batch (fix loop, safe). NOT live-verified (no browser) — coded per spec.

### [LOW] PWA/meta nits (code evidence)
`manifest.webmanifest:8` fullscreen+portrait lock; `index.html:33` twitter meta uses `property` not `name`.
**NOT VERIFIABLE here:** console errors, responsive overflow, keyboard flow, contrast ratios, LCP/CLS/INP (no headless browser in this environment — stated explicitly, not guessed).

---

## Phase 5 — Infrastructure findings

### [HIGH] NODE_ENV never set → prod runs dev branches (verified via code + compose)
**Where:** `docker-compose.yml:29` (no `NODE_ENV`), `backend/src/index.js:31` (CORS), cookie `Secure` flag, Prisma prod path
**Evidence:** compose env list vs code branches.
**Impact:** `Secure` cookies off; CORS open fallback; (prod still HTTPS via Traefik, Bearer-primary auth mitigates).
**Fix:** add `NODE_ENV=production` (fix loop; verify login/cookie flow after).

### [HIGH] Containers run as root, no resources/log limits (code evidence)
**Where:** `Dockerfile` (no `USER`), compose (no `mem_limit`/logging)
**Impact:** full container root; noisy-neighbor/disk-fill risk.
**Fix:** propose `USER node` + limits (needs rebuild testing on dev — fix loop if smooth, else propose).

### [HIGH] VAPID keys auto-regenerate + dev shares prod file (code evidence)
**Where:** `backend/src/lib/vapid.js:29` (generates + writes on boot if missing), `docker-compose.yml:38` bind-mounts `./vapid-keys.json`
**Evidence:** code + compose reads. (File is gitignored ✓, not committed ✓.)
**Impact:** deleted/corrupt file silently kills all push subscriptions; dev compose mounts same path pattern (verify dev doesn't point at prod file — dev compose mounts its own dir; local check needed).
**Fix:** fail-closed option + separate dev keys file (fix loop, safe).

### [MEDIUM] Dev/prod drift: compose namespaces, traefik labels, SMTP/ADMIN not in prod env (code evidence)
`DEV_*` vs prod var names; dev traefik labels (`websecure/myresolver/crowdsec/authelia`) vs prod (`https/letsencrypt`); `SMTP_*`/`ADMIN_PASSWORD` read by code but absent from prod compose env (rely on `.env` — SMTP ok since `.env` lacks SMTP_PASS → **mail flow likely broken in prod**: `forgot-password` would hang (no SMTP timeout — see MEDIUM above) or fail. Verify: `.env` has no `SMTP_PASS` (confirmed absent above) → reset-mail flow is down or hanging.worth a live safe check: time a forgot-password POST on prod? That SENDS mail — avoid prod. Test on dev after adding timeouts.)
**Fix:** wire SMTP vars + timeouts, test mail on dev (fix loop); document drift.

### [MEDIUM] No monitoring/alerting in repo; `npm install` (not `ci`) in Dockerfile (code evidence)
Only health signals are Docker/Traefik checks; uptime-kuma exists on infra but app registration is out-of-repo (unverified). `Dockerfile:4` frontend `npm install` → slower/non-reproducible rebuilds.
**Fix:** propose kuma check + `npm ci` (safe, fix loop for `npm ci`).

---

## Phase 6 — E2E journeys (dev stack, live)
- **Assistant full loop** (register → enable → stream create → confirm → task exists → sessions list/get/rename/delete → cleanup): **21/21 pass** (`/tmp` probe, this audit).
- **Core loop** (register → habit+task create → log → complete → notifications/vacation reads): covered by existing 83-suite shape; **will re-run retargeted at dev in Phase 7**.
- **Password-reset journey**: NOT walked (SMTP unwired — see MEDIUM above; will test on dev post-fix).
- **Friend/challenge journey**: partially verified via code (auto-accept concern above); full walkthrough deferred to fix-loop verification.

## Phase 7 — Tests
- Existing suite: 83 curl tests, 83/83 pass vs prod (run during audit). Gaps: no unit tests, no integration tests, no E2E framework; assistant 21-probe is throwaway (`/tmp`, not committed);_suite hardcoded to prod (fix loop retargets to dev + commits the assistant probe as `test-assistant.sh`).

---

## Fix log
*(appended per batch — command + re-test result)*

### Batch 1 — AuthZ (dev-verified 2026-09-06)
- `presets.js:103,280`: unpublished presets now 404 for non-authors (defense-in-depth; create route publishes by default so no live behavior change — severity of the disclosure finding revised to MEDIUM).
- `stats.js:184`: streak requires habit ownership or active-challenge opponent status. Live re-probe: cross-user `GET /stats/streak` → 404 (was 200).
- `logs.js:319`: `bestStreak` rewrite only when caller owns the habit.
- Re-test: 83-suite vs dev 83/83 (via socket-mounted runner, see Phase 7 note).

### Batch 2 — DoS/validation (dev-verified)
- New `backend/src/middleware/rateLimit.js` (XFF-aware sliding window, namespaced buckets): per-endpoint limits on register(5)/login(15)/forgot(3)/reset(5) per min; `publicLimiter`(60) on `/public/*` + `/presets/public/*`. Live: 15 rapid logins → 10×401 + 5×429 (was 25×401, 0×429). Caught own bug: shared bucket across limiters + missing import crashed dev-api once; fixed + namespaced.
- `stats.js`: `weeks` clamped 1–52, `days` 1–366. Live: `?weeks=100000` → 200 in 666ms (was >180s hang).
- `notifications.js`: `ids[]` capped at 200 + string-shape check. `admin.js`: users + reports `take:100`. `upload.js`: uuid filenames (enumeration killed). `grid.js`: `YYYY-MM-DD` regex + 400-day span → 400s (were 500s).

### Batch 3 — auth hardening (dev-verified)
- `middleware/auth.js`: boot throws without `JWT_SECRET` (no more silent fallback). Friend/challenge invite secrets derived via `sha256(domain + JWT_SECRET)` — single secret source. NOTE: outstanding invite links signed with the old raw-secret scheme are invalidated (regenerable).
- `auth.js` reset flow: tokens stored as sha256, consume wrapped in `$transaction` (atomic password+invalidate).
- `seed.js`: throws without `ADMIN_PASSWORD`.
- demoGuard added: challenge accept/decline/resolve + invite-accept, friend accept/decline/delete, habit delete, task delete. (Logging/completing/breaks/vacation left open — core demo play, hourly reset.)
- Re-test: 83/83 + assistant 19/19 on dev.

### Batch 4 — infra/config (dev-verified where applicable)
- `index.js`: `/api/health` now checks DB (`SELECT 1`, 503 when down); HSTS header added (live-verified on dev).
- `email.js`: SMTP timeouts (10/10/15s). `scheduler.js`: 10s push timeout wrapper.
- `auth.js` account delete: proof photos + avatar unlinked from `/uploads` post-commit (basename + charset guard).
- `docker-compose.yml`: `NODE_ENV=production` (activates Secure cookies + strict CORS). `test.sh`: `BASE` overridable. `Dockerfile`: `npm ci`. `deploy.sh`: pre-build rollback tag + orphan-green trap. New `.github/workflows/ci.yml` (backend checks + frontend build). Dev VAPID separated (`vapid-keys.dev.json`, committed dev-only keys).
- Re-test: 83/83 + 19/19 on dev; `vite build` green (caught + fixed two template errors of my own: HabitDetail nested template, Profile v-else ordering).

### Batch 5 — frontend states/a11y/meta (build-verified; no browser available)
- Profile/HabitDetail not-found states with back/retry; Admin reports + Habits day failures toast instead of false-empty; Dashboard create surfaces server message.
- ForgotPassword label, cam/lightbox alt, Assistant Space-key, TimeInput aria-label; sitemap trimmed to public pages; twitter `name=` fix.

### Phase 7 note (dev runner)
`test.sh` hardcodes prod BASE + uses host `docker exec`. Dev runs use `/tmp` copy with `BASE=http://bebetter-dev-api:3000/api`, dev-DB exec, inside a runner container with docker socket mounted. First dev run showed 6 admin FAILs — runner artifact (no docker CLI in container), not app bugs. Committed `test-assistant.js` (19 checks, `BASE`-overridable) closes the E2E-coverage gap for the assistant.

### Approved follow-ups (user-approved 2026-09-06, all verified)
- **JWT rotation (CRITICAL-1 CLOSED):** Frankfurt `.env` backed up (`.env.bak-20260906`, host-only), `JWT_SECRET` replaced with fresh 96-hex-char random (format-verified, value never printed). Full redeploy. Live proof: token forged with the old public default → **401 REJECTED** (was: would have been accepted). All users/sessions logged out once, as announced. Friend/challenge invite links signed under the old derived scheme invalidated (regenerable).
- **Prod indexes (HIGH CLOSED):** 19 `@@index` added (Habit/Task/HabitLog/TaskLog/Notification/Activity/User/etc.), `prisma validate` + `format` clean, pushed to dev (`db push` in sync), `pg_indexes` confirms (`Habit_userId_idx`, …). Prod `db push` via deploy created 22 custom indexes (verified count). EXPLAIN on small tables still seq-scans (correct plan at 39 rows).
- **FriendAccept explicit-accept (HIGH CLOSED):** auto-accept on mount removed; new `POST /friends/link/decline` invalidates the link server-side; Decline button calls it. Live dev probe: decline → 200, accept-after-decline → 400. `vite build` green.
- **Backup restore (MEDIUM CLOSED):** latest dump restored into scratch `postgres:18-alpine` on prod host → exit 0, row counts sane (24 users / 16 habits / 48 tasks / 728 logs). Scratch destroyed. Recovery proven.
- **Pre-deploy snapshot:** `deploy.sh` now pg_dumps live DB to `backups/pre-deploy-<ts>.sql` (keeps 5) before building. File-only change, `bash -n` clean, synced to prod host (takes effect next deploy).
- **Prod post-deploy verification:** 83/83 suite (run on Frankfurt), 19/19 assistant E2E (prod), new bundle `index-C6NTwqzg.js` live on both domains, forged-token rejection confirmed.

### Notification round (user-reported: "settings do not apply" — root-caused + fixed, 2026-09-07)
- **Missing prefs row (ROOT CAUSE, proven live):** scheduler only visits users WITH a `NotificationPreference` row; rows were created lazily on first settings open. Probe: fresh user + imminent habit → 0 notifications in 200s; after `GET /preferences` → "Now: Habit B" delivered. Dev: 41/55 users had no row; **prod backfill: 22/27 users had no row**. Fix: row created at register (`auth.js`) + idempotent backfill script (`test/backfill-prefs.js`, run on dev + prod).
- **Prod clock was UTC (ROOT CAUSE #2, proven):** `docker exec bebetter-api date` → UTC despite `TZ=Europe/Vienna` — `tzdata` missing from `node:20-alpine`. All reminders/digests fired 1–2h off wall-clock. Fix: `apk add tzdata` in `Dockerfile` + `Dockerfile.dev`; prod now reports CEST.
- **Digest emoji escapes removed** (`\u{1F305}`, `\u{1F319}` in scheduler digests) + leaderboard medals → `#1/#2/#3`.
- **Push subscribe validated** (https-only, length caps); push path live-tested (malformed sub fails in 82ms, 10s timeout wrapper covers dead endpoints).
- **Full password-reset mail E2E on dev** (fake SMTP catcher, `test/mail-catcher.py`): forgot → mail with token link → reset → 200, reuse → 400, DB holds sha256 + `used=t`.
- **SMTP send path hardened:** timeouts + `secure` auto-select for port 465. Prod `.env` still lacks `SMTP_*` → mail silently skipped (needs human creds — see verdict item 1).
- **Full 60-check sweep** (`test-e2e-full.js`, committed): habits/logs/breaks/tasks/grid/stats/friends/challenges/presets/public/vacation/notifications/upload/password-flow — 60/60 dev, 60/60 prod. Found + fixed along the way: task `dueDate` garbage → 500 (now 400, POST+PUT), challenge `endDate` garbage → 500 (now 400).
- **Challenge decline verified** (200 + resolve-after-decline semantics intact).

### Feature batch (user requests, 2026-09-08/09 — all live + verified)
- **Task recurring reminders:** Repeat selector (Once/Daily/Weekly+days) in task creation; `isEveryday`/`scheduledDays` forwarded by Dashboard+Habits handlers (was dropped); standard at-time `[0]` default when a time is set (create + PUT, tasks + habits); scheduler already fires per occurrence.
- **Every-N-days habits:** `Habit.intervalDays` (2–365) + shared `lib/recurrence.js` (anchor=creation day); wired into scheduler reminders + `isHabitDueToday`, `logs/with-scheduled`, grid counts, stats streaks (interval-aware walk-back), `lib/streak.js` predicate (legacy behavior preserved for weekday habits); RecurrenceBuilder presets (2/3/7 days + custom N) + edit flows; assistant `habits_create` supports it. Streak semantics: consecutive due dates.
- **Grid since signup + autoscroll:** `ContributionGrid` `startDate` prop (pre-account days blank) + auto-scroll to today on Dashboard/Profile grids.
- **History month-grid:** Habits history prev/next+date-input replaced by tappable month grid (completion colors) + Today jump; per-day list + undo kept.
- **Assistant past/multi/advanced:** new `history_query` tool (93-day span, capped), `tasks_create` full surface (repeat/reminders), loop 3→6 steps, prompt (batch creates per turn, history-first for past-Q, scheduling knowledge). Verified live: past-Q answers with dates, 3 creates in one turn, interval creation.
- **Assistant input docked** to screen bottom (theme-aware bar).
- **Task drag-sort:** `Task.position` + `POST /tasks/reorder` (ownership-checked, atomic) + GripVertical handle (desktop DnD) + mobile up/down buttons + keyboard arrows.
- **Owner-write hardening:** opponent logging/unlogging no longer rewrites shared habit `bestStreak` (POST + both DELETE paths).
- **Suites:** 83/83 + 60/60 (`test-e2e-full.js` committed) + 19/19 (`test-assistant.js`) + adv probes (`test-assistant-adv.js`: DE/EN/FR/ES, past, multi) — all green on dev AND prod.

## Scorecard

| Phase | Status | Notes |
|---|---|---|
| 0 Recon | ✅ Clean | Full inventory above |
| 1 Frontend | ⚠️ Conditional | Static fixes done + build green; **rendering/console/a11y/Vitals unverified — no headless browser in this env** |
| 2 Backend/API | ✅ Clean* | AuthZ/validation/DoS fixed + live-verified; *residual: per-field type depth, 4 non-atomic writes, unbounded assistant array |
| 3 Security | ✅ Clean* | CRITICAL forgery closed+verified; *residual deferred w/ rationale: nodemailer major, CSP, 30d TTL + 6-char policy (product calls), auth-gated uploads (design) |
| 4 Data/DB | ✅ Clean* | Indexes + restore proven; *residual: FK DDL + N+1 refactors (need migration decision / perf batch) |
| 5 Infra | ✅ Clean* | Health checks DB, rollback tag+trap+snapshot, CI added, NODE_ENV, VAPID split; *residual: USER root, limits, monitoring registration, **SMTP unwired (reset-mail silently skipped in prod — needs real creds)** |
| 6 Journeys | ⚠️ Conditional | Assistant + core + FriendAccept verified live; **reset-mail journey blocked on SMTP creds** |
| 7 Tests | ✅ Clean* | 83/83 prod+dev, 19/19 prod+dev, assistant E2E committed; *residual: no unit tests |

### Verdict: **CONDITIONAL GO**
Ship the current state — all CRITICALs are closed and verified, HIGHs fixed or decided. Remaining blockers/conditions:
1. **SMTP credentials** ✅ RESOLVED 2026-09-10 — user added purelymail creds to Frankfurt `.env`; `docker-compose.yml` now passes `SMTP_*` through to the backend (it previously didn't, so `.env`-only would never have worked); live test mail to office@websters.at accepted by smtp.purelymail.com:587 (messageId returned). Full reset flow proven earlier on dev via fake SMTP.
2. **Browser verification** — run through key pages once with devtools open (console, mobile widths, keyboard) — could not be done from here.
3. **Users must re-login** — expected fallout of the JWT rotation; consider an announcement.
4. **Accepted tech debt** (tracked above): prisma-migrate baseline decision, nodemailer major, CSP, N+1 batch, 30d/6-char policy, USER root + limits, monitoring registration.

## Round 2 re-audit (2026-09-10/11, prod target per approval)

Five parallel static passes (all prior fixes re-verified — RE-VERIFIED lines kept inline above) + live prod probes. New findings fixed in this round:

**Fixed HIGH:**
- `.env.example` documented `SMTP_PASSWORD` (code reads `SMTP_PASS`) + omitted 9 vars → rewrote example as complete source of truth (verified against `process.env` grep).
- `test-assistant-adv.js` hardcoded prod BASE → `process.env.BASE` default (dev-safe like its siblings).
- Compose JWT fallback neutered the fail-closed boot check → both services now use `${JWT_SECRET:?...}` (compose refuses to boot without it).
- `test.sh` retargeting still wrote prod DB → `DB_CONTAINER/DB_USER/DB_NAME` parameterized.

**Fixed MEDIUM (backend):** forgot cooldown reply unified to one constant (existence-oracle closed, identical strings verified live); cap accounting fixed (only >24h rows pruned — cap now actually fires); tasks POST validation parity; habits PUT schedules validation + buddy/challenge caps (20); `grid/day` date validation; demoGuard on reorder + link-decline; friend-link DB `expiresAt` on accept + decline (400s verified live); assistant 150s overall deadline; interval due-ness in `/habits/scheduled` + `grid/day` (verified live); uncomplete ownership re-check; forgot email trim.
**Fixed MEDIUM (frontend):** weekly-empty guard, timeless-reminder guard, server messages in 3 generic toasts, month-grid + outer-history failure toasts, dashboard reorder toast, TaskCard edit Repeat controls + payload forwarding, aria-pressed/labels, ForgotPassword honest copy + timer cleanup, startDate validation, interval input error, Daily badge, grip simplification, dead `shiftDay` removed, BeBetterCam alts, twitter:image, bio maxlength 500 (UI + API).
**Fixed LOW/infra:** CI full deps; FRONTEND_URL both composes; deploy aborts on snapshot failure; seed stops printing ADMIN_PASSWORD; Dockerfile.dev `npm ci`; dev SMTP example; backups/ gitignored; history true counts; reorder dedupe; `@@index([userId, position])`.
**npm audit (runs now):** `npm audit fix` → qs high→moderate (lockfile committed, suites green). Remaining with usage analysis: deepmerge-ts chain (Prisma-gated), nodemailer (major deferred; none of the CVE vectors in our usage), qs/express moderate residual.
**Live prod verification this round:** 83/83 + 60/60 + 19/19 + adv multilingual + uniformity/cooldown/validation/reorder/interval/expiry probes (self-cleaning, zero mail). Headers re-checked (HSTS ✓, CSP absent by design).

**Deliberately residual:** per-row JS recurrence (unindexable by nature), XFF-vs-limits (edge-set at Traefik), concurrent reset double-send (bounded by working cap), `===` HMAC compare (theoretical), VAPID fail-open, nodemailer major, CSP, 30d/6-char policy, USER root, monitoring, migrate baseline, N+1 batch.
