const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require("path");
const fs = require("fs");

const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const logRoutes = require('./routes/logs');
const gridRoutes = require('./routes/grid');
const presetRoutes = require('./routes/presets');
const uploadRoutes = require('./routes/upload');
const statsRoutes = require('./routes/stats');
const friendRoutes = require('./routes/friends');
const challengeRoutes = require('./routes/challenges');
const adminRoutes = require('./routes/admin');
const vacationRoutes = require('./routes/vacation');
const taskRoutes = require('./routes/tasks');
const notificationRoutes = require('./routes/notifications');
const leaderboardRoutes = require('./routes/leaderboard');
const assistantRoutes = require('./routes/assistant');
const publicPresetRoutes = require('./routes/presets-public');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTION_ORIGINS = ['https://bebetter.websters.at', 'https://app.bebetter.websters.at'];
const PRODUCTION_ORIGIN =
  process.env.NODE_ENV === 'production'
    ? (origin, cb) => cb(null, !origin || PRODUCTION_ORIGINS.includes(origin))
    : true;

app.use(compression({ level: 6, threshold: 512 }));

app.use(cors({
  origin: PRODUCTION_ORIGIN,
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/grid', gridRoutes);
app.use('/api/presets/public', publicPresetRoutes);
app.use('/api/presets', presetRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/vacation', vacationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true }));

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir, {
  maxAge: '1y',
  immutable: true,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // Never cache the service worker or manifest — stale SW/manifest is
    // the classic reason installed PWAs never update (incl. fullscreen).
    if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// Serve the SPA shell from a cached copy of index.html. Reads happen at most
// once per file change, so an in-flight frontend rebuild (vite wipes dist
// before writing) can never turn a page navigation into a 500 crash.
const indexFile = path.join(publicDir, 'index.html');
let cachedIndex = null;
let cachedMtime = 0;

function getIndexHtml(cb) {
  fs.stat(indexFile, (statErr, st) => {
    if (statErr) return cb(null)
    if (cachedIndex && st.mtimeMs === cachedMtime) return cb(cachedIndex)
    fs.readFile(indexFile, (readErr, data) => {
      if (readErr) return cb(null)
      cachedMtime = st.mtimeMs
      cachedIndex = data
      cb(data)
    })
  })
}

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' })
  }
  // Only the SPA shell falls through — real files (assets, favicons) are
  // already handled above; anything else with an extension is a miss.
  if (/\.(?:[a-z0-9]+)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send('Not found')
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  getIndexHtml((html) => {
    if (html) return res.type('html').send(html)
    res.status(503).type('html').send(
      '<!doctype html><html><body style="font-family:system-ui;background:#0b0c0f;color:#f2f4f8;display:grid;place-items:center;height:100vh;margin:0">' +
      '<div style="text-align:center"><h1 style="margin-bottom:.5rem">BeBetter is booting…</h1>' +
      '<p style="color:#a3abb8">The app is being rebuilt right now. Please refresh in a moment.</p></div></body></html>'
    )
  })
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BeBetter API running on :${PORT}`);
  try {
    const { startScheduler } = require('./scheduler');
    startScheduler();
  } catch (e) {
    console.warn('Scheduler not started:', e.message);
  }
});
