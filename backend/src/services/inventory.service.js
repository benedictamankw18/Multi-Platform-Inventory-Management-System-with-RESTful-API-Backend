const { v4: uuidv4 } = require('uuid');
const inventoryRepo = require('../repositories/inventory.repository');
const auditRepo = require('../repositories/audit.repository');
const productBranchInventoryRepo = require('../repositories/productBranchInventory.repository');

async function createInventory({ product_id, branch_id, supplier_id, uom_id, quantity, cost_price, selling_price, location, createdBy }) {
  const id = uuidv4();
  const created = await inventoryRepo.createInventory({ id, product_id, branch_id, supplier_id, uom_id, quantity, cost_price, selling_price, location, created_by: createdBy });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'create_inventory', resource_id: id, meta: { product_id, branch_id, quantity }, performed_by: createdBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function getInventoryById(id) {
  return inventoryRepo.getInventoryById(id);
}

async function listInventories(query) {
  const { q, productId, supplierId, isActive, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  return inventoryRepo.listInventories({ q, productId, supplierId, isActive, limit, offset });
}

async function updateInventory(id, patch, performedBy) {
  const existing = await inventoryRepo.getInventoryById(id);
  if (!existing) throw new Error('Inventory record not found');
  const updatedFields = { ...existing, ...patch, available_quantity: patch.quantity_on_hand !== undefined ? patch.quantity_on_hand : existing.available_quantity };
  if (updatedFields.quantity_on_hand < 0) throw new Error('Quantity on hand cannot be negative');
  const updated = await inventoryRepo.updateInventory(id, updatedFields);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'update_inventory', resource_id: id, meta: patch, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivateInventory(id, performedBy) {
  const deactivated = await inventoryRepo.deactivateInventory(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'deactivate_inventory', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

async function activateInventory(id, performedBy) {
  const activated = await inventoryRepo.activateInventory(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'activate_inventory', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return activated;
}

async function createTransaction({ product_id, branch_id, quantity, type, reference_type = null, reference_id = null, notes = null, performedBy = null } = {}) {
  // map short types to DB transaction_type
  const typeMap = { in: 'STOCK_IN', out: 'STOCK_OUT', adjustment: 'ADJUSTMENT' };
  const transaction_type = typeMap[type];
  if (!transaction_type) throw new Error('Invalid transaction type');

  // get or create product_branch_inventory record
  let pbi = await productBranchInventoryRepo.getInventoryByProductAndBranch(product_id, branch_id);
  const previous_quantity = pbi ? Number(pbi.quantity_on_hand || 0) : 0;

  //check quantity for stock out
  if (type === 'out' && previous_quantity < Number(quantity)) {
    throw new Error('Insufficient stock for the transaction');
  }

  let new_quantity;
  if (type === 'in') new_quantity = previous_quantity + Number(quantity);
  else if (type === 'out') new_quantity = previous_quantity - Number(quantity);
  else new_quantity = previous_quantity + Number(quantity);

  // create transaction
  const transaction_id = uuidv4();
  const created = await inventoryRepo.createTransaction({ transaction_id, product_id, branch_id, transaction_type, quantity, reference_type, reference_id, performed_by: performedBy, notes, previous_quantity, new_quantity });

  // update or create product branch inventory record
  if (pbi) {
    await productBranchInventoryRepo.updateInventory(pbi.inventory_id, { quantity_on_hand: new_quantity, available_quantity: new_quantity });
  } else {
    // create new inventory record when stocking in, or create with resulting quantity
    const inventory_id = uuidv4();
    await productBranchInventoryRepo.createInventoryRecord({ inventory_id, product_id, branch_id, quantity_on_hand: new_quantity, available_quantity: new_quantity });
  }

  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'inventory_transaction', resource_id: transaction_id, meta: { product_id, branch_id, transaction_type, quantity }, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }

  return created;
}

async function getTransactionById(id) {
  return inventoryRepo.getTransactionById(id);
}

async function listTransactions(query) {
  const { product_id: productId, branch_id: branchId, transaction_type: tType, startDate, endDate, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  // translate short type to DB type if provided
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

