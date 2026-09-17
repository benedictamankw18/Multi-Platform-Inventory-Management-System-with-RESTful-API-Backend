/**
 * rateLimiter.middleware.js
 *
 * Exports two rate limiters:
 *
 *   - default export (require directly): general API limiter, 500 req / 15 min
 *     per identity. The counter is attributed to the authenticated identity —
 *     { user, device, login, user_sessions } — instead of the raw IP, so every
 *     device/login/session gets its own budget (a shared NAT IP no longer
 *     throttles unrelated users). Anonymous requests fall back to a per-IP
 *     budget. Counters live in Redis (survive restarts, shared across
 *     instances) with an in-memory fallback when Redis is unreachable.
 *     /api/v1/health is exempt: internal liveness probes must not consume the
 *     user-facing budget.
 *
 *   - named export ({ loginLimiter }): brute-force protection for the login
 *     endpoint, 5 req / 15 min, keyed by { device, username } with an IP
 *     fallback so a handful of attempts on one device don't lock everyone out
 *     on a shared IP.
 *
 * Identity resolution
 *   The access token signed by auth.service.js carries { sub, sid, loginId }.
 *   The keyGenerator decodes the Bearer token (without verifying the signature
 *   — keying only needs the claims; a forged token merely limits the forger)
 *   and reads the client-supplied X-Device-Id header. Any missing part is
 *   recorded as 'anon', keeping the key stable per session.
 */

const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const cache = require('../utils/cache.utils');

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Atomic increment + expiry (node-redis v4 multi() chain doesn't expose every
// command, so a single Lua script is used instead — it is also race-free).
const INCR_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { hits, redis.call('PTTL', KEYS[1]) }
`;
const DECR_SCRIPT = `
local v = redis.call('DECR', KEYS[1])
if v < 0 then redis.call('DEL', KEYS[1]) end
return v
`;

// ---------------------------------------------------------------------------
// Key generators
// ---------------------------------------------------------------------------

function identityKeyGenerator(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.decode(authHeader.slice('Bearer '.length).trim());
      if (decoded && typeof decoded === 'object') {
        const sub = decoded.sub;
        const sid = decoded.sid;
        const loginId = decoded.loginId;
        const device = String(req.headers['x-device-id'] || '').slice(0, 200);
        return `rl:u:${sub || 'anon'}:d:${device || 'anon'}:l:${loginId || 'anon'}:s:${sid || 'anon'}`;
      }
    } catch (err) {
      // Malformed token — fall through to the IP-based key below.
    }
  }
  return `rl:ip:${rateLimit.ipKeyGenerator(req.ip)}`;
}

function loginKeyGenerator(req) {
  const device = String(req.headers['x-device-id'] || '').slice(0, 200);
  const username = String((req.body && (req.body.username || req.body.usernameOrEmail)) || '').slice(0, 100);
  if (device) return `login:dev:${device}:${username || 'anon'}`;
  if (username) return `login:ip:${rateLimit.ipKeyGenerator(req.ip)}:${username}`;
  return `login:ip:${rateLimit.ipKeyGenerator(req.ip)}`;
}

// ---------------------------------------------------------------------------
// Redis-backed store (express-rate-limit Store contract) with memory fallback
// ---------------------------------------------------------------------------

class MemoryFallbackStore {
  constructor(windowMs) {
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  async increment(key) {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetTime.getTime() <= now) {
      const resetTime = new Date(now + this.windowMs);
      this.hits.set(key, { totalHits: 1, resetTime });
      return { totalHits: 1, resetTime };
    }
    entry.totalHits += 1;
    return { totalHits: entry.totalHits, resetTime: entry.resetTime };
  }

  async decrement(key) {
    const entry = this.hits.get(key);
    if (entry) entry.totalHits = Math.max(0, entry.totalHits - 1);
  }

  async resetKey(key) {
    this.hits.delete(key);
  }

  async resetAll() {
    this.hits.clear();
  }
}

class RedisIdentityStore {
  constructor(windowMs) {
    this.windowMs = windowMs;
    this.fallback = null;
  }

  _memory() {
    if (!this.fallback) this.fallback = new MemoryFallbackStore(this.windowMs);
    return this.fallback;
  }

  async _client() {
    return cache.connect();
  }

  async increment(key) {
    try {
      const client = await this._client();
      const [hits, ttl] = await client.eval(INCR_SCRIPT, { keys: [key], arguments: [String(this.windowMs)] });
      return { totalHits: Number(hits), resetTime: new Date(Date.now() + Number(ttl)) };
    } catch (err) {
      console.error('[rate-limiter] Redis unavailable, using memory fallback.', err && err.message);
      return this._memory().increment(key);
    }
  }

  async decrement(key) {
    try {
      const client = await this._client();
      await client.eval(DECR_SCRIPT, { keys: [key] });
    } catch (err) {
      return this._memory().decrement(key);
    }
  }

  async resetKey(key) {
    try {
      const client = await this._client();
      await client.del(key);
    } catch (err) {
      return this._memory().resetKey(key);
    }
  }

  async resetAll() {
    try {
      const client = await this._client();
      const keys = await client.keys('rl:*');
      if (keys && keys.length) await client.del(keys);
    } catch (err) {
      return this._memory().resetAll();
    }
  }
}

// ---------------------------------------------------------------------------
// Limiters
// ---------------------------------------------------------------------------

const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  store: new RedisIdentityStore(WINDOW_MS),
  keyGenerator: identityKeyGenerator,
  // Internal liveness probes must never consume the user-facing budget.
  skip: (req) => req.path === '/api/v1/health',
});

const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  keyGenerator: loginKeyGenerator,
});

// Export both from the same object so nothing overwrites loginLimiter.
// Routes that want the general limiter:  const limiter = require('./rateLimiter.middleware')
// Routes that want the login limiter:    const { loginLimiter } = require('./rateLimiter.middleware')
generalLimiter.loginLimiter = loginLimiter;

module.exports = generalLimiter;
