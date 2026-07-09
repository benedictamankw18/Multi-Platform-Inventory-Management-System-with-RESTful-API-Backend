const client = require('../config/db');

const TABLE = 'suppliers';

async function createSupplier({ supplier_id, supplier_name, contact_name = null, phone = null, email = null, address = null, company_registration_no = null, tax_number = null, website = null, bank_name = null, account_name = null, account_number = null, payment_terms = null, is_active = true } = {}) {
  const q = `
    INSERT INTO ${TABLE} (supplier_id, supplier_name, contact_name, phone, email, address, is_active, company_registration_no, tax_number, website, bank_name, account_name, account_number, payment_terms)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`;
  const values = [supplier_id || null, supplier_name, contact_name || null, phone || null, email || null, address || null, typeof is_active === 'undefined' ? true : is_active, company_registration_no || null, tax_number || null, website || null, bank_name || null, account_name || null, account_number || null, payment_terms || null];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getSupplierById(supplier_id) {
  const q = `SELECT * FROM ${TABLE} WHERE supplier_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [supplier_id]);
  return rows[0];
}

async function listSuppliers({ q: search, isActive, limit = 25, offset = 0 } = {}) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(supplier_name ILIKE $${params.length} OR contact_name ILIKE $${params.length})`);
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

async function updateSupplier(supplier_id, patch) {
  const allowed = ['supplier_name','contact_name','phone','email','address','is_active','company_registration_no','tax_number','website','bank_name','account_name','account_number','payment_terms'];
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
  if (!fields.length) return getSupplierById(supplier_id);
  params.push(supplier_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE supplier_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
}

async function deactivateSupplier(supplier_id) {
  const q = `UPDATE ${TABLE} SET is_active = false, updated_at = now() WHERE supplier_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [supplier_id]);
  return rows[0];
}

module.exports = {
  createSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
  deactivateSupplier,
};
