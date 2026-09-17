const db = require('../config/db');

const TABLE = 'customer_payments';

exports.createCustomerPayment = async ({ payment_id, customer_id = null, sale_id = null, amount = null, payment_method = null, payment_date = null }, client = db) => {
  const q = `INSERT INTO ${TABLE} (payment_id, customer_id, sale_id, amount, payment_method, payment_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
  const params = [payment_id, customer_id || null, sale_id || null, amount || null, payment_method || null, payment_date || null];
  const { rows } = await client.query(q, params);
  return rows[0];
};

exports.getCustomerPaymentById = async (payment_id, client = db) => {
  const q = `SELECT * FROM ${TABLE} WHERE payment_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [payment_id]);
  return rows[0];
};

exports.listCustomerPayments = async ({ customerId, saleId, limit = 50, offset = 0 } = {}, client = db) => {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (customerId) { params.push(customerId); where.push(`customer_id = $${params.length}`); }
  if (saleId) { params.push(saleId); where.push(`sale_id = $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY payment_date DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
};

exports.updateCustomerPayment = async (payment_id, patch, client = db) => {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return exports.getCustomerPaymentById(payment_id, client);
  params.push(payment_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE payment_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
};

exports.deleteCustomerPayment = async (payment_id, client = db) => {
  const q = `DELETE FROM ${TABLE} WHERE payment_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [payment_id]);
  return rows[0];
};
