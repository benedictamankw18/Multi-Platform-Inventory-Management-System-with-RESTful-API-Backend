const client = require('../config/db');

const TRAN_TABLE = 'inventory_transactions';
const TRANSFERS_TABLE = 'inventory_transfers';

const ALLOWED_TRAN_FIELDS = new Set([
  'transaction_type','quantity','reference_type','reference_id','performed_by',
  'notes','previous_quantity','new_quantity','unit_cost','transaction_reference','device_id','updated_at'
]);

// Create a transaction matching the DB schema
async function createTransaction({ transaction_id, product_id, branch_id, transaction_type, quantity, reference_type = null, reference_id = null, performed_by = null, notes = null, previous_quantity = null, new_quantity = null, unit_cost = null, transaction_reference = null, device_id = null }, txClient = null) {
  const db = txClient || client;
  const q = `INSERT INTO ${TRAN_TABLE} (transaction_id, product_id, branch_id, transaction_type, quantity, reference_type, reference_id, performed_by, notes, previous_quantity, new_quantity, unit_cost, transaction_reference, device_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`;
  const values = [transaction_id, product_id, branch_id, transaction_type, quantity, reference_type, reference_id, performed_by, notes, previous_quantity, new_quantity, unit_cost, transaction_reference, device_id];
  const { rows } = await db.query(q, values);
  return rows[0];
}

async function getTransactionById(id) {
  const q = `SELECT * FROM ${TRAN_TABLE} WHERE transaction_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

async function listTransactions({ search, productId, branchId, transactionType, referenceType, startDate, endDate, limit = 25, offset = 0 }) {
  let base = `SELECT it.*, p.product_name, p.sku, b.branch_name FROM ${TRAN_TABLE} it
              left join products p on p.product_id = it.product_id
              left join branches b on b.branch_id = it.branch_id`;
  const params = [];
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`it.notes ILIKE $${params.length}`);
  }
  if (productId) { params.push(productId); where.push(`it.product_id = $${params.length}`); }
  if (branchId) { params.push(branchId); where.push(`it.branch_id = $${params.length}`); }
  if (transactionType) { params.push(transactionType); where.push(`it.transaction_type = $${params.length}`); }
  if (referenceType) { params.push(referenceType); where.push(`it.reference_type = $${params.length}`); }
  if (startDate) { params.push(startDate); where.push(`it.created_at >= $${params.length}`); }
  if (endDate) { params.push(endDate); where.push(`it.created_at <= $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY it.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

async function updateTransaction(id, patch) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of Object.keys(patch)) {
    if (!ALLOWED_TRAN_FIELDS.has(key)) continue;
    fields.push(`${key} = $${idx}`);
    params.push(patch[key]);
    idx++;
  }
  if (!fields.length) return getTransactionById(id);
  params.push(id);
  const q = `UPDATE ${TRAN_TABLE} SET ${fields.join(', ')} WHERE transaction_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, params);
  return rows[0] || null;
}

async function createInventory({ id, product_id, branch_id, uom_id, quantity, created_by = null }) {
  const q = `
    INSERT INTO product_branch_inventory (
      inventory_id, product_id, branch_id, quantity_on_hand, available_quantity, reorder_level, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [id, product_id, branch_id, quantity, quantity, 0, created_by];
  const { rows } = await client.query(q, values);
  return rows[0] || null;
}

async function getInventoryById(id) {
  const q = `SELECT * FROM product_branch_inventory WHERE inventory_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

async function updateInventory(id, patch = {}) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx += 1;
  }

  if (!fields.length) return getInventoryById(id);

  fields.push('updated_at = now()');
  values.push(id);
  const q = `UPDATE product_branch_inventory SET ${fields.join(', ')} WHERE inventory_id = $${idx} RETURNING *`;
  const { rows } = await client.query(q, values);
  return rows[0] || null;
}

async function deactivateInventory(id) {
  return updateInventory(id, { is_active: false });
}

async function activateInventory(id) {
  return updateInventory(id, { is_active: true });
}

// Inventory transfers helpers
async function createTransfer({ transfer_id, product_id, from_branch_id, to_branch_id, quantity, status = 'PENDING', requested_by = null, approved_by = null, notes = null, transfer_number = null }) {
  const q = `INSERT INTO ${TRANSFERS_TABLE} (transfer_id, product_id, from_branch_id, to_branch_id, quantity, status, requested_by, approved_by, notes, transfer_number) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
  const values = [transfer_id, product_id, from_branch_id, to_branch_id, quantity, status, requested_by, approved_by, notes, transfer_number];
  const { rows } = await client.query(q, values);
  return rows[0] || null;
}

