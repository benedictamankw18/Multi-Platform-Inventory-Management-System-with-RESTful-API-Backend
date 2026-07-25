const { v4: uuidv4 } = require('uuid');
const purchaseRepo = require('../repositories/purchase.repository');
const auditRepo = require('../repositories/audit.repository');

async function createPurchase({ supplier_id, order_number, order_date, branch_id, expected_date, status, total_amount, createdBy }) {
  const id = uuidv4();
  const created = await purchaseRepo.createPurchaseOrder({ po_id: id, supplier_id, po_number: order_number, branch_id, order_date, expected_date, status, total_amount, created_by: createdBy });
  try {
    await auditRepo.writeLog(createdBy, 'create_purchase', 'PURCHASE', id, { order_number, supplier_id });
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function getPurchaseById(id) {
  return purchaseRepo.getPurchaseOrderById(id);
}

async function listPurchases(query) {
  const { q, supplierId, status, isActive, branchId, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  return purchaseRepo.listPurchaseOrders({ q, supplierId, status, isActive, branchId, limit, offset });
}

async function updatePurchase(id, patch, performedBy) {
  const updated = await purchaseRepo.updatePurchaseOrder(id, patch);
  try {
    await auditRepo.writeLog(performedBy, 'update_purchase', 'PURCHASE', id, patch);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivatePurchase(id, performedBy) {
  const deactivated = await purchaseRepo.deactivatePurchaseOrder(id);
  try {
    await auditRepo.writeLog(performedBy, 'deactivate_purchase', 'PURCHASE', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

async function reactivatePurchase(id, performedBy) {
  const reactivated = await purchaseRepo.reactivatePurchaseOrder(id);
  try {
    await auditRepo.writeLog(performedBy, 'reactivate_purchase', 'PURCHASE', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return reactivated;
}

async function submitPurchase(id, performedBy) {
  const updated = await purchaseRepo.updatePurchaseOrder(id, { status: 'SUBMITTED' });
  try {
    await auditRepo.writeLog(performedBy, 'submit_purchase', 'PURCHASE', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function approvePurchase(id, approverId) {
  const now = new Date();
  const updated = await purchaseRepo.updatePurchaseOrder(id, { status: 'APPROVED', approved_date: now, approved_by: approverId });
  try {
    await auditRepo.writeLog(approverId, 'approve_purchase', 'PURCHASE', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function receivePurchase(id, receiverId) {
  const now = new Date();
  const updated = await purchaseRepo.updatePurchaseOrder(id, { status: 'RECEIVED', received_date: now });
  try {
    await auditRepo.writeLog(receiverId, 'receive_purchase', 'PURCHASE', id);
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
  reactivatePurchase,
  submitPurchase,
  approvePurchase,
  receivePurchase,
};
