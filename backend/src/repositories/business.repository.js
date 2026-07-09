const client = require('../config/db');

const TABLE = 'business_settings';

// Columns in the current DB schema — used to validate dynamic column access
const ALLOWED_COLUMNS = new Set([
  'setting_id', 'business_name', 'business_type', 'currency',
  'created_at', 'updated_at', 'business_email', 'phone', 'address',
  'logo', 'website', 'tax_number', 'registration_number', 'receipt_footer',
  'timezone', 'language', 'date_format', 'allow_negative_stock', 'enable_offline_mode'
]);

async function getAllSettings() {
  const q = `SELECT * FROM ${TABLE} ORDER BY created_at DESC`;
  const { rows } = await client.query(q);
  return rows;
}

// Get a single row (most apps keep a single business_settings row)
async function getBusiness() {
  const q = `SELECT * FROM ${TABLE} ORDER BY created_at DESC LIMIT 1`;
  const { rows } = await client.query(q);
  return rows[0] || null;
}

// Compatibility helper: return the value of a named column from the first settings row.
// Returns null if the column does not exist or no row is present.
async function getSettingByKey(key) {
  if (!ALLOWED_COLUMNS.has(key)) return null;
  const row = await getBusiness();
  if (!row) return null;
  return row[key] === undefined ? null : row[key];
}

// Update a specific column (identified by `key`) or multiple fields via `patch`.
// If no row exists, an INSERT will be attempted with the provided fields.
async function upsertSetting({ key, value, patch = {}, updated_by = null }) {
  // support legacy call upsertSetting({ key, value })
  if (key) patch[key] = value;

  const keys = Object.keys(patch).filter(k => ALLOWED_COLUMNS.has(k));
  if (!keys.length) throw new Error('No valid fields provided for update');

  const existing = await getBusiness();
  if (!existing) {
    // insert a new row with only the provided columns
    const cols = [...keys, 'created_at', 'updated_at'];
    const params = keys.map((_, i) => `$${i+1}`);
    params.push('now()', 'now()');
    const q = `INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${params.join(',')}) RETURNING *`;
    const values = keys.map(k => patch[k]);
    const { rows } = await client.query(q, values);
    return rows[0];
  }

  // update existing row
  const sets = [];
  const values = [];
  let idx = 1;
  for (const k of keys) {
    sets.push(`${k} = $${idx}`);
    values.push(patch[k]);
    idx++;
  }
  sets.push(`updated_at = now()`);
  values.push(existing.setting_id);
  const q = `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE setting_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, values);
  return rows[0];
}

// Delete setting row by setting_id (legacy deleteSetting(key) previously used key name)
async function deleteSetting(identifier) {
  // if identifier looks like uuid, delete that row; otherwise no-op
  const q = `DELETE FROM ${TABLE} WHERE setting_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [identifier]);
  return rows[0] || null;
}

module.exports = {
  getAllSettings,
  getBusiness,
  getSettingByKey,
  upsertSetting,
  deleteSetting,
};
