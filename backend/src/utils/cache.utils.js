const { createClient } = require('redis');
const DEFAULT_TTL = 60 * 5; // 5 minutes

let client;

async function connect() {
  if (client) return client;
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  client = createClient({ url });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  return client;
}

async function get(key) {
  try {
    await connect();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Cache get error', err);
    return null;
  }
}

async function set(key, value, ttl = DEFAULT_TTL) {
  try {
    await connect();
    await client.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    console.error('Cache set error', err);
  }
}

async function del(key) {
  try {
    await connect();
    await client.del(key);
  } catch (err) {
    console.error('Cache del error', err);
  }
}

async function delByPattern(pattern) {
  try {
    await connect();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    console.error('Cache delByPattern error', err);
  }
}

module.exports = { connect, get, set, del, delByPattern };
