const client = require('../config/db');

const TABLE = 'supplier_payments';

async function createSupplierPayment({ payment_id, supplier_id, po_id = null, amount = null, payment_method = null, payment_date = null, reference_number = null } = {}) {
  const q = `INSERT INTO ${TABLE} (payment_id, supplier_id, po_id, amount, payment_method, payment_date, reference_number) VALUES ($1,$2,$3,$4,$5,COALESCE($6, now()),$7) RETURNING *`;
  const values = [payment_id || null, supplier_id, po_id || null, amount || null, payment_method || null, payment_date || null, reference_number || null];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getSupplierPaymentById(payment_id) {
  const q = `SELECT * FROM ${TABLE} WHERE payment_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [payment_id]);
  return rows[0];
}

async function listSupplierPayments({ supplierId, poId, limit = 50, offset = 0 } = {}) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (supplierId) { params.push(supplierId); where.push(`supplier_id = $${params.length}`); }
  if (poId) { params.push(poId); where.push(`po_id = $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit); params.push(offset);
  base += ` ORDER BY payment_date DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

async function countSupplierPayments({ supplierId, poId } = {}) {
  let base = `SELECT COUNT(*) FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (supplierId) { params.push(supplierId); where.push(`supplier_id = $${params.length}`); }
  if (poId) { params.push(poId); where.push(`po_id = $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  const { rows } = await client.query(base, params);
  return Number(rows[0].count);
}

async function updateSupplierPayment(payment_id, patch) {
  const allowed = ['supplier_id','po_id','amount','payment_method','payment_date','reference_number'];
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of allowed) {
    if (patch[key] !== undefined) { fields.push(`${key} = $${idx}`); params.push(patch[key]); idx++; }
  }
  if (!fields.length) return getSupplierPaymentById(payment_id);
  params.push(payment_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')} WHERE payment_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
}

async function deleteSupplierPayment(payment_id) {
  const q = `DELETE FROM ${TABLE} WHERE payment_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [payment_id]);
  return rows[0] || null;
}

module.exports = {
  createSupplierPayment,
  getSupplierPaymentById,
  listSupplierPayments,
  countSupplierPayments,
  updateSupplierPayment,
  deleteSupplierPayment,
};
