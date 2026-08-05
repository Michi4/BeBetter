const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

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
const publicPresetRoutes = require('./routes/presets-public');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTION_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://bebetter.websters.at' : true;

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
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true }));

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir, {
  maxAge: '1y',
  immutable: true,
  etag: true,
  lastModified: true,
}));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  }
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
