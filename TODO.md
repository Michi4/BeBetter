# BeBetter Polish & Fixes

Status tracker for the full audit + feedback pass (Michi & Jonas).

- [x] Logo redesign — original 5x5 grid logo kept (user: keep original!), tile fill `color-mix(in srgb, var(--bb-bg) 85%, transparent)`, no animation
- [x] Regenerate PWA icons (192/512/maskable/apple/favicon) + OG/share images
- [x] Theme init bug — toggle reflects actual theme on first load
- [x] Landing navbar vertical centering (logo/text, Sign In)
- [x] Marquee empty-right bug (4 groups + translateX(-50%))
- [x] Overscroll — glow/blurb visible past footer
- [x] Shadows too strong — subtle everywhere
- [x] Sign Up CTA consistency (label + arrow variants)
- [x] Logo/text matches navbar bg in light mode
- [x] Demo click → route to dashboard reliably (not stranded on login)
- [x] Input outline flash on focus (focus-visible only)
- [x] Notifications jump / alerts bottom margin
- [x] Delete account modal + popups: padding/safe-bottom
- [x] Hidden-but-clickable buttons (completed-row delete)
- [x] Modal opening with no content (DayDetail guard)
- [x] Habits history section redesign (day listing, status, empty state, undo)
- [x] Padding issues across views
- [x] Emoji picker/search for habit creation + edit (EmojiPicker.vue in CreateModal + HabitForm)
- [x] Time format — 24h everywhere; localStorage sanitized (only '12h'|'24h' accepted, garbage → 24h), SW cache bumped bebetter-v3
- [x] TimeInput 12h mode — AM/PM select produced "NaN:00" (Number('pm')); rewritten via to24h(); 12h selects now render even when empty (default 8:00)
- [x] DayDetail — task logs render as uncompleted (no completed field on taskLogs); always check emerald now
- [x] ContributionGrid — tasks-only days clickable + dim green tint; month labels anchored to week of month's 1st (no more wrong/missing labels)
- [x] Dashboard — grid day accepts task-only days; endVacation refreshes grid; delete-confirm modal light-theme bg (bg-gray-900/95)
- [x] TaskCard — long-press double-fire (tap suppressed after long-press), safe touches fallback
- [x] Game grid backend — /grid/day scheduledHabits include title/emoji (blank habit rows in day popup)
- [x] Profile — contribution grid gated to own profile (other users would see wrong grid); reload on route param change; profile switches reset grid
- [x] NewChallenge — ?user= prefetch resolves from /friends list instead of searching by UUID
- [x] ChallengeDetail — logTap was a no-op (arrow returned fn instead of calling); pending self-challenges controllable by creator
- [x] Backend challenges — habit select includes description/frequencyType/verificationType (photo camera icon + description now show); self-challenge POST guarded
- [x] Presets — cards showed 0 likes/forks (used likes/forks instead of likesCount/forksCount); createPreset sends verificationType
- [x] HabitDetail edit — editForm was `reactive` const assigned by HabitForm v-model → "Assignment to constant variable"; now ref; wagers saved via PUT (backend replaces wagers)
- [x] Habits — task create/edit sends scheduledTime/scheduledDays/reminderMinutes (previously dropped)
- [x] Backend /logs/with-scheduled — multi-slot habits expanded per timed slot (history day view shows real times)
- [x] Stats — activeStreak zeroed when last completion ≥2 days ago (stale "current" streak)
- [x] Toast jump — top toast was pushed down when a 2nd toast arrived (newestOnTop), and toasts overlapped the sticky nav; new toasts stack below, container offset clears nav, slide-in reduced -20px → -6px
- [x] NotificationAlerts — 10px drop-in animation removed (pure fade), fixed 8px gap below top nav (both breakpoints, was overlapping nav border on mobile)
- [x] Dead padding below every page — App.vue always rendered a `pb-24` wrapper div (96px of empty space) even without the push prompt; padding now lives inside PushPrompt only when visible
- [x] Slot edge case — habit with a timed schedule on other days vanished from today's list entirely (Dashboard + Habits); days without a matching timed slot now fall back to an untimed entry
- [x] History grouping — scheduled habits without a time disappeared from the day view when any timed habit existed (scheduledGroups dropped the untimed bucket); now shown as an "Any time"-style group after timed groups
- [x] History selectedDate — initialized with UTC toISOString (showed yesterday after 22:00 local); now local date
- [x] TimeInput 12h empty state — selects rendered with fabricated "8:00 AM" before the user ever picked a time; now a dashed "Anytime" button that reveals the selects on click (to24h() NaN bug fixed earlier)
- [x] Final build/lint verification

