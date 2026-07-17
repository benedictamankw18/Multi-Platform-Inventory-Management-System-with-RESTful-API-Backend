const inventoryService = require('../services/inventory.service');

async function createTransaction(req, res, next) {
  try {
    const created = await inventoryService.createTransaction({
      product_id: req.body.product_id,
      branch_id: req.body.branch_id,
      quantity: req.body.quantity,
      type: req.body.type,
      reference_type: req.body.reference_type,
      reference_id: req.body.reference_id,
      notes: req.body.notes,
      performedBy: req.user ? req.user.id : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listTransactions(req, res, next) {
  try {
    const results = await inventoryService.listTransactions(req.query || {});
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function getTransactionById(req, res, next) {
  try {
    const transaction = await inventoryService.getTransactionById(req.params.transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ data: transaction });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTransaction,
  listTransactions,
  getTransactionById,
};
