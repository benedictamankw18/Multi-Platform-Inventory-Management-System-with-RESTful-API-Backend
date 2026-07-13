const { v4: uuidv4 } = require('uuid');
const purchaseRepo = require('../repositories/purchase.repository');
const auditRepo = require('../repositories/audit.repository');

async function createPurchase({ supplier_id, order_number, order_date, expected_date, status, total_amount, createdBy }) {
  const id = uuidv4();
  const created = await purchaseRepo.createPurchase({ id, supplier_id, order_number, order_date, expected_date, status, total_amount, created_by: createdBy });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'create_purchase', resource_id: id, meta: { order_number, supplier_id }, performed_by: createdBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function getPurchaseById(id) {
  return purchaseRepo.getPurchaseById(id);
}

async function listPurchases(query) {
  const { q, supplierId, status, isActive, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  return purchaseRepo.listPurchases({ q, supplierId, status, isActive, limit, offset });
}

async function updatePurchase(id, patch, performedBy) {
  const updated = await purchaseRepo.updatePurchase(id, patch);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'update_purchase', resource_id: id, meta: patch, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivatePurchase(id, performedBy) {
  const deactivated = await purchaseRepo.deactivatePurchase(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'deactivate_purchase', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

async function reactivatePurchase(id, performedBy) {
  const reactivated = await purchaseRepo.reactivatePurchase(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'reactivate_purchase', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return reactivated;
}

async function submitPurchase(id, performedBy) {
  const updated = await purchaseRepo.updatePurchaseOrder(id, { status: 'SUBMITTED' });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'submit_purchase', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function approvePurchase(id, approverId) {
  const now = new Date();
  const updated = await purchaseRepo.updatePurchaseOrder(id, { status: 'APPROVED', approved_date: now, approved_by: approverId });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'approve_purchase', resource_id: id, performed_by: approverId });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function receivePurchase(id, receiverId) {
  const now = new Date();
  const updated = await purchaseRepo.updatePurchaseOrder(id, { status: 'RECEIVED', received_date: now });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'receive_purchase', resource_id: id, performed_by: receiverId });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

module.exports = {
  createPurchase,
  getPurchaseById,
  listPurchases,
  updatePurchase,
  deactivatePurchase,
};
