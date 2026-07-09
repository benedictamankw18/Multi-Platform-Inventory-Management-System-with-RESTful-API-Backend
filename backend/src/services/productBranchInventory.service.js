const productBranchInventoryRepo = require('../repositories/productBranchInventory.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');

exports.createInventoryRecord = async (payload = {}, actorId = null) => {
  const { product_id: productId, branch_id: branchId, quantity } = payload;

  if (!productId || !branchId || quantity === undefined || quantity === null) {
    throw new AppError('product_id, branch_id, and quantity are required.', { status: 400 });
  }

  if (Number.isNaN(Number(quantity))) {
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
    quantity_on_hand: Number(quantity),
    available_quantity: Number(quantity),
  });

  await auditRepo.writeLog(actorId, 'CREATE_PRODUCT_BRANCH_INVENTORY', 'PRODUCT_BRANCH_INVENTORY', created.inventory_id, {
    product_id: productId,
    branch_id: branchId,
    quantity: Number(quantity),
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
