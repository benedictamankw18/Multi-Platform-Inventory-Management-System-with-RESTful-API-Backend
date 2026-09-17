const { v4: uuidv4 } = require('uuid');
const inventoryRepo = require('../repositories/inventory.repository');
const auditRepo = require('../repositories/audit.repository');
const productBranchInventoryRepo = require('../repositories/productBranchInventory.repository');
const productRepo = require('../repositories/product.repository');
const branchRepo = require('../repositories/branch.repository');
const notificationService = require('./notification.service');

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

async function createTransaction({ product_id, branch_id, quantity, type, reference_type = null, reference_id = null, notes = null, performedBy = null, unit_cost = null, client = null } = {}) {
  const typeMap = { in: 'STOCK_IN', out: 'STOCK_OUT', adjustment: 'ADJUSTMENT' };
  const transaction_type = typeMap[type];
  if (!transaction_type) throw new Error('Invalid transaction type');

  let pbi = await productBranchInventoryRepo.getInventoryByProductAndBranch(product_id, branch_id, client);
  const previous_quantity = pbi ? Number(pbi.quantity_on_hand || 0) : 0;

  if (type === 'out' && previous_quantity < Number(quantity)) {
    const product = await productRepo.getProductById(product_id);
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

  try {
    await auditRepo.writeLog(performedBy, 'inventory_transaction', 'INVENTORY', transaction_id, { product_id, branch_id, transaction_type, quantity });
  } catch (e) {
    console.error('audit error', e.message);
  }

  if (transaction_type === 'STOCK_IN' || transaction_type === 'STOCK_OUT') {
    try {
      const product = await productRepo.getProductById(product_id);
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