## Round 2 sweep (fresh audit)

- [x] LandingNavbar responsive break — scoped `.nav-link/.nav-btn { display: inline-flex }` overrode Tailwind `hidden sm:block`/`sm:hidden` (higher specificity): Sign In was visible on mobile, hamburger visible+dead on desktop, drawer links lost block layout. Display utilities removed from scoped CSS, `inline-flex` added where needed; drawer now closes on Escape + has aria-labelledby
- [x] SignUpPrompt backdrop — `@click.self` on the modal container never fired (overlay child covers it), tapping the dark backdrop couldn't dismiss; handler moved to the overlay
- [x] Landing footer "Showcase" link — pointed at `#showcase` which didn't exist (click was a no-op); id added to the year-grid section
- [x] Password-show/hide buttons — icon-only, no accessible name; aria-label + aria-pressed added (Login, Register, ResetPassword)
- [x] Login — missing autocomplete attrs (username / current-password); added for password managers
- [x] ResetPassword — 2s redirect timer never cancelled (stale redirect after unmount); cleared in onBeforeUnmount
- [x] FriendAccept — unused useRouter/router dead code removed
- [x] FeaturePillar — hardcoded text-white/text-gray-300 invisible in light theme; now theme tokens (unused component, latent fix)
- [x] ChallengeInvite — back button aria-label

## Round 3 sweep (core app audit)

- [x] Task edit cleared fields — `dueDate: x || undefined` never cleared (backend skips undefined, old value stayed); now `?? null` (Dashboard + Habits) — backend PUT already mapped ''/null to a real NULL
- [x] Habit reactivation — undoCompletedHabit deleted today's log FIRST; finished habits have no log today → 404 blocked reactivation forever; now reactivate first, swallow 404 on log delete
- [x] Preset import — read nonexistent `h.recurrence` (backend returns `schedules`); now maps schedules → recurrence shape; times now imported too
- [x] Preset schedules — RecurrenceBuilder times were silently dropped: frontend never sent them top-level, backend POST/PUT ignored them, and /use + /fork only created daily habits from frequencyType/daysPerWeek. Added `schedules Json?` column to Preset (db push auto-applies in container), end-to-end pass-through (POST/PUT/use/fork), frontend sends `schedules`
- [x] Friend request state — Profile "Add Friend" reverted after reload/duplicate request (backend /friends/profile never returned requestSent); now computed server-side (pending request from viewer → target)
- [x] Invalid HTML — "Clear all" button nested inside the collapsible header button (Completed Tasks/Habits); headers split into valid sibling buttons (toggle + clear all + chevron)
- [x] Challenge log with timed habit — logged without scheduledTime → duplicate null-slot log; now passes today's slot (backend /challenges/:id now includes habit.schedules)
- [x] Stale-response races — Leaderboard tab switches and Dashboard year navigation could resolve out of order; token guards added
- [x] BeBetterCam — OverconstrainedError retried forever (infinite facing-mode ping-pong); single retry then user error + manual retry resets
- [x] TimeInput 12h — minute select showed "00" for stored times off the 5-min grid (e.g. :37); literal option added
- [x] ContributionGrid keyboard a11y — interactive cells focusable (tabindex/role/aria-label/Enter/Space select)
- [x] A11y labels — icon-only buttons named across TaskCard, CreateModal, DayDetail, HabitDetail, ChallengeDetail, BeBetterCam (close/flash/shutter/switch), Admin (delete/ban/unban), year nav (Dashboard/Profile); Profile notification toggles are now role=switch + aria-checked + shrink-0
- [x] Friends invite — "Generating link..." placeholder was copyable; copy/input disabled until the token arrives
- [x] Final build/lint verification — deployed index-iznPhAzZ.js, prod 200 + health OK

## Round 4 sweep (make it perfect — tasks/recurrence, notifications, stats)

