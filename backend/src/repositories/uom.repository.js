const client = require('../config/db');

const TABLE = 'units_of_measure';

async function createUom({ uom_name, description = null, symbol = null, conversion_factor = 1, is_active = true } = {}) {
  // uom_id is intentionally omitted so the database default (gen_random_uuid())
  // generates it. Passing NULL explicitly would override the default and fail.
  const q = `
    INSERT INTO ${TABLE} (uom_name, description, symbol, conversion_factor, is_active)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *`;
  const values = [uom_name, description || null, symbol || null, conversion_factor, is_active];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getUomById(uom_id) {
  const q = `SELECT * FROM ${TABLE} WHERE uom_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [uom_id]);
  return rows[0];
}

function buildFilters({ q, isActive } = {}) {
  const where = [];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(uom_name ILIKE $${params.length} OR symbol ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    where.push(`is_active = $${params.length}`);
  }
  return { whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listUoms({ q, isActive, limit = 25, offset = 0 } = {}) {
  const { whereClause, params } = buildFilters({ q, isActive });
  const values = [...params, limit, offset];
  const base = `SELECT * FROM ${TABLE} ${whereClause} ORDER BY uom_name ASC LIMIT $${values.length - 1} OFFSET $${values.length}`;
  const { rows } = await client.query(base, values);
  return rows;
}

async function countUoms({ q, isActive } = {}) {
  const { whereClause, params } = buildFilters({ q, isActive });
  const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM ${TABLE} ${whereClause}`, params);
  return rows[0].count;
}

async function updateUom(uom_id, patch) {
  const allowed = ['uom_name', 'description', 'symbol', 'conversion_factor', 'is_active'];
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

async function deactivateUom(uom_id) {
  const q = `UPDATE ${TABLE} SET is_active = FALSE, updated_at = now() WHERE uom_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [uom_id]);
  return rows[0];
}

async function activateUom(uom_id) {
  const q = `UPDATE ${TABLE} SET is_active = TRUE, updated_at = now() WHERE uom_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [uom_id]);
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
  countUoms,
  updateUom,
  deactivateUom,
  activateUom,
  deleteUom,
  findUomByName,
};
