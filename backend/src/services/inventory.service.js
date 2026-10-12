const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const inventoryRepo = require('../repositories/inventory.repository');
const auditRepo = require('../repositories/audit.repository');
const productBranchInventoryRepo = require('../repositories/productBranchInventory.repository');
const productRepo = require('../repositories/product.repository');
const branchRepo = require('../repositories/branch.repository');
const notificationService = require('./notification.service');
const productBatchService = require('./productBatch.service');

async function createInventory({ product_id, branch_id, supplier_id, uom_id, quantity, cost_price, selling_price, location, createdBy }) {
  const id = uuidv4();
  const created = await inventoryRepo.createInventory({ id, product_id, branch_id, supplier_id, uom_id, quantity, cost_price, selling_price, location, created_by: createdBy });
  try {
    await auditRepo.writeLog(createdBy, 'create_inventory', 'INVENTORY', id, { product_id, branch_id, quantity });
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function getInventoryById(id) {
  return inventoryRepo.getInventoryById(id);
}

async function listInventories(query) {
  const { q, productId, supplierId, isActive, branchId, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  const filters = { q, productId, supplierId, isActive, branchId };
  const [items, total] = await Promise.all([
    inventoryRepo.listInventories({ ...filters, limit, offset }),
    inventoryRepo.countInventories(filters),
  ]);
  return { items, total };
}

async function updateInventory(id, patch, performedBy) {
  const existing = await inventoryRepo.getInventoryById(id);
  if (!existing) throw new Error('Inventory record not found');
  const updatedFields = { ...existing, ...patch, available_quantity: patch.quantity_on_hand !== undefined ? patch.quantity_on_hand : existing.available_quantity };
  if (updatedFields.quantity_on_hand < 0) throw new Error('Quantity on hand cannot be negative');
  const updated = await inventoryRepo.updateInventory(id, updatedFields);
  try {
    await auditRepo.writeLog(performedBy, 'update_inventory', 'INVENTORY', id, patch);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivateInventory(id, performedBy) {
  const deactivated = await inventoryRepo.deactivateInventory(id);
  try {
    await auditRepo.writeLog(performedBy, 'deactivate_inventory', 'INVENTORY', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

async function activateInventory(id, performedBy) {
  const activated = await inventoryRepo.activateInventory(id);
  try {
    await auditRepo.writeLog(performedBy, 'activate_inventory', 'INVENTORY', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return activated;
}

/**
 * Public entry point. When the caller already owns a transaction it passes
 * `client`; otherwise this opens its own so the transaction row, the aggregate
 * inventory row, and the batch ledger all commit or roll back together.
 */
async function createTransaction(params = {}) {
  const { client = null } = params;
  if (client) return applyTransaction(client, params);

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    const result = await applyTransaction(conn, params);
    await conn.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await conn.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore rollback errors
    }
    throw err;
  } finally {
    conn.release();
  }
}

async function applyTransaction(client, { product_id, branch_id, quantity, type, reference_type = null, reference_id = null, notes = null, performedBy = null, unit_cost = null, batch_number = null, expiry_date = null, batch_id = null } = {}) {
  const typeMap = { in: 'STOCK_IN', out: 'STOCK_OUT', adjustment: 'ADJUSTMENT' };
  const transaction_type = typeMap[type];
  if (!transaction_type) throw new Error('Invalid transaction type');

  const product = await productRepo.getProductById(product_id);

  let pbi = await productBranchInventoryRepo.getInventoryByProductAndBranch(product_id, branch_id, client, { forUpdate: true });
  const previous_quantity = pbi ? Number(pbi.quantity_on_hand || 0) : 0;

  if (type === 'out' && previous_quantity < Number(quantity)) {
    const name = product ? product.product_name : product_id;
    throw new Error(`Insufficient stock for "${name}".`);
  }

  let new_quantity;
  if (type === 'in') new_quantity = previous_quantity + Number(quantity);
  else if (type === 'out') new_quantity = previous_quantity - Number(quantity);
  else new_quantity = previous_quantity + Number(quantity);

  const transaction_id = uuidv4();
  const created = await inventoryRepo.createTransaction({ transaction_id, product_id, branch_id, transaction_type, quantity, reference_type, reference_id, performed_by: performedBy, notes, previous_quantity, new_quantity, unit_cost }, client);

  if (pbi) {
    await productBranchInventoryRepo.updateInventory(pbi.inventory_id, { quantity_on_hand: new_quantity, available_quantity: new_quantity }, client);
  } else {
    const inventory_id = uuidv4();
    await productBranchInventoryRepo.createInventoryRecord({ inventory_id, product_id, branch_id, quantity_on_hand: new_quantity, available_quantity: new_quantity }, client);
  }

  // Batch ledger for every product — same transaction as the aggregate so the
  // two can never drift apart on this code path. Expiry-tracked products still
  // must supply a lot date on stock-in (enforced by addStockToBatch). A signed
  // adjustment that reduces stock is treated like a stock-out (FEFO).
  if (product) {
    const numericQuantity = Number(quantity);
    const isDecrement = transaction_type === 'STOCK_OUT'
      || (transaction_type === 'ADJUSTMENT' && numericQuantity < 0);

    if (isDecrement) {
      await productBatchService.allocateFefo(client, {
        product,
        branch_id,
        quantity: Math.abs(numericQuantity),
        batch_id,
      });
    } else {
      await productBatchService.addStockToBatch(client, {
        product,
        branch_id,
        batch_number,
        expiry_date,
        quantity: numericQuantity,
        cost_price: unit_cost != null ? unit_cost : product.cost_price,
        supplier_id: product.supplier_id || null,
        po_id: reference_type === 'PURCHASE' ? reference_id : null,
        createdBy: performedBy,
      });
    }
  }

  try {
    await auditRepo.writeLog(performedBy, 'inventory_transaction', 'INVENTORY', transaction_id, { product_id, branch_id, transaction_type, quantity });
  } catch (e) {
    console.error('audit error', e.message);
  }

  if (transaction_type === 'STOCK_IN' || transaction_type === 'STOCK_OUT') {
    try {
      const threshold = pbi && pbi.reorder_level > 0 ? Number(pbi.reorder_level) : (product ? Number(product.minimum_stock) : 0);
      if (threshold > 0 && new_quantity <= threshold) {
        const branch = await branchRepo.getBranchById(branch_id);
        if (branch) {
          await notificationService.createLowStockNotification({ product, branch, newQuantity: new_quantity, performedBy, threshold });
        }
      }
    } catch (e) {
      console.error('low-stock notification error', e.message);
    }
  }

  return created;
}

async function getTransactionById(id) {
  return inventoryRepo.getTransactionById(id);
}

async function listTransactions(query) {
  const { product_id: productId, branch_id: branchId, transaction_type: tType, startDate, endDate, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  const typeMap = { in: 'STOCK_IN', out: 'STOCK_OUT', adjustment: 'ADJUSTMENT' };
  const transactionType = tType ? (typeMap[tType] || typeMap[tType]) : undefined;
  return inventoryRepo.listTransactions({ productId, branchId, transactionType, startDate, endDate, limit, offset });
}

module.exports = {
  createInventory,
  getInventoryById,
  listInventories,
  updateInventory,
  deactivateInventory,
  activateInventory,
  createTransaction,
  getTransactionById,
  listTransactions,
};
