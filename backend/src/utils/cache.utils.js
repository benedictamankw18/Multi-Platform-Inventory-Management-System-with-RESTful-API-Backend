const { createClient } = require('redis');

const DEFAULT_TTL = 60 * 5; // 5 minutes
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Bounded connect so a missing/unreachable Redis cannot hang the request path.
// node-redis retries forever by default, which made every cache caller (rate
// limiter, permission middleware) block indefinitely instead of falling back.
const CONNECT_TIMEOUT_MS = 1000;
// Overall budget for one full connect attempt (all reconnect tries combined),
// so a request can never be stuck for longer than this waiting on Redis.
const CONNECT_BUDGET_MS = 3000;
// Each individual attempt can itself wait up to CONNECT_TIMEOUT_MS (an
// unreachable host drops packets rather than refusing), so keep the retry
// count low: the first request after Redis dies pays ~CONNECT_BUDGET_MS, then
// the cooldown below makes every following request fail immediately.
const MAX_RECONNECT_ATTEMPTS = 2;
const RECONNECT_COOLDOWN_MS = 15000;
const ERROR_LOG_THROTTLE_MS = 30000;

let client;
let pendingClient = null;
let connecting = null;
let nextRetryAt = 0;
let lastErrorLoggedAt = 0;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    if (timer.unref) timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function logThrottled(err) {
  const now = Date.now();
  if (now - lastErrorLoggedAt < ERROR_LOG_THROTTLE_MS) return;
  lastErrorLoggedAt = now;
  console.error('[cache] Redis unavailable:', (err && err.message) || err);
}

/**
 * Returns a ready Redis client, or throws quickly when Redis is unreachable so
 * callers fall back (in-memory rate limiting, direct DB reads). Failed
 * connection attempts are put on a short cooldown to avoid per-request stalls,
 * then retried so the client recovers once Redis is back.
 */
async function connect() {
  if (client && client.isReady) return client;

  if (!connecting && Date.now() < nextRetryAt) {
    throw new Error('Redis temporarily unavailable (backing off)');
  }

  if (!connecting) {
    const c = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries) =>
          retries > MAX_RECONNECT_ATTEMPTS
            ? new Error('Redis reconnect attempts exhausted')
            : Math.min(retries * 200, 2000),
      },
    });

    // Low-level socket errors are throttled; connect() surfaces the failure.
    c.on('error', logThrottled);
    pendingClient = c;

    connecting = withTimeout(c.connect(), CONNECT_BUDGET_MS, 'Redis connect')
      .then(() => {
        client = c;
        nextRetryAt = 0;
      })
      .catch((err) => {
        client = undefined;
        nextRetryAt = Date.now() + RECONNECT_COOLDOWN_MS;
        // Stop the failed client from reconnecting in the background; the next
        // attempt after the cooldown builds a fresh client.
        try { c.destroy(); } catch { /* already closed */ }
        logThrottled(err);
        throw err;
      })
      .finally(() => {
        connecting = null;
        if (pendingClient === c) pendingClient = null;
      });
  }

  await connecting;

  if (!client || !client.isReady) {
    throw new Error('Redis client is not ready');
  }
  return client;
}

async function get(key) {
  try {
    const c = await connect();
    const data = await c.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logThrottled(err);
    return null;
  }
}

async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    const c = await connect();
    await c.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    logThrottled(err);
  }
}

async function del(key) {
  try {
    const c = await connect();
    await c.del(key);
  } catch (err) {
    logThrottled(err);
  }
}

async function delByPattern(pattern) {
  try {
    const c = await connect();
    const keys = await c.keys(pattern);
    if (keys.length > 0) {
      await c.del(keys);
    }
  } catch (err) {
    logThrottled(err);
  }
}

module.exports = { connect, get, set, del, delByPattern };
