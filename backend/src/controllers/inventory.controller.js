const inventoryService = require('../services/inventory.service');

async function createInventory(req, res, next) {
  try {
    const created = await inventoryService.createInventory({
      product_id: req.body.product_id,
      branch_id: req.body.branch_id,
      supplier_id: req.body.supplier_id,
      uom_id: req.body.uom_id,
      quantity: req.body.quantity_on_hand,
      cost_price: req.body.cost_price,
      selling_price: req.body.selling_price,
      location: req.body.location,
      createdBy: req.user ? req.user.sub : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listInventories(req, res, next) {
  try {
    const src = req.body || req.query;
    // Accept both snake_case and camelCase filter keys from clients.
    const explicitBranchId = src.branchId || src.branch_id;
    const resolvedBranchId = explicitBranchId || (req.user && (req.user.branch_id || req.user.branchId)) || undefined;
    const { q, isActive, page, limit } = src;
    const productId = src.productId || src.product_id;
    const supplierId = src.supplierId || src.supplier_id;
    const { items, total } = await inventoryService.listInventories({ q, productId, supplierId, isActive, branchId: resolvedBranchId, page, limit });
    res.json({ data: items, total });
  } catch (err) {
    next(err);
  }
}

async function getInventoryById(req, res, next) {
  try {
    const inventory = await inventoryService.getInventoryById(req.params.inventoryId);
    if (!inventory) return res.status(404).json({ message: 'Inventory record not found.' });
    res.json({ data: inventory });
  } catch (err) {
    next(err);
  }
}

async function updateInventory(req, res, next) {
  try {
    const id = req.params.inventoryId;
    const patch = req.body;
    const updated = await inventoryService.updateInventory(id, patch, req.user ? req.user.sub : null);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function deactivateInventory(req, res, next) {
  try {
    const id = req.params.inventoryId;
    const deactivated = await inventoryService.deactivateInventory(id, req.user ? req.user.sub : null);
    res.json({ data: deactivated });
  } catch (err) {
    next(err);
  }
}

async function activateInventory(req, res, next) {
  try {
    const id = req.params.inventoryId;
    const activated = await inventoryService.activateInventory(id, req.user ? req.user.sub : null);
    res.json({ data: activated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createInventory,
  listInventories,
  getInventoryById,
  updateInventory,
  activateInventory,
  deactivateInventory,
};
