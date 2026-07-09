const client = require('../config/db');

const TABLE = 'notifications';

async function createNotification({user_id, title, body, type, data, read, created_by }) {
  const q = `INSERT INTO ${TABLE} (user_id, title, body, type, data, is_read, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
  const values = [user_id || null, title || null, body || null, type || null, data || null, read ? true : false, created_by || null];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getNotificationById(id) {
  const q = `SELECT * FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL LIMIT 1`;
  const { rows } = await client.query(q, [id]);
  return rows[0];
}

async function listNotifications({ userId, isRead, limit = 50, offset = 0 }) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];

  where.push(`deleted_at IS NULL`);
  if (userId) {
    params.push(userId);
    where.push(`user_id = $${params.length}`);
  }
  if (typeof isRead !== 'undefined') {
    params.push(isRead === 'true' || isRead === true);
    where.push(`is_read = $${params.length}`);
  }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

async function markAsRead(id) {
  const q = `UPDATE ${TABLE} SET is_read = true WHERE id = $1 AND deleted_at IS NULL RETURNING *`;
  const { rows } = await client.query(q, [id]);
  return rows[0];
}

async function updateNotification(id, patch) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return getNotificationById(id);
  params.push(id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
}

async function deleteNotification(id) {
  const q = `UPDATE ${TABLE} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

module.exports = {
  createNotification,
  getNotificationById,
  listNotifications,
  markAsRead,
  updateNotification,
  deleteNotification,
};
