const client = require('../config/db');

const TABLE = 'branches';

async function createBranch({ branch_id, branch_name, address = null, phone = null, is_active = true, email = null, manager_id = null, city = null, country = null, postal_code = null, latitude = null, longitude = null }) {
  const q = `INSERT INTO ${TABLE} (branch_id, branch_name, address, phone, is_active, email, manager_id, city, country, postal_code, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`;
  const values = [branch_id || null, branch_name, address || null, phone || null, typeof is_active === 'undefined' ? true : is_active, email || null, manager_id || null, city || null, country || null, postal_code || null, latitude || null, longitude || null];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getBranchById(branch_id) {
  const q = `SELECT * FROM ${TABLE} WHERE branch_id = $1`;
  const { rows } = await client.query(q, [branch_id]);
  return rows[0];
}

async function listBranches({ q: search, isActive, limit = 25, offset = 0 } = {}) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`branch_name ILIKE $${params.length}`);
  }
  if (typeof isActive !== 'undefined') {
    params.push(isActive === 'true' || isActive === true);
    where.push(`is_active = $${params.length}`);
  }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

async function updateBranch(branch_id, patch) {
  const fields = [];
  const params = [];
  let idx = 1;
  const allowed = ['branch_name','address','phone','is_active','email','manager_id','city','country','postal_code','latitude','longitude'];
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(patch[key]);
      idx++;
    }
  }
  if (!fields.length) return getBranchById(branch_id);
  params.push(branch_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE branch_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
}

async function deactivateBranch(branch_id) {
  const q = `UPDATE ${TABLE} SET is_active = false, updated_at = now() WHERE branch_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [branch_id]);
  return rows[0];
}

async function deleteBranch(branch_id) {
  const q = `DELETE FROM ${TABLE} WHERE branch_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [branch_id]);
  return rows[0];
}

async function activateBranch(branch_id) {
  const q = `UPDATE ${TABLE} SET is_active = true, updated_at = now() WHERE branch_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [branch_id]);
  return rows[0];
}

module.exports = {
  createBranch,
  getBranchById,
  listBranches,
  updateBranch,
  deleteBranch,
  deactivateBranch,
  activateBranch,
};
