const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/grid', gridRoutes);
app.use('/api/presets', presetRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/vacation', vacationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true }));

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

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
