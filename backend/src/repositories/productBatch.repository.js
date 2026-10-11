/**
 * productBatch.repository.js
 *
 * Data-access for the per-batch inventory ledger (`product_batches`) and the
 * sale-line allocation detail (`sale_item_batches`). Every function accepts an
 * optional transaction client so callers can keep the batch ledger, the
 * `product_branch_inventory` aggregate, and `inventory_transactions` in one
 * transaction.
 *
 * The merge key matches the partial unique index `uq_product_batches_active`
 * exactly, including the COALESCE wrapping, or ON CONFLICT inference fails.
 */

const db = require('../config/db');

const TABLE = 'product_batches';
const SALE_ITEM_BATCH_TABLE = 'sale_item_batches';

// Must match uq_product_batches_active (see migrations/001).
const MERGE_CONFLICT = `(
  product_id,
  branch_id,
  COALESCE(batch_number, ''),
  COALESCE(expiry_date, DATE '9999-12-31')
) WHERE status = 'ACTIVE'`;

/**
 * Add (or merge) stock into the ACTIVE batch matching the merge key. `expiry_date`
 * NULL is stored as the sentinel DATE '9999-12-31' (never expires / unknown lot).
 * On merge the batch cost becomes the weighted average of the old and new stock.
 */
async function addStock(
  {
    product_id,
    branch_id,
    batch_number = null,
    expiry_date = null,
    quantity,
    cost_price = null,
    supplier_id = null,
    po_id = null,
    received_date = null,
    created_by = null,
  },
  txClient = null,
) {
  const c = txClient || db;
  const q = `
    INSERT INTO ${TABLE}
      (product_id, branch_id, supplier_id, po_id, batch_number, expiry_date,
       received_date, cost_price, quantity_received, quantity_on_hand, status, created_by)
    VALUES
      ($1, $2, $3, $4, $5, COALESCE($6, DATE '9999-12-31'),
       COALESCE($7, current_date), $8, $9, $9, 'ACTIVE', $10)
    ON CONFLICT ${MERGE_CONFLICT}
    DO UPDATE SET
      quantity_on_hand = product_batches.quantity_on_hand + EXCLUDED.quantity_on_hand,
      quantity_received = product_batches.quantity_received + EXCLUDED.quantity_received,
      supplier_id = COALESCE(EXCLUDED.supplier_id, product_batches.supplier_id),
      po_id = COALESCE(EXCLUDED.po_id, product_batches.po_id),
      cost_price = CASE
        WHEN (product_batches.quantity_on_hand + EXCLUDED.quantity_on_hand) = 0
          THEN EXCLUDED.cost_price
        ELSE (
          COALESCE(product_batches.cost_price, EXCLUDED.cost_price, 0) * product_batches.quantity_on_hand
          + COALESCE(EXCLUDED.cost_price, product_batches.cost_price, 0) * EXCLUDED.quantity_on_hand
        ) / (product_batches.quantity_on_hand + EXCLUDED.quantity_on_hand)
      END,
      updated_at = now()
    RETURNING *`;
  const params = [
    product_id, branch_id, supplier_id, po_id, batch_number,
    expiry_date, received_date, cost_price, quantity, created_by,
  ];
  const { rows } = await c.query(q, params);
  return rows[0];
}

async function getBatchById(batch_id, txClient = null) {
  const c = txClient || db;
  const q = `SELECT * FROM ${TABLE} WHERE batch_id = $1 LIMIT 1`;
  const { rows } = await c.query(q, [batch_id]);
  return rows[0] || null;
}

