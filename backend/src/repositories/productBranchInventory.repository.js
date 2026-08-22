const db = require('../config/db');

const TABLE = 'product_branch_inventory';

exports.createInventoryRecord = async ({ inventory_id, product_id, branch_id, quantity_on_hand = 0, reorder_level = 0, reorder_quantity = 0, reserved_quantity = 0, damaged_quantity = 0, expired_quantity = 0, available_quantity = 0, last_stock_take = null }, txClient = null) => {
  const c = txClient || db;
  const q = `INSERT INTO ${TABLE} (inventory_id, product_id, branch_id, quantity_on_hand, reorder_level, reorder_quantity, reserved_quantity, damaged_quantity, expired_quantity, available_quantity, last_stock_take) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`;
  const params = [inventory_id, product_id, branch_id, quantity_on_hand, reorder_level, reorder_quantity, reserved_quantity, damaged_quantity, expired_quantity, available_quantity, last_stock_take];
  const { rows } = await c.query(q, params);
  return rows[0];
};

exports.getInventoryById = async (inventory_id, txClient = null) => {
  const c = txClient || db;
  const q = `SELECT * FROM ${TABLE} WHERE inventory_id = $1 LIMIT 1`;
  const { rows } = await c.query(q, [inventory_id]);
  return rows[0];
};

exports.getInventoryByProductAndBranch = async (product_id, branch_id, txClient = null) => {
  const c = txClient || db;
  const q = `SELECT * FROM ${TABLE} WHERE product_id = $1 AND branch_id = $2 LIMIT 1`;
  const { rows } = await c.query(q, [product_id, branch_id]);
  return rows[0];
};

exports.listInventoriesByBranch = async (branch_id, { limit = 50, offset = 0 } = {}, txClient = null) => {
  const c = txClient || db;
  const q = `SELECT * FROM ${TABLE} WHERE branch_id = $1 ORDER BY product_id LIMIT $2 OFFSET $3`;
  const { rows } = await c.query(q, [branch_id, limit, offset]);
  return rows;
};

exports.updateInventory = async (inventory_id, patch, txClient = null) => {
  const c = txClient || db;
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return exports.getInventoryById(inventory_id, txClient);
  params.push(inventory_id);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, last_updated = now() WHERE inventory_id = $${idx} RETURNING *`;
  const { rows } = await c.query(q, params);
  return rows[0];
};

exports.deleteInventory = async (inventory_id, txClient = null) => {
  const c = txClient || db;
  const q = `DELETE FROM ${TABLE} WHERE inventory_id = $1 RETURNING *`;
  const { rows } = await c.query(q, [inventory_id]);
  return rows[0];
}