const productBranchInventoryRepo = require('../repositories/productBranchInventory.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');
const e = require('express');

exports.createInventoryRecord = async (payload = {}, actorId = null) => {
  const { product_id: productId, branch_id: branchId, quantity, quantity_on_hand } = payload;

  if (!productId || !branchId || (quantity === undefined || quantity === null) && (quantity_on_hand === undefined || quantity_on_hand === null)) {
    throw new AppError('product_id, branch_id, and quantity are required.', { status: 400 });
  }

  const qty = quantity !== undefined ? Number(quantity) : Number(quantity_on_hand);
  if (Number.isNaN(qty)) {
    throw new AppError('quantity must be a number.', { status: 400 });
  }

  const existing = await productBranchInventoryRepo.getInventoryByProductAndBranch(productId, branchId);
  if (existing) {
    throw new AppError('Inventory record already exists for this product and branch.', { status: 409 });
  }

  const inventoryId = payload.inventory_id || uuidv4();
  const created = await productBranchInventoryRepo.createInventoryRecord({
    inventory_id: inventoryId,
    product_id: productId,
    branch_id: branchId,
    quantity_on_hand: qty,
    available_quantity: payload.available_quantity !== undefined ? Number(payload.available_quantity) : qty,
    reorder_level: payload.reorder_level !== undefined ? Number(payload.reorder_level) : 0,
    reorder_quantity: payload.reorder_quantity !== undefined ? Number(payload.reorder_quantity) : 0,
    reserved_quantity: payload.reserved_quantity !== undefined ? Number(payload.reserved_quantity) : 0,
    damaged_quantity: payload.damaged_quantity !== undefined ? Number(payload.damaged_quantity) : 0,
    expired_quantity: payload.expired_quantity !== undefined ? Number(payload.expired_quantity) : 0,
  });

  await auditRepo.writeLog(actorId, 'CREATE_PRODUCT_BRANCH_INVENTORY', 'PRODUCT_BRANCH_INVENTORY', created.inventory_id, {
    product_id: productId,
    branch_id: branchId,
    quantity: qty,
  });

  return created;
};

exports.listInventoryRecords = async (filters = {}) => {
  const { branch_id: branchId, limit, page } = filters;

  if (!branchId) {
    throw new AppError('branch_id is required to list branch inventory.', { status: 400 });
  }

  const safeLimit = Math.min(Number(limit) || 50, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const items = await productBranchInventoryRepo.listInventoriesByBranch(branchId, { limit: safeLimit, offset });
  return { items, pagination: { page: safePage, limit: safeLimit } };
};

exports.updateInventoryRecord = async (inventoryId, payload ={}, actorId = null) => {
const { product_id: productId, branch_id: branchId, quantity, quantity_on_hand } = payload;

const existing = await productBranchInventoryRepo.getInventoryById(inventoryId);

if (!existing) {
  throw new AppError('Inventory record not found.', { status: 404 });
}

  const qty = quantity !== undefined ? Number(quantity) : (quantity_on_hand !== undefined ? Number(quantity_on_hand) : undefined);
  if (qty !== undefined && Number.isNaN(qty)) {
    throw new AppError('quantity must be a number.', { status: 400 });
  }

  const updated = await productBranchInventoryRepo.updateInventory(inventoryId, {
    product_id: productId || existing.product_id,
    branch_id: branchId || existing.branch_id,
    quantity_on_hand: qty !== undefined ? qty : existing.quantity_on_hand,
    available_quantity: payload.available_quantity !== undefined ? Number(payload.available_quantity) : (qty !== undefined ? qty : existing.available_quantity),
    reorder_level: payload.reorder_level !== undefined ? Number(payload.reorder_level) : existing.reorder_level,
    reorder_quantity: payload.reorder_quantity !== undefined ? Number(payload.reorder_quantity) : existing.reorder_quantity,
    reserved_quantity: payload.reserved_quantity !== undefined ? Number(payload.reserved_quantity) : existing.reserved_quantity,
    damaged_quantity: payload.damaged_quantity !== undefined ? Number(payload.damaged_quantity) : existing.damaged_quantity,
    expired_quantity: payload.expired_quantity !== undefined ? Number(payload.expired_quantity) : existing.expired_quantity,
  });

  await auditRepo.writeLog(actorId, 'UPDATE_PRODUCT_BRANCH_INVENTORY', 'PRODUCT_BRANCH_INVENTORY', updated.inventory_id, {
    product_id: productId,
    branch_id: branchId,
    quantity: qty,
  });

  return updated;
};

exports.getInventoryById = async (inventoryId) => {
  if (!inventoryId) {
    throw new AppError('inventory_id is required to fetch inventory record.', { status: 400 });
  }
  const inventory = await productBranchInventoryRepo.getInventoryById(inventoryId);
  if (!inventory) {
    throw new AppError('Inventory record not found.', { status: 404 });
  }
  return inventory;
};

exports.getInventoryByProductAndBranch = async (productId, branchId) => {
  if (!productId || !branchId) {
    throw new AppError('product_id and branch_id are required to fetch inventory record.', { status: 400 });
  }
  const inventory = await productBranchInventoryRepo.getInventoryByProductAndBranch(productId, branchId);
  if (!inventory) {
    throw new AppError('Inventory record not found.', { status: 404 });
  }
  return inventory;
};

exports.deleteInventoryRecord = async (inventoryId, actorId = null) => {
  if (!inventoryId) {
    throw new AppError('inventory_id is required to delete inventory record.', { status: 400 });
  }
  const deleted = await productBranchInventoryRepo.deleteInventory(inventoryId);
  if (!deleted) {
    throw new AppError('Inventory record not found.', { status: 404 });
  }
  return deleted;
};