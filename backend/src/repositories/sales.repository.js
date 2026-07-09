const client = require('../config/db');

const TABLE = 'sales';
const ITEMS_TABLE = 'sale_items';

async function createSale({ sale_id, branch_id, customer_id = null, cashier_id = null, sale_type = 'RETAIL', sale_date = null, subtotal = 0, discount_amount = 0, tax_amount = 0, total_amount = 0, amount_paid = 0, balance_due = 0, status = 'COMPLETED', local_transaction_id = null, synced = true, invoice_number = null, cashier_name = null, customer_name = null, remarks = null, device_id = null, payment_status = 'PAID', due_date = null, created_offline = false } = {}) {
  const q = `
    INSERT INTO ${TABLE} (sale_id, branch_id, customer_id, cashier_id, sale_type, sale_date, subtotal, discount_amount, tax_amount, total_amount, amount_paid, balance_due, status, local_transaction_id, synced, invoice_number, cashier_name, customer_name, remarks, device_id, payment_status, due_date, created_offline)
    VALUES ($1,$2,$3,$4,$5,COALESCE($6, now()),$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    RETURNING *`;
  const values = [sale_id || null, branch_id, customer_id, cashier_id, sale_type, sale_date, subtotal, discount_amount, tax_amount, total_amount, amount_paid, balance_due, status, local_transaction_id, synced, invoice_number, cashier_name, customer_name, remarks, device_id, payment_status, due_date, created_offline];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function createSaleItems(items = [], saleId) {
  if (!items || !items.length) return [];
  const placeholders = [];
  const values = [];
  let idx = 1;
  for (const it of items) {
    placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    values.push(it.sale_item_id || null, saleId, it.product_id, it.uom_id || null, it.quantity, it.unit_price || null, it.line_discount || 0, it.line_total || 0, it.cost_price || null, it.tax_amount || 0, it.batch_number || null, it.expiry_date || null);
  }
  const q = `INSERT INTO ${ITEMS_TABLE} (sale_item_id, sale_id, product_id, uom_id, quantity, unit_price, line_discount, line_total, cost_price, tax_amount, batch_number, expiry_date) VALUES ${placeholders.join(', ')} RETURNING *`;
  const { rows } = await client.query(q, values);
  return rows;
}

async function getSaleById(saleId) {
  const saleQ = `SELECT * FROM ${TABLE} WHERE sale_id = $1 LIMIT 1`;
  const itemsQ = `SELECT * FROM ${ITEMS_TABLE} WHERE sale_id = $1 ORDER BY created_at`;
  const { rows: saleRows } = await client.query(saleQ, [saleId]);
  if (!saleRows.length) return null;
  const sale = saleRows[0];
  const { rows: items } = await client.query(itemsQ, [saleId]);
  sale.items = items;
  return sale;
}

async function listSales({ q: search, customerId, status, branchId, limit = 25, offset = 0 } = {}) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`invoice_number ILIKE $${params.length} OR cashier_name ILIKE $${params.length} OR customer_name ILIKE $${params.length}`);
  }
  if (customerId) {
    params.push(customerId);
    where.push(`customer_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (branchId) {
    params.push(branchId);
    where.push(`branch_id = $${params.length}`);
  }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY sale_date DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

async function updateSale(saleId, patch) {
  const allowed = ['branch_id','customer_id','cashier_id','sale_type','sale_date','subtotal','discount_amount','tax_amount','total_amount','amount_paid','balance_due','status','local_transaction_id','synced','invoice_number','cashier_name','customer_name','remarks','device_id','payment_status','due_date','created_offline'];
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
  if (!fields.length) return getSaleById(saleId);
  params.push(saleId);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE sale_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
}

async function voidSale(saleId) {
  const q = `UPDATE ${TABLE} SET status = 'VOID', updated_at = now() WHERE sale_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [saleId]);
  return rows[0];
}

module.exports = {
  createSale,
  createSaleItems,
  getSaleById,
  listSales,
  updateSale,
  voidSale,
};
