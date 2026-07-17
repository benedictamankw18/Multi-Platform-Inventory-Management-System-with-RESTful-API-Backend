const productBranchInventoryService = require('../services/productBranchInventory.service');

function handleError(res, err) {
  console.error('[productBranchInventory.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

exports.createInventoryRecord = async (req, res) => {
  try {
    const actorId = req.user && req.user.sub;
    const created = await productBranchInventoryService.createInventoryRecord(req.body, actorId);
    return res.status(201).json({ inventory: created });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.listInventoryRecords = async (req, res) => {
  try {
    const result = await productBranchInventoryService.listInventoryRecords(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateInventoryRecord = async (req, res) => {
  try {
    const actorId = req.user && req.user.sub;
    const updated = await productBranchInventoryService.updateInventoryRecord(req.params.inventory_id, req.body, actorId);
    return res.status(200).json({ inventory: updated });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getInventoryById = async (req, res) => {
  try {
    const { inventory_id: inventoryId } = req.params;
    const inventory = await productBranchInventoryService.getInventoryById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory record not found.' });
    }
    return res.status(200).json({ inventory });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getInventoryByProductAndBranch = async (req, res) => {
  try {
    const { product_id: productId, branch_id: branchId } = req.params;
    const inventory = await productBranchInventoryService.getInventoryByProductAndBranch(productId, branchId);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory record not found for the specified product and branch.' });
    }
    return res.status(200).json({ inventory });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deleteInventoryRecord = async (req, res) => {
  try {
    const { inventory_id: inventoryId } = req.params;
    const actorId = req.user && req.user.sub;
    const deleted = await productBranchInventoryService.deleteInventoryRecord(inventoryId, actorId);
    if (!deleted) {
      return res.status(404).json({ message: 'Inventory record not found.' });
    }
    return res.status(200).json({ inventory: deleted });
  } catch (err) {
    return handleError(res, err);
  }
};
