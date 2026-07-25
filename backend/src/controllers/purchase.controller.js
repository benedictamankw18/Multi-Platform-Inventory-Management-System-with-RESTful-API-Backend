const purchaseService = require('../services/purchase.service');

async function createPurchase(req, res, next) {
  try {
    const created = await purchaseService.createPurchase({
      supplier_id: req.body.supplier_id,
      order_number: req.body.po_number,
      order_date: req.body.order_date,
      branch_id: req.body.branch_id,
      expected_date: req.body.expected_date,
      status: req.body.status,
      total_amount: req.body.total_amount,
      createdBy: req.user ? req.user.sub : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listPurchases(req, res, next) {
  try {
    const { branchId, ...rest } = req.body || req.query;
    const resolvedBranchId = branchId || (req.user && (req.user.branch_id || req.user.branchId)) || undefined;
    const results = await purchaseService.listPurchases({ ...rest, branchId: resolvedBranchId });
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function getPurchaseById(req, res, next) {
  try {
    const purchase = await purchaseService.getPurchaseById(req.params.purchaseId);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found.' });
    res.json({ data: purchase });
  } catch (err) {
    next(err);
  }
}

async function updatePurchase(req, res, next) {
  try {
    const id = req.params.purchaseId;
    const patch = req.body;
    const updated = await purchaseService.updatePurchase(id, patch, req.user ? req.user.id : null);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function deactivatePurchase(req, res, next) {
  try {
    const id = req.params.purchaseId;
    const deactivated = await purchaseService.deactivatePurchase(id, req.user ? req.user.id : null);
    res.json({ data: deactivated });
  } catch (err) {
    next(err);
  }
}


async function reactivatePurchase(req, res, next) {
  try {
    const id = req.params.purchaseId;
    const reactivated = await purchaseService.reactivatePurchase(id, req.user ? req.user.id : null);
    res.json({ data: reactivated });
  } catch (err) {
    next(err);
  }
}

async function submitPurchase(req, res, next) {
  try {
    const id = req.params.purchaseId;
    const result = await purchaseService.submitPurchase(id, req.user ? req.user.id : null);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function approvePurchase(req, res, next) {
  try {
    const id = req.params.purchaseId;
    const result = await purchaseService.approvePurchase(id, req.user ? req.user.id : null);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function receivePurchase(req, res, next) {
  try {
    const id = req.params.purchaseId;
    const result = await purchaseService.receivePurchase(id, req.user ? req.user.id : null);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPurchase,
  listPurchases,
  getPurchaseById,
  updatePurchase,
  deactivatePurchase,
  submitPurchase,
  approvePurchase,
  receivePurchase,
  reactivatePurchase,
};
