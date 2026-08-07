const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  const token = (header && header.startsWith('Bearer ') ? header.slice(7) : null) || cookieToken;

  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const DEMO_USERNAME = process.env.DEMO_USERNAME || 'demo';

async function isDemoUser(userId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isDemo: true } });
    return !!user?.isDemo;
  } catch {
    return false;
  }
}

function demoGuard(req, res, next) {
  isDemoUser(req.userId).then((isDemo) => {
    if (isDemo) {
      return res.status(403).json({ error: 'Not available in the demo account. Sign up to use this.' });
    }
    next();
  });
}

function demoFieldGuard(fields) {
  return (req, res, next) => {
    isDemoUser(req.userId).then((isDemo) => {
      if (!isDemo) return next();
      const restricted = fields.filter((f) => {
        const v = req.body?.[f];
        if (v === undefined || v === null || v === false) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      });
      if (restricted.length > 0) {
        return res.status(403).json({ error: 'Not available in the demo account. Sign up to use this.' });
      }
      next();
    });
  };
}

module.exports = { signToken, authMiddleware, JWT_SECRET, demoGuard, demoFieldGuard, isDemoUser, DEMO_USERNAME };