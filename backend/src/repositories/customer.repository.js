const client = require('../config/db');

const TABLE = 'customers';

async function createCustomer({ customer_id, customer_type = 'WALK_IN', business_name = null, contact_name = null, phone = null, email = null, address = null, credit_limit = 0, is_active = true, loyalty_points = 0, tax_number = null, date_of_birth = null, gender = null, notes = null }) {
  const q = `INSERT INTO ${TABLE} (customer_id, customer_type, business_name, contact_name, phone, email, address, credit_limit, is_active, loyalty_points, tax_number, date_of_birth, gender, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`;
  console.log('iD :', customer_id);
  const values = [
    customer_id ,
    customer_type || 'WALK_IN',
    business_name || null,
    contact_name || null,
    phone || null,
    email || null,
    address || null,
    credit_limit || 0,
    typeof is_active === 'undefined' ? true : is_active,
    loyalty_points || 0,
    tax_number || null,
    date_of_birth || null,
    gender || null,
    notes || null,
  ];
  // console.log('Executing query:', q, 'with values:', values);
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getCustomerById(customer_id) {
  const q = `SELECT * FROM ${TABLE} WHERE customer_id = $1`;
  const { rows } = await client.query(q, [customer_id]);
  return rows[0];
}

async function listCustomers({ q: search, isActive, limit = 25, offset = 0 } = {}) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(contact_name ILIKE $${params.length} OR business_name ILIKE $${params.length})`);
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

async function updateCustomer(customer_id, patch) {
  const fields = [];
  const params = [];
  let idx = 1;
  const allowed = ['customer_type','business_name','contact_name','phone','email','address','credit_limit','is_active','loyalty_points','tax_number','date_of_birth','gender','notes'];
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(patch[key]);
      idx++;
    }
  }
  if (!fields.length) return getCustomerById(customer_id);
  params.push(customer_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE customer_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
}

async function deactivateCustomer(customer_id) {
  const q = `UPDATE ${TABLE} SET is_active = false, updated_at = now() WHERE customer_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [customer_id]);
  return rows[0];
}

async function activateCustomer(customer_id) {
  const q = `UPDATE ${TABLE} SET is_active = true, updated_at = now() WHERE customer_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [customer_id]);
  return rows[0];
}

module.exports = {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  deactivateCustomer,
  activateCustomer,
};
