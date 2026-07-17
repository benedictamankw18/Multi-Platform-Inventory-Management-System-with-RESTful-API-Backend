const client = require('../config/db');

const TABLE = 'system_settings';

async function getAll() {
  const q = `SELECT * FROM ${TABLE} ORDER BY created_at DESC`;
  const { rows } = await client.query(q);
  return rows;
}

async function getByKey(key) {
  const q = `SELECT * FROM ${TABLE} WHERE setting_key = $1 LIMIT 1`;
  const { rows } = await client.query(q, [key]);
  return rows[0] || null;
}

async function upsert({ key, value, description = null }) {
  const q = `
    INSERT INTO ${TABLE} (setting_key, setting_value, description, updated_at)
    VALUES ($1, $2, $3, now())
    ON CONFLICT (setting_key)
    DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description,
      updated_at = now()
    RETURNING *`;
  const { rows } = await client.query(q, [key, value, description]);
  return rows[0];
}

async function remove(key) {
  const q = `DELETE FROM ${TABLE} WHERE setting_key = $1 RETURNING *`;
  const { rows } = await client.query(q, [key]);
  return rows[0] || null;
}

module.exports = {
  getAll,
  getByKey,
  upsert,
  remove,
};
