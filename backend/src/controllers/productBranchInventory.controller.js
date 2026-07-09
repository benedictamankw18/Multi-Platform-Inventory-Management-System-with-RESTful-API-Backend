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
    const result = await productBranchInventoryService.listInventoryRecords(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};
