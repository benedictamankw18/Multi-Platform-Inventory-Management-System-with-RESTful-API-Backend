const transferService = require('../services/inventoryTransfer.service');

async function createTransfer(req, res, next) {
  try {
    const created = await transferService.createTransfer({
      product_id: req.body.product_id,
      from_branch_id: req.body.from_branch_id,
      to_branch_id: req.body.to_branch_id,
      quantity: req.body.quantity,
      transfer_date: req.body.transfer_date,
      notes: req.body.notes,
      createdBy: req.user ? req.user.sub : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listTransfers(req, res, next) {
  try {
    const result = await transferService.listTransfers(req.body || req.query);
    res.json({ data: result.items, total: result.total });
  } catch (err) {
    next(err);
  }
}

async function getTransferById(req, res, next) {
  try {
    const transfer = await transferService.getTransferById(req.params.transferId);
    if (!transfer) return res.status(404).json({ message: 'Inventory transfer not found.' });
    res.json({ data: transfer });
  } catch (err) {
    next(err);
  }
}

async function updateTransfer(req, res, next) {
  try {
    const id = req.params.transferId;
    const patch = req.body;
    const updated = await transferService.updateTransfer(id, patch, req.user ? req.user.sub : null);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function deactivateTransfer(req, res, next) {
  try {
    const id = req.params.transferId;
    const deactivated = await transferService.deactivateTransfer(id, req.user ? req.user.sub : null);
    res.json({ data: deactivated });
  } catch (err) {
    next(err);
  }
}

async function activateTransfer(req, res, next) {
  try {
    const id = req.params.transferId;
    const activated = await transferService.activateTransfer(id, req.user ? req.user.sub : null);
    res.json({ data: activated });
  } catch (err) {
    next(err);
  }
}

async function approveTransfer(req, res, next) {
  try {
    const id = req.params.transferId;
    const userBranchId = req.user ? (req.user.branch_id || req.user.branchId) : null;
    const approve = await transferService.approveTransfer(id, req.user ? req.user.sub : null, userBranchId);
    res.json({ data: approve });
  } catch (err) {
    next(err);
  }
}

async function shipTransfer(req, res, next) {
  try {
    const id = req.params.transferId;
    const userBranchId = req.user ? (req.user.branch_id || req.user.branchId) : null;
    const shipped = await transferService.shipTransfer(id, req.user ? req.user.sub : null, userBranchId);
    res.json({ data: shipped });
  } catch (err) {
    next(err);
  }
}

async function receiveTransfer(req, res, next) {
  try {
    const id = req.params.transferId;
    const userBranchId = req.user ? (req.user.branch_id || req.user.branchId) : null;
    const received = await transferService.receiveTransfer(id, req.user ? req.user.sub : null, userBranchId);
    res.json({ data: received });
  } catch (err) {
    next(err);
  }
}

async function rejectTransfer(req, res, next) {
  try {
    const id = req.params.transferId;
    const reject = await transferService.rejectTransfer(id, req.user ? req.user.sub : null);
    res.json({ data: reject });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTransfer,
  listTransfers,
  getTransferById,
  updateTransfer,
  deactivateTransfer,
  activateTransfer,
  rejectTransfer,
  approveTransfer,
  shipTransfer,
  receiveTransfer,
};
