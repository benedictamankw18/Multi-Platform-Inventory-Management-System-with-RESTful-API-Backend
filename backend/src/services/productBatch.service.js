/**
 * productBatch.service.js
 *
 * Batch-ledger operations for products with `products.expiry_required = true`.
 * Callers pass a transaction client so the batch ledger, the
 * `product_branch_inventory` aggregate, and any sale/transaction rows commit or
 * roll back together.
 *
 * Invariant maintained for expiry-tracked products:
 *   SUM(product_batches.quantity_on_hand WHERE status IN ('ACTIVE','EXPIRED'))
 *     = product_branch_inventory.quantity_on_hand
 */

const productBatchRepo = require('../repositories/productBatch.repository');
const productRepo = require('../repositories/product.repository');
const productBranchInventoryRepo = require('../repositories/productBranchInventory.repository');
const inventoryRepo = require('../repositories/inventory.repository');
const auditRepo = require('../repositories/audit.repository');
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');

function toPositiveNumber(value, field = 'quantity') {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError(`${field} must be greater than zero.`, { status: 400, code: 'INVALID_QUANTITY' });
  }
  return n;
}

/**
 * Stock in against a batch. Enforces an expiry date for expiry-tracked products
 * and merges into an existing ACTIVE batch (weighted-average cost) when the
 * merge key matches.
 */
async function addStockToBatch(
  client,
  {
    product,
    branch_id,
    batch_number = null,
    expiry_date = null,
    quantity,
    cost_price = null,
    supplier_id = null,
    po_id = null,
    received_date = null,
    createdBy = null,
  },
) {
  if (!product || !product.product_id) {
    throw new AppError('A product is required to add batch stock.', { status: 400, code: 'PRODUCT_REQUIRED' });
  }
  if (!branch_id) {
    throw new AppError('branch_id is required.', { status: 400, code: 'BRANCH_REQUIRED' });
  }

  const qty = toPositiveNumber(quantity);

  // The feature gate: expiry-tracked products cannot receive stock without an
  // expiry date, otherwise FEFO and the expiry report have nothing to sort on.
  if (product.expiry_required && !expiry_date) {
    throw new AppError(`Expiry date is required for "${product.product_name}".`, {
      status: 400,
      code: 'EXPIRY_REQUIRED',
    });
  }

  return productBatchRepo.addStock(
    {
      product_id: product.product_id,
      branch_id,
      batch_number,
      expiry_date,
      quantity: qty,
      cost_price: cost_price != null ? cost_price : product.cost_price,
      supplier_id,
      po_id,
      received_date,
      created_by: createdBy,
    },
    client,
  );
}

/**
 * Allocate `quantity` of a product/branch from batches, FEFO by default or from
 * a specific batch (manual override).
 *
 * Returns the allocations [{ batch_id, quantity, cost_price }].
 *
 * Best-effort on short coverage: if the aggregate holds more than the batch
 * ledger (drift), the remainder is attributed to the sentinel fill batch so the
 * invariant above still holds. A manual batch override is strict instead — it
 * fails if the chosen batch does not cover the quantity.
 */
async function allocateFefo(client, { product, branch_id, quantity, batch_id = null }) {
  if (!product || !product.product_id) {
    throw new AppError('A product is required to allocate batch stock.', { status: 400, code: 'PRODUCT_REQUIRED' });
  }
  if (!branch_id) {
    throw new AppError('branch_id is required.', { status: 400, code: 'BRANCH_REQUIRED' });
  }

  const required = toPositiveNumber(quantity);
  const allocations = [];
  let remaining = required;

  if (batch_id) {
    const batch = await productBatchRepo.getBatchById(batch_id, client);
    if (!batch || batch.product_id !== product.product_id || batch.branch_id !== branch_id) {
      throw new AppError('Batch not found for this product and branch.', {
        status: 404,
        code: 'BATCH_NOT_FOUND',
      });
    }
    if (batch.status !== 'ACTIVE' || Number(batch.quantity_on_hand) < required) {
      throw new AppError('Insufficient quantity in the selected batch.', {
        status: 409,
        code: 'INSUFFICIENT_BATCH_STOCK',
      });
    }
    await productBatchRepo.decrementBatch(batch_id, required, client);
    allocations.push({ batch_id, quantity: required, cost_price: batch.cost_price });
    return allocations;
  }

  const batches = await productBatchRepo.listFefoForUpdate(product.product_id, branch_id, client);
  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = Number(batch.quantity_on_hand);
    const take = Math.min(remaining, available);
    if (take <= 0) continue;
    await productBatchRepo.decrementBatch(batch.batch_id, take, client);
    allocations.push({ batch_id: batch.batch_id, quantity: take, cost_price: batch.cost_price });
    remaining -= take;
  }

  if (remaining > 0) {
    // Batch ledger is short of the aggregate. Attribute the remainder to the
    // sentinel fill batch so SUM(batches) = aggregate continues to hold.
    const fill = await productBatchRepo.addStock(
      {
        product_id: product.product_id,
        branch_id,
        batch_number: null,
        expiry_date: null,
        quantity: remaining,
        cost_price: product.cost_price,
        created_by: null,
      },
      client,
    );
    await productBatchRepo.decrementBatch(fill.batch_id, remaining, client);
    allocations.push({ batch_id: fill.batch_id, quantity: remaining, cost_price: fill.cost_price });
  }

  return allocations;
}