async function getTransferById(id) {
  const q = `SELECT * FROM ${TRANSFERS_TABLE} WHERE transfer_id = $1 LIMIT 1`;
  const { rows } = await client.query(q, [id]);
  return rows[0] || null;
}

async function listTransfers({ productId, fromBranchId, toBranchId, status, startDate, endDate, limit = 25, offset = 0 }) {
  let base = `SELECT * FROM ${TRANSFERS_TABLE}`;
  const params = [];
  const where = [];
  if (productId) { params.push(productId); where.push(`product_id = $${params.length}`); }
  if (fromBranchId) { params.push(fromBranchId); where.push(`from_branch_id = $${params.length}`); }
  if (toBranchId) { params.push(toBranchId); where.push(`to_branch_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (startDate) { params.push(startDate); where.push(`requested_at >= $${params.length}`); }
  if (endDate) { params.push(endDate); where.push(`requested_at <= $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit);
  params.push(offset);
  base += ` ORDER BY requested_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await client.query(base, params);
  return rows;
}

function buildInventoryWhere({ q, productId, supplierId, isActive } = {}) {
  const params = [];
  const where = [];

  if (q) {
    params.push(`%${q}%`);
    where.push(`(p.product_name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`);
  }

  if (productId) {
    params.push(productId);
    where.push(`pbi.product_id = $${params.length}`);
  }

  if (supplierId) {
    params.push(supplierId);
    where.push(`pbi.product_id IN (SELECT product_id FROM products WHERE supplier_id = $${params.length})`);
  }

  if (isActive === 'true' || isActive === true) {
    where.push('pbi.available_quantity > 0');
  } else if (isActive === 'false' || isActive === false) {
    where.push('pbi.available_quantity <= 0');
  }

  return { where, params };
}

async function listInventories({ q, productId, supplierId, isActive, branchId, limit = 25, offset = 0 } = {}) {
  const { where, params } = buildInventoryWhere({ q, productId, supplierId, isActive });

  if (branchId) {
    params.push(branchId);
    where.push(`pbi.branch_id = $${params.length}`);
  }

  let query = `
    SELECT pbi.*,
      p.sku, p.product_name, p.brand,
      b.branch_name,
      (SELECT pi.image_url FROM product_images pi
       WHERE pi.product_id = pbi.product_id AND pi.is_primary = true
       LIMIT 1) AS primary_image_url
    FROM product_branch_inventory pbi
    INNER JOIN products p ON p.product_id = pbi.product_id
    LEFT JOIN branches b ON b.branch_id = pbi.branch_id
  `;

  if (where.length) {
    query += ` WHERE ${where.join(' AND ')}`;
  }

  params.push(limit, offset);
  query += ` ORDER BY p.product_name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await client.query(query, params);
  return rows;
}

async function countInventories({ q, productId, supplierId, isActive, branchId } = {}) {
  const { where, params } = buildInventoryWhere({ q, productId, supplierId, isActive });

  if (branchId) {
    params.push(branchId);
    where.push(`pbi.branch_id = $${params.length}`);
  }

  let query = `
    SELECT COUNT(*)
    FROM product_branch_inventory pbi
    INNER JOIN products p ON p.product_id = pbi.product_id
  `;

  if (where.length) {
    query += ` WHERE ${where.join(' AND ')}`;
  }

  const { rows } = await client.query(query, params);
  return Number(rows[0].count);
}

module.exports = {
  createInventory,
  getInventoryById,
  updateInventory,
  deactivateInventory,
  activateInventory,
  createTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
  createTransfer,
  getTransferById,
  listTransfers,
  listInventories,
  countInventories,
};
