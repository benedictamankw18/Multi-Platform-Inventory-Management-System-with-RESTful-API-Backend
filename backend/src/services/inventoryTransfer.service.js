const { v4: uuidv4 } = require('uuid');
const transferRepo = require('../repositories/inventoryTransfer.repository');
const auditRepo = require('../repositories/audit.repository');

async function createTransfer({ product_id, from_branch_id, to_branch_id, quantity, transfer_date, notes, createdBy }) {
  const id = uuidv4();
  const created = await transferRepo.createTransfer({ transfer_id: id, product_id, from_branch_id: from_branch_id, to_branch_id: to_branch_id, quantity, requested_at: transfer_date, notes, requested_by: createdBy });
  try {
    await auditRepo.writeLog(createdBy, 'create_inventory_transfer', 'INVENTORY_TRANSFER', id, { product_id, from_branch_id, to_branch_id, quantity });
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function getTransferById(id) {
  return transferRepo.getTransferById(id);
}

async function listTransfers(query) {
  const { q, productId, fromBranchId, toBranchId, isActive, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  return transferRepo.listTransfers({ q, productId, fromBranchId, toBranchId, isActive, limit, offset });
}

async function updateTransfer(id, patch, performedBy) {
  const updated = await transferRepo.updateTransfer(id, patch);
  try {
    await auditRepo.writeLog(performedBy, 'update_inventory_transfer', 'INVENTORY_TRANSFER', id, patch);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivateTransfer(id, performedBy) {
  const deactivated = await transferRepo.deactivateTransfer(id);
  try {
    await auditRepo.writeLog(performedBy, 'deactivate_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

async function activateTransfer(id, performedBy) {
  const activated = await transferRepo.activateTransfer(id);
  try {
    await auditRepo.writeLog(performedBy, 'activate_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return activated;
}

async function approveTransfer(id, performedBy) {
  const approve = await transferRepo.approveTransfer(id, performedBy);
  try {
    await auditRepo.writeLog(performedBy, 'approve_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return approve;
}

async function rejectTransfer(id, performedBy) {
  const reject = await transferRepo.rejectTransfer(id);
  try {
    await auditRepo.writeLog(performedBy, 'reject_inventory_transfer', 'INVENTORY_TRANSFER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return reject;
}

module.exports = {
  createTransfer,
  getTransferById,
  listTransfers,
  updateTransfer,
  deactivateTransfer,
  rejectTransfer,
  approveTransfer,
  activateTransfer,
};
