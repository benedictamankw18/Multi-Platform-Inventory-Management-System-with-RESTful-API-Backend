const pool = require('../config/db');

const TABLE = 'sync_logs';

async function createSyncLog({ sync_id, device_id, local_transaction_id, entity_type, sync_status = 'PENDING', synced_at = null, error_message = null, retry_count = 0, sync_duration_ms = null } = {}) {
  const q = `
    INSERT INTO ${TABLE} (sync_id, device_id, local_transaction_id, entity_type, sync_status, synced_at, error_message, retry_count, sync_duration_ms, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now(), now())
    RETURNING *`;
  const vals = [sync_id || null, device_id, local_transaction_id, entity_type, sync_status, synced_at, error_message, retry_count, sync_duration_ms];
  const { rows } = await pool.query(q, vals);
  return rows[0];
}

async function getSyncLogById(syncId) {
  const q = `SELECT * FROM ${TABLE} WHERE sync_id = $1 LIMIT 1`;
  const { rows } = await pool.query(q, [syncId]);
  return rows[0] || null;
}

async function listSyncLogs({ entityType, status, deviceId, since, limit = 50, offset = 0 } = {}) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (entityType) { params.push(entityType); where.push(`entity_type = $${params.length}`); }
  if (status) { params.push(status); where.push(`sync_status = $${params.length}`); }
  if (deviceId) { params.push(deviceId); where.push(`device_id = $${params.length}`); }
  if (since) { params.push(since); where.push(`created_at >= $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit); params.push(offset);
  base += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await pool.query(base, params);
  return rows;
}

async function markSyncSuccess(syncId, syncedAt = null, durationMs = null) {
  const q = `UPDATE ${TABLE} SET sync_status = 'SUCCESS', synced_at = COALESCE($2, now()), sync_duration_ms = $3, updated_at = now() WHERE sync_id = $1 RETURNING *`;
  const { rows } = await pool.query(q, [syncId, syncedAt, durationMs]);
  return rows[0] || null;
}

async function markSyncFailed(syncId, errorMessage = null) {
  const q = `UPDATE ${TABLE} SET sync_status = 'FAILED', error_message = $2, retry_count = COALESCE(retry_count,0) + 1, updated_at = now() WHERE sync_id = $1 RETURNING *`;
  const { rows } = await pool.query(q, [syncId, errorMessage]);
  return rows[0] || null;
}

async function incrementRetry(syncId) {
  const q = `UPDATE ${TABLE} SET retry_count = COALESCE(retry_count,0) + 1, updated_at = now() WHERE sync_id = $1 RETURNING retry_count`;
  const { rows } = await pool.query(q, [syncId]);
  return rows[0] || null;
}

async function updateSyncLog(syncId, patch = {}) {
  const allowed = ['device_id','local_transaction_id','entity_type','sync_status','synced_at','error_message','retry_count','sync_duration_ms'];
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(patch[key]);
      idx++;
    }
  }
  if (!fields.length) return getSyncLogById(syncId);
  params.push(syncId);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE sync_id = $${idx} RETURNING *`;
  const { rows } = await pool.query(q, params);
  return rows[0] || null;
}

async function getPendingSyncs({ limit = 100, olderThanSeconds = null } = {}) {
  let q = `SELECT * FROM ${TABLE} WHERE sync_status = 'PENDING'`;
  const params = [];
  if (olderThanSeconds) { params.push(olderThanSeconds); q += ` AND extract(epoch FROM now() - created_at) >= $${params.length}`; }
  params.push(limit);
  q += ` ORDER BY created_at ASC LIMIT $${params.length}`;
  const { rows } = await pool.query(q, params);
  return rows;
}

// Keep generic pull/push helpers for other entities — unchanged
async function pullChanges(entity, since) {
  const q = `SELECT * FROM ${entity} WHERE updated_at > $1 ORDER BY updated_at ASC`;
  const { rows } = await pool.query(q, [since]);
  return rows;
}

async function pushChanges(entity, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const it of items) {
      const idKey = Object.keys(it).find(k => /id$/.test(k)) || 'id';
      const id = it[idKey];
      const keys = Object.keys(it).filter(k => k !== idKey);
      const values = keys.map(k => it[k]);
      const cols = keys.join(', ');
      const params = keys.map((_, idx) => `$${idx + 2}`).join(', ');
      const upsert = `INSERT INTO ${entity} (${idKey}, ${cols}) VALUES ($1, ${params}) ON CONFLICT (${idKey}) DO UPDATE SET ${keys.map(k => `${k}=EXCLUDED.${k}`).join(', ')}`;
      await client.query(upsert, [id, ...values]);
    }
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createSyncLog,
  getSyncLogById,
  listSyncLogs,
  markSyncSuccess,
  markSyncFailed,
  incrementRetry,
  updateSyncLog,
  getPendingSyncs,
  pullChanges,
  pushChanges,
};