- [x] One-time tasks never ended — completing a task only logged it; the task stayed active and reappeared "due" every single day (user: "recurring tasks that shouldn't recur", "task checking doesn't work"). `POST /tasks/:id/complete` now deactivates tasks without recurring day selection (scheduledDays/isEveryday); `DELETE /tasks/:id/uncomplete` reactivates them
- [x] Habits.vue Completed Tasks section — rebuilt from GET /tasks only; deactivated one-time tasks vanished on reload. Now merges today's `/tasks/completed` logs (dedup by id, sorted by completedAt) so today's completions survive reloads
- [x] GET /tasks cleanup — `isCompletedToday` computed via a redundant ternary over the same log array; single path now
- [x] Reminder dedup ignored the reminder offset — a "15 min before" reminder for a slot suppressed the slot's "Now" reminder (both store the same slot time; arbitrary-row findFirst); dedup now scans all of today's rows and compares time + offset
- [x] Minute-drift skipped reminders — scheduler ticked every 60s with strict HH:MM equality, so slots/digest times were frequently skipped entirely or the digest double-fired on aligned ticks; now ticks every 30s and fires within a 90s window
- [x] Morning/evening digests had no dedup (double push) and counted wrong — evening compared all today's logs (any habit) against ALL active habits (incl. not-scheduled-today, on-break, or done-anyway habits); now counts only habits due today (frequency/daysPerWeek/schedules) minus active breaks, unique habit completions, and dedups via one notification row per day
- [x] Scheduled reminders ignored habit breaks — on-break habits kept getting reminders; breaks filter added (ongoing or endDate >= today)
- [x] One-time task reminders said "this once" but reminded every day — tasks without recurring days and without dueDate now only remind on the day they were created
- [x] Stats overview streak was fake — it counted consecutive days with ANY habit completion across all habits (alternating two habits = padded streak). Now the max per-habit current streak (schedule-aware day counting, 2-day broken-gap rule)
- [x] Stats overview consistency was misleading — totalLogs/(days × activeHabits) tanked multi-habit users (all-habits-daily scored ~33%). Now unique days with ≥1 completion ÷ days since first log, vacation days subtracted (matches /stats/consistency semantics)
- [x] Round-4 verification — dev API tests: one-time complete/uncomplete lifecycle, recurring remains active on its days, weekend task not-due flags, per-habit streak 3→2 on gap, consistency 100, offset-0 fires despite offset-15, no duplicates across repeated scheduler runs, digests deduped

## Round 4.1 polish (crash & parity)

