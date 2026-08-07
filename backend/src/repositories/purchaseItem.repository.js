const client = require('../config/db');

const TABLE = 'purchase_order_items';

async function createPurchaseItem({ po_item_id, po_id, product_id, uom_id, quantity_ordered, quantity_received = 0, unit_cost, line_total, expiry_date = null, batch_number = null, serial_number = null, discount = 0 }) {
  const q = `INSERT INTO ${TABLE} (po_item_id, po_id, product_id, uom_id, quantity_ordered, quantity_received, unit_cost, line_total, expiry_date, batch_number, serial_number, discount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`;
  const values = [
    po_item_id,
    po_id,
    product_id,
    uom_id,
    quantity_ordered,
    quantity_received || 0,
    unit_cost,
    line_total,
    expiry_date || null,
    batch_number || null,
    serial_number || null,
    discount || 0,
  ];
  const { rows } = await client.query(q, values);
  return rows[0];
}

async function getPurchaseItemById(po_item_id) {
  const q = `SELECT * FROM ${TABLE} WHERE po_item_id = $1`;
  const { rows } = await client.query(q, [po_item_id]);
  return rows[0];
}

async function listItemsByPurchase(po_id, { limit = 100, offset = 0 } = {}, txClient = null) {
  const db = txClient || client;
  const q = `SELECT * FROM ${TABLE} WHERE po_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`;
  const { rows } = await db.query(q, [po_id, limit, offset]);
  return rows;
}

async function updatePurchaseItem(po_item_id, patch, txClient = null) {
  const db = txClient || client;
  const allowed = [
    'product_id',
    'uom_id',
    'quantity_ordered',
    'quantity_received',
    'unit_cost',
    'line_total',
    'expiry_date',
    'batch_number',
    'serial_number',
    'discount',
  ];
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
  if (!fields.length) return getPurchaseItemById(po_item_id);
  params.push(po_item_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE po_item_id = $${idx} RETURNING *`;
  const { rows } = await db.query(q, params);
  return rows[0];
}

async function deletePurchaseItem(po_item_id) {
  const q = `DELETE FROM ${TABLE} WHERE po_item_id = $1 RETURNING *`;
  const { rows } = await client.query(q, [po_item_id]);
  return rows[0];
}

module.exports = {
   createPurchaseItem,
  getPurchaseItemById,
  listItemsByPurchase,
  updatePurchaseItem,
  deletePurchaseItem,
};
