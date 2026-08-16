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
- [x] Final build/lint verification

## Infra notes (dev stack)

- dev-web runs as root (uid-1000 variant hit unreproducible EACCES on this host's storage; root stable 41h+). Host-side `npm run build` may hit root-owned dist → `docker compose -f docker-compose.dev.yml stop dev-web`, chown dist, build, start.
- If dev-web ever crash-loops (exit 243 / EACCES .vite-temp): remove stray containers using `bebetter_dev-node-modules` volume and `docker run --rm -u root -v bebetter_dev_node_modules:/nm node:20-alpine sh -c "rm -rf /nm/.vite-temp"` then recreate.