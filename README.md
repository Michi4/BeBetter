<div align="center">

# BeBetter

**Habit tracking, task management & social competition in one PWA.**

Track habits with multiple schedules and precise reminders, manage one-off tasks,
challenge friends to head-to-head streak battles, and watch your year grow into
a contribution grid — installable, offline-capable, and production-deployed.

</div>

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Vue 3 (Composition API), Vite, Pinia, Vue Router, Tailwind CSS, lucide-vue-next |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL 18 |
| Real-time-ish | Web push notifications (VAPID), polling |
| Deployment | Docker Compose, Traefik (zero-downtime blue-green) |
| Extras | PWA (offline + installable), photo verification via getUserMedia |

## Repository layout

```
frontend/   Vue 3 SPA — landing page plus the full app
backend/    Express API, Prisma schema & seed, scheduler
deploy.sh   Zero-downtime blue-green deploy
docker-compose.yml  PostgreSQL + backend (+ Traefik labels)
uploads/    User-uploaded media (mounted volume)
vapid-keys.json     Web-push VAPID keypair
```

## Features

- **Habits** — multiple schedules per habit, exact-time reminders, photo or honor
  verification, automatic streaks/breaks, vacation support, consistency stats.
- **Tasks** — one-time scheduled tasks with precise reminders that feed your grid;
  no weekly repeats unless you ask for it; overdue items never clutter the day.
- **Social** — invite friends by link, head-to-head streak battles, shared
  leaderboard, accountability “buddies” who co-sign completions.
- **Presets** — community habit templates (created, liked, reported).
- **Year in Review** — GitHub-style contribution grid with per-habbit tooltips,
  month labels and intensity legend.
- **PWA** — installable, works offline, syncs on reconnect, photo verification
  with torch / front-camera swap.
- **Admin** — user search, role management, bans, reports, announcements,
  real-only platform stats.
- **Landing** — editorial theme with animated ambient background, kinetic hero
  tilt, scroll reveals; server-rendered OG image for rich link previews.

## Getting started (local)

> Everything runs on Node 20. Seed data is optional.

### 1. Backend + Postgres

```bash
cd backend
npm install
npx prisma generate
npx prisma db push          # apply Prisma schema
# DATABASE_URL + JWT_SECRET come from the repo-root .env in the compose setup,
# or export them in your shell for a bare `npm run dev` (http://localhost:3000)
```

Seed data (admin, demo + test users, sample habits/presets):

```bash
npm run db:seed
```

Seed credentials:
- Admin: `michael.ruep@gmail.com` / `ADMIN_PASSWORD` (env, default in seed)
- Demo: `demo@bebetter.local` / `password123`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api + /uploads to :3000)
```

Production build (inlines critical CSS for dark/light themes):

```bash
npm run build
```

## Database & schema

- Declarative schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
- No migration files — the project uses `prisma db push` (dev and at container
  start). **Reseed after every deploy:** `docker exec bebetter-api npm run db:seed`.
- Aggregate/platform stats (landing page & `/api/admin/stats`) count **real users
  only** — demo and seeded test accounts (`isDemo`, `isTest`) are excluded from
  leaderboards, friend search, and stats.

## API overview

All routes are under `/api` and authenticated where noted.

| Area | Routes | Notes |
| --- | --- | --- |
| Auth | `/auth/register`, `/login`, `/demo`, `/refresh`, `/forgot-password`, `/reset-password` | JWT in cookie / Bearer |
| Habits | `/habits` CRUD, `/habits/:id/log`, `/habits/featured/public` | Schedules as JSON |
| Logs | `/logs` | completion, undo |
| Grid | `/grid`, `/grid/years` | year contribution data |
| Tasks | `/tasks` CRUD | scheduled one-time items |
| Friends | `/friends`, `/search`, `/lookup`, requests | invite via link |
| Challenges | `/challenges` create/accept/leave | head-to-head battles |
| Stats | `/stats/overview`, `/streak`, `/consistency`, `/weekly` | per-user |
| Public | `/public/landing`, `/public/featured-habits` | landing page aggregates |
| Admin | `/admin/stats`, `/users`, `/reports`, `/announcements` | role-gated |
| Upload | `/upload` (avatar/photo) | multer |
| Push | `/notifications` subscription + preference | VAPID |

Development E2E checks (register → habit → task; two-user friends/challenge
flow) are headless-DOM scripts run against the deployed site.

## Deployment

Blue-green with Traefik health-check routing — no downtime:

```bash
./deploy.sh
```

What it does: builds the new image → starts `backend-green` and **waits for
health** → removes old blue → recreates blue → removes green.

Production conventions:

- Traefik routes `bebetter.websters.at`; legacy host 301-redirects.
- Security headers set (see `backend/src/index.js`): CSP with hash, HSTS,
  X-Frame-Options DENY, nosniff, referrer-policy.
- The scheduler (reminders, demo reset) uses a **PostgreSQL advisory lock** so
  blue+green overlap can't double-run jobs.
- Deploy runs `prisma db push` + `node src/index.js` inside Docker; the frontend
  is built in a multi-stage Docker build.

## Testing

Frontend uses no formal test suite; verification is done with headless DOM
assertion scripts (`/tmp/opencode/*.mjs`) covering landing, light/dark themes,
mobile drawer, account flows (register → habit → task), and two-user social
flows (friends, challenges, leaderboard). Run via `node /tmp/opencode/test-*.mjs`
after deploying.

## Project structure notes

- `AmbientGlow.vue` — canvas ambient background (mouse/wheel reactive blobs,
  grid dots, one soft cursor glow).
- `LandingNavbar.vue` — sticky header with theme toggle and mobile drawer;
  hover states are transparent + fast (150 ms) so nothing lingers.
- `ContributionGrid.vue` — the shared year heatmap used in both the app and the
  landing preview.
- `useTheme.js` — toggles `dark`/`light` classes exclusively on the root element.

## License

&copy; 2024-2026 Michael Ruep. All rights reserved.