async function listBatches(
  { productId, branchId, status, expiringWithinDays, includeEmpty = false, page = 1, limit = 25 } = {},
  txClient = null,
) {
  const c = txClient || db;
  const params = [];
  const where = [];

  if (productId) where.push(`b.product_id = $${params.push(productId)}`);
  if (branchId) where.push(`b.branch_id = $${params.push(branchId)}`);
  if (status) where.push(`b.status = $${params.push(status)}`);
  if (!includeEmpty) where.push(`b.quantity_on_hand > 0`);
  if (expiringWithinDays != null && expiringWithinDays !== '') {
    const d = params.push(Number(expiringWithinDays));
    where.push(`b.expiry_date >= current_date AND b.expiry_date <= current_date + $${d}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const q = `
    SELECT
      b.*,
      p.product_name,
      p.sku,
      br.branch_name,
      (b.expiry_date - current_date) AS days_to_expiry
    FROM ${TABLE} b
    LEFT JOIN products p ON p.product_id = b.product_id
    LEFT JOIN branches br ON br.branch_id = b.branch_id
    ${whereSql}
    ORDER BY b.expiry_date ASC NULLS LAST, b.created_at DESC
    LIMIT $${params.push(Number(limit))} OFFSET $${params.push(offset)}`;

  const { rows } = await c.query(q, params);
  return rows;
}

async function countBatches({ productId, branchId, status, expiringWithinDays, includeEmpty = false } = {}, txClient = null) {
  const c = txClient || db;
  const params = [];
  const where = [];
  if (productId) where.push(`product_id = $${params.push(productId)}`);
  if (branchId) where.push(`branch_id = $${params.push(branchId)}`);
  if (status) where.push(`status = $${params.push(status)}`);
  if (!includeEmpty) where.push(`quantity_on_hand > 0`);
  if (expiringWithinDays != null && expiringWithinDays !== '') {
    const d = params.push(Number(expiringWithinDays));
    where.push(`expiry_date >= current_date AND expiry_date <= current_date + $${d}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await c.query(`SELECT COUNT(*) AS count FROM ${TABLE} ${whereSql}`, params);
  return Number(rows[0].count);
}

async function listByProductAndBranch(product_id, branch_id, txClient = null) {
  const c = txClient || db;
  const q = `
    SELECT * FROM ${TABLE}
    WHERE product_id = $1 AND branch_id = $2
    ORDER BY expiry_date ASC NULLS LAST, created_at ASC`;
  const { rows } = await c.query(q, [product_id, branch_id]);
  return rows;
}

/**
 * Lock the ACTIVE, in-stock batches for a product/branch in FEFO order
 * (earliest expiry first, sentinel last, tie-broken by batch_id). FOR UPDATE
 * serialises concurrent stock-outs so two allocations cannot take the same unit.
 */
async function listFefoForUpdate(product_id, branch_id, txClient = null) {
  const c = txClient || db;
  const q = `
    SELECT * FROM ${TABLE}
    WHERE product_id = $1 AND branch_id = $2
      AND status = 'ACTIVE' AND quantity_on_hand > 0
    ORDER BY expiry_date ASC NULLS LAST, batch_id ASC
    FOR UPDATE`;
  const { rows } = await c.query(q, [product_id, branch_id]);
  return rows;
}

/** Reduce a batch's on-hand quantity; mark DEPLETED when it reaches zero. */
async function decrementBatch(batch_id, quantity, txClient = null) {
  const c = txClient || db;
  const q = `
    UPDATE ${TABLE}
    SET quantity_on_hand = GREATEST(quantity_on_hand - $2, 0),
        status = CASE WHEN (quantity_on_hand - $2) <= 0 THEN 'DEPLETED' ELSE status END,
        updated_at = now()
    WHERE batch_id = $1
    RETURNING *`;
  const { rows } = await c.query(q, [batch_id, quantity]);
  return rows[0] || null;
}

/** Add stock back to a batch (sale void/refund restore); reactivates it. */
async function incrementBatch(batch_id, quantity, txClient = null) {
  const c = txClient || db;
  const q = `
    UPDATE ${TABLE}
    SET quantity_on_hand = quantity_on_hand + $2,
        status = 'ACTIVE',
        updated_at = now()
    WHERE batch_id = $1
    RETURNING *`;
  const { rows } = await c.query(q, [batch_id, quantity]);
  return rows[0] || null;
}

/**
 * Find the ACTIVE batch matching a lot identity (manual sale override). The
 * merge-key comparisons mirror the partial unique index (COALESCE wrapping). */
async function findActiveBatch(product_id, branch_id, batch_number, expiry_date = null, txClient = null) {
  const c = txClient || db;
  const q = `
    SELECT * FROM ${TABLE}
    WHERE product_id = $1 AND branch_id = $2
      AND COALESCE(batch_number, '') = COALESCE($3, '')
      AND COALESCE(expiry_date, DATE '9999-12-31') = COALESCE($4, DATE '9999-12-31')
      AND status = 'ACTIVE'
    LIMIT 1`;
  const { rows } = await c.query(q, [product_id, branch_id, batch_number, expiry_date]);
  return rows[0] || null;
}

async function setStatus(batch_id, status, txClient = null) {
  const c = txClient || db;
  const q = `UPDATE ${TABLE} SET status = $2, updated_at = now() WHERE batch_id = $1 RETURNING *`;
  const { rows } = await c.query(q, [batch_id, status]);
  return rows[0] || null;
}

async function sumOnHand(product_id, branch_id, txClient = null) {
  const c = txClient || db;
  const q = `
    SELECT COALESCE(SUM(quantity_on_hand), 0) AS total
    FROM ${TABLE}
    WHERE product_id = $1 AND branch_id = $2 AND status IN ('ACTIVE', 'EXPIRED')`;
  const { rows } = await c.query(q, [product_id, branch_id]);
  return Number(rows[0].total);
}

async function recordSaleItemBatch({ sale_item_id, batch_id, quantity, cost_price = null }, txClient = null) {
  const c = txClient || db;
  const q = `
    INSERT INTO ${SALE_ITEM_BATCH_TABLE} (sale_item_id, batch_id, quantity, cost_price)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (sale_item_id, batch_id)
    DO UPDATE SET quantity = ${SALE_ITEM_BATCH_TABLE}.quantity + EXCLUDED.quantity
    RETURNING *`;
  const { rows } = await c.query(q, [sale_item_id, batch_id, quantity, cost_price]);
  return rows[0];
}

async function listSaleItemBatches(sale_item_id, txClient = null) {
  const c = txClient || db;
  const q = `SELECT * FROM ${SALE_ITEM_BATCH_TABLE} WHERE sale_item_id = $1`;
  const { rows } = await c.query(q, [sale_item_id]);
  return rows;
}

module.exports = {
  addStock,
  getBatchById,
  listBatches,
  countBatches,
  listByProductAndBranch,
  listFefoForUpdate,
  decrementBatch,
  incrementBatch,
  findActiveBatch,
  setStatus,
  sumOnHand,
  recordSaleItemBatch,
  listSaleItemBatches,
};
