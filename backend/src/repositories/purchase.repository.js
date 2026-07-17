const client = require('../config/db');

const TABLE = 'purchase_orders';

async function createPurchaseOrder({ po_id, supplier_id, branch_id, created_by = null, order_date = null, expected_delivery_date = null, status = 'DRAFT', total_amount = 0, notes = null, po_number = null, approved_date = null, approved_by = null, received_date = null, payment_status = 'UNPAID', shipping_cost = 0, tax_amount = 0, discount_amount = 0 }) {
  const q = `INSERT INTO ${TABLE} (po_id, supplier_id, branch_id, created_by, order_date, expected_delivery_date, status, total_amount, notes, po_number, approved_date, approved_by, received_date, payment_status, shipping_cost, tax_amount, discount_amount) VALUES ($1,$2,$3,$4,COALESCE($5,now()),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`;
  const values = [
    po_id,
    supplier_id || null,
    branch_id || null,
    created_by || null,
    order_date || null,
    expected_delivery_date || null,
    status || 'DRAFT',
    total_amount || 0,
    notes || null,
    po_number || null,
    approved_date || null,
    approved_by || null,
    received_date || null,
    payment_status || 'UNPAID',
    shipping_cost || 0,
    tax_amount || 0,
    discount_amount || 0,
  ];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getPurchaseOrderById(po_id) {
  const q = `SELECT * FROM ${TABLE} WHERE po_id = $1`;
  const { rows } = await client.query(q, [po_id]);
  return rows[0];
}

async function listPurchaseOrders({ q: search, supplierId, status, branchId, limit = 25, offset = 0 }) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`po_number ILIKE $${params.length}`);
  }
  if (supplierId) {
    params.push(supplierId);
    where.push(`supplier_id = $${params.length}`);
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
  base += ` ORDER BY order_date DESC NULLS LAST LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

async function updatePurchaseOrder(po_id, patch) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return getPurchaseOrderById(po_id);
  params.push(po_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')} WHERE po_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0];
}

async function deletePurchaseOrder(po_id) {
  const q = `DELETE FROM ${TABLE} WHERE po_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [po_id]);
  return rows[0];
}

async function deactivatePurchaseOrder(po_id) {
  const q = `UPDATE ${TABLE} SET is_active = false WHERE po_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [po_id]);
  return rows[0];
}

async function reactivatePurchaseOrder(po_id) {
  const q = `UPDATE ${TABLE} SET is_active = true WHERE po_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [po_id]);
  return rows[0];
}

module.exports = {
  createPurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  updatePurchaseOrder,
  deletePurchaseOrder,
  deactivatePurchaseOrder,
  reactivatePurchaseOrder,
};