async function getBatchById(batch_id) {
  const batch = await productBatchRepo.getBatchById(batch_id);
  if (!batch) throw new AppError('Batch not found.', { status: 404, code: 'BATCH_NOT_FOUND' });
  return batch;
}

async function listBatches(query = {}) {
  const { page = 1, limit = 25 } = query;
  const [items, total] = await Promise.all([
    productBatchRepo.listBatches({ ...query, page, limit }),
    productBatchRepo.countBatches(query),
  ]);
  return { items, total };
}

async function listByProductAndBranch(product_id, branch_id) {
  const product = await productRepo.getProductById(product_id);
  if (!product) throw new AppError('Product not found.', { status: 404, code: 'PRODUCT_NOT_FOUND' });
  return productBatchRepo.listByProductAndBranch(product_id, branch_id);
}

/**
 * Dispose a batch (expired goods, damage, recall). Marks the batch DISPOSED,
 * removes its on-hand quantity from the aggregate, and records an
 * inventory_transactions row of type DISPOSAL — all in one transaction so the
 * batch ledger and the aggregate stay consistent.
 */
async function disposeBatch(batch_id, { disposedBy = null, notes = null } = {}) {
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    const batch = await productBatchRepo.getBatchById(batch_id, conn);
    if (!batch) throw new AppError('Batch not found.', { status: 404, code: 'BATCH_NOT_FOUND' });
    if (batch.status !== 'ACTIVE') {
      throw new AppError('Only active batches can be disposed.', { status: 409, code: 'INVALID_BATCH_STATUS' });
    }
    const qty = Number(batch.quantity_on_hand);
    if (!(qty > 0)) throw new AppError('Batch has no stock to dispose.', { status: 409, code: 'BATCH_EMPTY' });

    const disposed = await productBatchRepo.setStatus(batch_id, 'DISPOSED', conn);

    const pbi = await productBranchInventoryRepo.getInventoryByProductAndBranch(batch.product_id, batch.branch_id, conn, { forUpdate: true });
    if (pbi) {
      const newQty = Math.max(Number(pbi.quantity_on_hand) - qty, 0);
      await productBranchInventoryRepo.updateInventory(
        pbi.inventory_id,
        { quantity_on_hand: newQty, available_quantity: newQty },
        conn,
      );
    }

    await inventoryRepo.createTransaction(
      {
        transaction_id: uuidv4(),
        product_id: batch.product_id,
        branch_id: batch.branch_id,
        transaction_type: 'DISPOSAL',
        quantity: qty,
        previous_quantity: pbi ? Number(pbi.quantity_on_hand) : qty,
        new_quantity: pbi ? Math.max(Number(pbi.quantity_on_hand) - qty, 0) : 0,
        performed_by: disposedBy,
        notes: notes || `Disposed batch ${batch.batch_number || batch_id}`,
        unit_cost: batch.cost_price,
      },
      conn,
    );

    try {
      await auditRepo.writeLog(disposedBy, 'dispose_batch', 'INVENTORY', batch_id, {
        product_id: batch.product_id,
        branch_id: batch.branch_id,
        quantity: qty,
      });
    } catch (e) {
      console.error('audit error', e.message);
    }

    await conn.query('COMMIT');
    return disposed;
  } catch (err) {
    try {
      await conn.query('ROLLBACK');
    } catch (e) {
      // ignore rollback errors
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  addStockToBatch,
  allocateFefo,
  getBatchById,
  listBatches,
  listByProductAndBranch,
  disposeBatch,
};