- [x] Scheduler crash — eveningReminder referenced undefined `dayOfWeek` (ReferenceError every 30s tick); added `today.getDay()` + fixed `completedAt: today` exact-midnight miss → range `gte/lt`
- [x] Scheduler banned check — `bannedUntil` truthy permanently blocked expired bans; now `bannedUntil > now` in all three tick loops
- [x] Breaks ended today at 00:00 considered expired at 00:01; `activeBreakFilter` now normalizes to start-of-day
- [x] Digest/already windows missed last second of day (`23:59:59`); now `gte start lt nextDay`
- [x] Demo daysPerWeek `[1..7]` includes invalid 7, Sunday never due; now `[0..6]`
- [x] Habits default `[1..7]` incl. 7; now `[0..6]` + timed-break `find(!endDate)` now `>= dayStart`
- [x] Auth demo guard hang — missing `.catch(next)` swallowed DB errors; fixed + `scheduledTime: null` bypass via `field in req.body`
- [x] Frontend parity — Habits incompleteTasks now filters `isDueToday !== false` (was showing tomorrow's tasks), HabitCard aria-label/pressed, ContributionGrid role=grid, TimeInput aria-labels

## Round 6 (final polish & fix pass — "make it perfect")

### Critical
- [x] Habits TDZ crash — `const todayStr = () => {}` used before declaration in setup → `ReferenceError: can't access lexical declaration 'q'` at mount (blocked /habits for all users). Converted to hoisted `function todayStr()`.
- [x] Notifications "dismissed came back" — demo account reset wiped notifications hourly, then scheduler re-fired reminders (demo now skipped in all 3 reminder jobs). Also: dismiss failures were silently swallowed (item stayed unread in DB, returned next poll → now toasts on error).
- [x] Data restored — old `home` production DB (had all real users: michi, sophie, Jonas, alex, tapbug5111) was dumped and restored to Frankfurt (the current prod had a fresh/empty DB). Nightly backups now running (03:17, 14-day retention).

### Features
- [x] DayDetail undo buttons — clicking a past day on the grid shows undo for each habit/task completion (wiring to existing DELETE /logs/:id and DELETE /tasks/:id/uncomplete?date=). Modal closes when last item undone.
- [x] "Dismiss all" button in the inline notification alerts.
- [x] Dismiss-all endpoint verified: `POST /notifications/read` (no body) marks all read.

### Light mode
- [x] Global `html.light .text-white { color: #111827 !important; }` removed — was rendering 30+ `bg-emerald-600 text-white` buttons dark-on-dark (white text on colored buttons is correct in both themes).
- [x] Added missing light-mode overrides: `text-amber-300`, `hover:text-amber-300`, `hover:text-emerald-100`, `hover:text-red-300`, `text-purple-400`, opacity variants.

### Polish (empty/loading/error states)
- [x] Loading spinners added to: Profile, HabitDetail, Friends, PresetDetail, Notifications, NewChallenge
- [x] Not-found pages: ChallengeDetail, PresetDetail (instead of blank page/back-redirect)
- [x] Empty states: Dashboard onboarding (new user), Profile other-user activity, HabitDetail challenges, Landing stats unavailable
- [x] Error toasts replacing 15+ silent `catch {}` across: Notifications, NewChallenge, Leaderboard, Friends, HabitDetail, Presets, Profile grid, Friends invite-link
- [x] Overflow truncation on long usernames: ChallengeDetail, Profile
- [x] DayDetail modal closes when last item undone (instead of showing stale content)

### Verification
- [x] Full sandboxed test suite run against prod: **83/83 passed** (registration, auth, habits, tasks, logs, stats, grid, friends, challenges, presets, admin, notifications, uploads, passwords, edge cases)
- [x] All 34 frontend chunks serve 200, vendor chunks match imports
- [x] 0 TDZ matches in deployed Habits chunk
- [x] Critical flows verified: habit→log→undo, task→complete→uncomplete, dismiss-all→unread=0, grid+stats, preset like, leaderboard, friend link, invitation, password reset, ban/unban, admin authz, private profile, forgot password, change password

## Round 5 sweep (full-codebase final audit)

### Backend
- [x] Grid scheduled counts per slot (multi-slot habit = 2 not 1) — no more 200% days; grid/day respects timed breaks; grid/years includes task logs (task-only users got wrong range)
- [x] Habit detail authz — any authenticated user could fetch any habit by UUID (title/logs/buddies leaked); now owner or active challenge opponent only (pending challenge → 404 until accept)
- [x] Atomic account deletion — ~20 sequential deletes wrapped in one transaction (crash mid-way left half-deleted account)
- [x] Atomic preset like toggle — check-then-create race could 500 on unique constraint; transaction + live counter read
- [x] Friendship upsert on link accept + register-with-invite auto-friendship (was dead code: looked up the hex token column but clients pass the signed JWT; now verifies JWT, resolves by linkId, upserts)
- [x] Challenges GET filters self-placeholder pending invites (invite-link created creatorId=opponentId rows that cluttered the list); friends leaderboard N+1 → single query
- [x] Streak dedupe same-day logs (multi-slot habits inflated streaks); validation for task PUT scheduledDays/scheduledTime, habit schedule days (0-6)/times (HH:MM), notification times, vacation date order
- [x] Admin self-demote guard; announcements exclude demo/test users; demo reset cleans presetLike/Usage/report
- [x] Timed-break semantics everywhere (`endDate > now`), including challenge-opponent log path (opponents may log while owner's habit on break)

### Frontend
- [x] Session safety — offline navigation no longer wipes stored login (only explicit 401); demo login no longer logs out the current user first; legal pages (privacy/terms/imprint) accessible while logged in (were guest-only → bounced to /dashboard)
- [x] Profile avatar upload crashed (`uploadingAvatar` undeclared); grid stale-response guard + only loads for own profile
- [x] useTheme media-query listener torn down by any consumer's unmount (system theme following died after visiting some pages) — ref-counted now
- [x] Habits history: multi-slot habits showed every slot "Done" when one slot logged; loadHistory stale-response guard
- [x] Dashboard: nowHabits included completed tasks; task creation didn't refresh stats/grid; delete-modal Escape handler
- [x] NewChallenge date `:min` used UTC (off-by-one in -ve timezones); Admin searchUsers was fired on mount (empty query every load) — now lazy on tab switch
- [x] api 401 redirect preserves `?redirect=`; PresetDetail navigator.share `.catch`; 12h time format always shows minutes
- [x] Modal a11y — role/aria-modal + Escape across Dashboard/Habits/Admin/HabitDetail/PresetDetail; labels on Login/Register/Presets/EmojiPicker/ChallengeDetail; BeBetterCam/DayDetail dialog roles
- [x] Dead code removed — YearGrid/FeaturePillar/HabitShowcaseCard components, unused imports, unused store method, redundant console.error, dead CreateModal scheduledDays
- [x] TaskCard context menu vertical overflow clamp; Profile grid Set lookup; SW cache bumped bebetter-v5

## Infra notes (dev stack)

- dev-web runs as root (uid-1000 variant hit unreproducible EACCES on this host's storage; root stable 41h+). Host-side `npm run build` may hit root-owned dist → `docker compose -f docker-compose.dev.yml stop dev-web`, chown dist, build, start.
- If dev-web ever crash-loops (exit 243 / EACCES .vite-temp): remove stray containers using `bebetter_dev-node-modules` volume and `docker run --rm -u root -v bebetter_dev_node_modules:/nm node:20-alpine sh -c "rm -rf /nm/.vite-temp"` then recreate.