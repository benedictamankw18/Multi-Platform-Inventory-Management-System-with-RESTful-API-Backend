const client = require('../config/db');
const TABLE = 'message_queue';

async function enqueueMessage({ id, type, payload = {}, attempts = 0, status = 'PENDING', next_try = null } = {}) {
  const q = `INSERT INTO ${TABLE} (id, type, payload, attempts, status, next_try, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6, now(), now()) RETURNING *`;
  const vals = [id || null, type, payload ? JSON.stringify(payload) : null, attempts || 0, status || 'PENDING', next_try || null];
  const { rows } = await client.query(q, vals);
  return rows[0];
}

async function getPending({ limit = 50 } = {}) {
  const q = `SELECT * FROM ${TABLE} WHERE status = 'PENDING' AND (next_try IS NULL OR next_try <= now()) ORDER BY created_at ASC LIMIT $1`;
  const { rows } = await client.query(q, [limit]);
  return rows;
}

async function markProcessing(id) {
  const q = `UPDATE ${TABLE} SET status = 'PROCESSING', updated_at = now() WHERE id = $1 RETURNING *`;
  const { rows } = await client.query(q, [id]);
  return rows[0];
}

async function markDone(id) {
  const q = `UPDATE ${TABLE} SET status = 'DONE', updated_at = now() WHERE id = $1 RETURNING *`;
  const { rows } = await client.query(q, [id]);
  return rows[0];
}

async function markFailed(id, errorMessage = null) {
  const q = `UPDATE ${TABLE} SET status = 'FAILED', updated_at = now(), last_error = $2 WHERE id = $1 RETURNING *`;
  const { rows } = await client.query(q, [id, errorMessage]);
  return rows[0];
}

async function incrementAttempts(id) {
  const q = `UPDATE ${TABLE} SET attempts = COALESCE(attempts,0) + 1, updated_at = now() WHERE id = $1 RETURNING attempts`;
  const { rows } = await client.query(q, [id]);
  return rows[0];
}

async function updateNextTry(id, nextTry) {
  const q = `UPDATE ${TABLE} SET next_try = $2, updated_at = now() WHERE id = $1 RETURNING *`;
  const { rows } = await client.query(q, [id, nextTry]);
  return rows[0];
}

async function list({ status = null, type = null, limit = 50, offset = 0 } = {}) {
  const q = `SELECT * FROM ${TABLE} WHERE ($1::text IS NULL OR status = $1) AND ($2::text IS NULL OR type = $2) ORDER BY created_at DESC LIMIT $3 OFFSET $4`;
  const vals = [status, type, limit, offset];
  const { rows } = await client.query(q, vals);
  return rows;
}

module.exports = {
  enqueueMessage,
  getPending,
  markProcessing,
  markDone,
  markFailed,
  incrementAttempts,
  updateNextTry,
  list,
};

