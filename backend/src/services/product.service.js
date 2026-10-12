/**
 * product.service.js
 *
 * Business logic for products. Uses product.repository for SQL and audit.repository
 * for audit logging.
 */

const productRepo = require('../repositories/product.repository');
const productBranchInventoryRepo = require('../repositories/productBranchInventory.repository');
const productBatchRepo = require('../repositories/productBatch.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const priceHistoryService = require('./priceHistory.service');
const productBatchService = require('./productBatch.service');

function toNumber(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

// Random 13-char uppercase alphanumeric code (CODE128-friendly).
function generateBarcode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 13; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function resolveBarcode(barcode) {
  if (barcode) {
    const dup = await productRepo.getProductByBarcode(barcode);
    if (dup) {
      throw new AppError('A product with this barcode already exists.', { status: 409 });
    }
    return barcode;
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateBarcode();
    const dup = await productRepo.getProductByBarcode(code);
    if (!dup) return code;
  }
  throw new AppError('Could not generate a unique barcode.', { status: 500 });
}

async function upsertBranchInventory(client, productId, payload) {
  const branchId = payload.branch_id;
  if (!branchId) return null;

  const qty = toNumber(payload.quantity ?? payload.quantity_on_hand, 0);
  const existing = await productBranchInventoryRepo.getInventoryByProductAndBranch(productId, branchId, client);
  if (existing) {
    return productBranchInventoryRepo.updateInventory(existing.inventory_id, {
      quantity_on_hand: qty,
      available_quantity: toNumber(payload.available_quantity, qty),
      reorder_level: toNumber(payload.reorder_level, 0),
      reorder_quantity: toNumber(payload.reorder_quantity, 0),
      reserved_quantity: toNumber(payload.reserved_quantity, 0),
      damaged_quantity: toNumber(payload.damaged_quantity, 0),
      expired_quantity: toNumber(payload.expired_quantity, 0),
    }, client);
  }
  return productBranchInventoryRepo.createInventoryRecord({
    inventory_id: uuidv4(),
    product_id: productId,
    branch_id: branchId,
    quantity_on_hand: qty,
    available_quantity: toNumber(payload.available_quantity, qty),
    reorder_level: toNumber(payload.reorder_level, 0),
    reorder_quantity: toNumber(payload.reorder_quantity, 0),
    reserved_quantity: toNumber(payload.reserved_quantity, 0),
    damaged_quantity: toNumber(payload.damaged_quantity, 0),
    expired_quantity: toNumber(payload.expired_quantity, 0),
  }, client);
}

/**
 * When a product is switched to expiry-tracked, any stock recorded while it was
 * untracked has no batch row. The batch ledger invariant
 *   SUM(product_batches.quantity_on_hand WHERE status IN ('ACTIVE','EXPIRED'))
 *     = product_branch_inventory.quantity_on_hand
 * would therefore be broken (FEFO and the expiry report would ignore that stock).
 * Fill the uncovered difference for each branch with a sentinel (never-expiring)
 * batch, mirroring the sentinel fill already used by allocateFefo.
 */
async function backfillSentinelBatches(client, product, actorId) {
  const inventories = await productBranchInventoryRepo.listInventoriesByProduct(product.product_id, client);
  for (const inv of inventories) {
    const aggregate = toNumber(inv.quantity_on_hand, 0);
    if (aggregate <= 0) continue;

    const covered = await productBatchRepo.sumOnHand(product.product_id, inv.branch_id, client);
    const gap = aggregate - covered;
    if (gap <= 0) continue;

    await productBatchRepo.addStock(
      {
        product_id: product.product_id,
        branch_id: inv.branch_id,
        batch_number: null,
        expiry_date: null,
        quantity: gap,
        cost_price: product.cost_price,
        created_by: actorId,
      },
      client,
    );
  }
}

exports.createProduct = async (payload, actorId = null) => {
  // Basic required fields
  const {
    sku,
    barcode,
    product_name: productName,
    base_uom_id: baseUomId,
  } = payload;

  if (!sku || !productName || !baseUomId) {
    throw new AppError('sku, product_name and base_uom_id are required.', { status: 400 });
  }

  // Ensure SKU uniqueness
  const existing = await productRepo.getProductBySku(sku);
  if (existing) {
    throw new AppError('A product with this SKU already exists.', { status: 409 });
  }

  // Auto-generate a unique barcode when omitted; otherwise enforce uniqueness.
  const resolvedBarcode = await resolveBarcode(barcode);

  const productId = uuidv4();

  let created;
  if (payload.branch_id) {
    // Product + branch inventory in one transaction so an offline replay that
    // carries branch inventory never leaves an orphan product behind.
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      created = await productRepo.createProduct({ productId, sku, productName, baseUomId, ...payload, barcode: resolvedBarcode }, client);
      await upsertBranchInventory(client, created.product_id, payload);
      await productBatchService.reconcileBatchLedger(client, { product: created, branch_id: payload.branch_id });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    created = await productRepo.createProduct({ productId, sku, productName, baseUomId, ...payload, barcode: resolvedBarcode });
  }

  // Audit log (fire-and-forget is acceptable)
  await auditRepo.writeLog(actorId, 'CREATE_PRODUCT', 'PRODUCT', created.product_id, { sku: created.sku, name: created.product_name });

  return created;
};

exports.getProductById = async (productId) => {
  const p = await productRepo.getProductById(productId);
  if (!p) throw new AppError('Product not found.', { status: 404 });
  return p;
};

exports.listProducts = async (filters = {}) => {
  const { branch_id: branchId, ...rest } = filters;
  const products = await productRepo.getAllProducts({ ...rest, branchId });
  const total = await productRepo.countProducts({ ...rest, branchId });
  return { products, total };
};

exports.updateProduct = async (productId, fields, actorId = null) => {
  const existing = await productRepo.getProductById(productId);
  if (!existing) throw new AppError('Product not found.', { status: 404 });

  // Prevent SKU collision
  if (fields.sku && fields.sku !== existing.sku) {
    const dup = await productRepo.getProductBySku(fields.sku);
    if (dup) throw new AppError('Another product already uses this SKU.', { status: 409 });
  }

  // Prevent barcode collision
  if (fields.barcode && fields.barcode !== existing.barcode) {
    const dup = await productRepo.getProductByBarcode(fields.barcode);
    if (dup) throw new AppError('Another product already uses this barcode.', { status: 409 });
  }

  // Flipping expiry tracking on must also seed the batch ledger so the
  // aggregate and ledger stay in sync. Run the product update, the optional
  // branch-inventory upsert and the sentinel backfill in one transaction.
  const toggledExpiryOn =
    !existing.expiry_required &&
    (fields.expiry_required === true || fields.expiry_required === 'true');

  let updated;
  if (toggledExpiryOn) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      updated = await productRepo.updateProduct(productId, fields, client);
      if (fields.branch_id) {
        await upsertBranchInventory(client, productId, fields);
      }
      await backfillSentinelBatches(client, updated, actorId);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    if (fields.branch_id) {
      // Direct branch-inventory edit: keep the batch ledger in step with the
      // new aggregate in the same transaction.
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        updated = await productRepo.updateProduct(productId, fields, client);
        await upsertBranchInventory(client, productId, fields);
        await productBatchService.reconcileBatchLedger(client, { product: updated, branch_id: fields.branch_id });
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      updated = await productRepo.updateProduct(productId, fields);
    }
  }
  await auditRepo.writeLog(actorId, 'UPDATE_PRODUCT', 'PRODUCT', productId, fields);

  const priceFields = {
    retail_price: 'RETAIL',
    cost_price: 'COST',
    wholesale_price: 'WHOLESALE',
  };
  for (const [field, priceType] of Object.entries(priceFields)) {
    if (field in fields && Number(fields[field]) !== Number(existing[field] || 0)) {
      const oldVal = existing[field] != null ? Number(existing[field]) : null;
      const newVal = Number(fields[field]);
      priceHistoryService.createPriceHistory({
        product_id: productId,
        old_price: oldVal,
        price: newVal,
        changed_by: actorId,
        price_type: priceType,
        source: 'MANUAL',
      }).catch((e) => console.error('price history error', e.message));
    }
  }

  return updated;
};

exports.deactivateProduct = async (productId, actorId = null) => {
  const existing = await productRepo.getProductById(productId);
  if (!existing) throw new AppError('Product not found.', { status: 404 });
  if (!existing.is_active) return { alreadyInState: true, product: existing };

  const deactivated = await productRepo.deactivateProduct(productId);
  await auditRepo.writeLog(actorId, 'DEACTIVATE_PRODUCT', 'PRODUCT', productId, null);
  return { alreadyInState: false, product: deactivated };
};


exports.activateProduct = async (productId, actorId = null) => {
  const existing = await productRepo.getProductById(productId);
  if (!existing) throw new AppError('Product not found.', { status: 404 });
  if (existing.is_active) return { alreadyInState: true, product: existing };

  const activated = await productRepo.activateProduct(productId);
  await auditRepo.writeLog(actorId, 'REACTIVATE_PRODUCT', 'PRODUCT', productId, null);
  return { alreadyInState: false, product: activated };
};
