const client = require('../config/db');

const TABLE = 'units_of_measure';

async function createUom({ uom_id, uom_name, description = null, symbol = null, conversion_factor = 1 } = {}) {
  const q = `
    INSERT INTO ${TABLE} (uom_id, uom_name, description, symbol, conversion_factor)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *`;
  const values = [uom_id || null, uom_name, description || null, symbol || null, conversion_factor];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getUomById(uom_id) {
  const q = `SELECT * FROM ${TABLE} WHERE uom_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [uom_id]);
  return rows[0];
}

async function listUoms({ q: search, limit = 25, offset = 0 } = {}) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(uom_name ILIKE $${params.length} OR symbol ILIKE $${params.length})`);
  }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

async function updateUom(uom_id, patch) {
  const allowed = ['uom_name','description','symbol','conversion_factor'];
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
  if (!fields.length) return getUomById(uom_id);
  params.push(uom_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE uom_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
}

async function deleteUom(uom_id) {
  const q = `DELETE FROM ${TABLE} WHERE uom_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [uom_id]);
  return rows[0] || null;
}

async function findUomByName(uom_name) {
  const q = `SELECT * FROM ${TABLE} WHERE LOWER(uom_name) = LOWER($1) LIMIT 1`;
  const { rows } = await client.query(q, [uom_name]);
  return rows[0];
}

module.exports = {
  createUom,
  getUomById,
  listUoms,
  updateUom,
  deleteUom,
  findUomByName,
};
