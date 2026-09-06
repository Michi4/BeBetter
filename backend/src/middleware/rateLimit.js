// In-memory per-IP sliding-window rate limiter.
// Single-instance: each container keeps its own buckets (fine for abuse throttling).
// The app does NOT set `trust proxy`, so req.ip would be Traefik's address —
// key on the first X-Forwarded-For hop instead, falling back to req.ip.
const buckets = new Map();

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    const first = xff.split(',')[0].trim();
    if (first) return first.slice(0, 64);
  }
  return req.ip || 'unknown';
}

function rateLimit({ windowMs = 60000, max = 20, name = 'default' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${name}:${clientIp(req)}`;
    let hits = buckets.get(key);
    if (hits) {
      hits = hits.filter((t) => now - t < windowMs);
    } else {
      hits = [];
    }
    hits.push(now);
    buckets.set(key, hits);
    // Opportunistic memory hygiene.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (!v.length || now - v[v.length - 1] >= windowMs) buckets.delete(k);
        if (buckets.size <= 4000) break;
      }
    }
    if (hits.length > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
    }
    next();
  };
}

const authLimiter = rateLimit({ windowMs: 60000, max: 10, name: 'auth' });
const loginLimiter = rateLimit({ windowMs: 60000, max: 15, name: 'login' });
const registerLimiter = rateLimit({ windowMs: 60000, max: 5, name: 'register' });
const forgotLimiter = rateLimit({ windowMs: 60000, max: 3, name: 'forgot' });
const resetLimiter = rateLimit({ windowMs: 60000, max: 5, name: 'reset' });
const publicLimiter = rateLimit({ windowMs: 60000, max: 60, name: 'public' });

module.exports = { rateLimit, authLimiter, loginLimiter, registerLimiter, forgotLimiter, resetLimiter, publicLimiter };
