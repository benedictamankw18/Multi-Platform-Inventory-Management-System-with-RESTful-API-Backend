const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const purchaseRepo = require('../repositories/purchase.repository');
const purchaseItemRepo = require('../repositories/purchaseItem.repository');
const supplierPaymentRepo = require('../repositories/supplierPayment.repository');
const auditRepo = require('../repositories/audit.repository');
const inventoryService = require('./inventory.service');
const AppError = require('../utils/AppError');

async function createPurchase({ supplier_id, order_number, order_date, branch_id, expected_delivery_date, status, total_amount, createdBy }) {
  const id = uuidv4();
  const created = await purchaseRepo.createPurchaseOrder({ po_id: id, supplier_id, po_number: order_number, branch_id, order_date, expected_delivery_date, status, total_amount, created_by: createdBy });
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const po = await purchaseRepo.getPurchaseOrderById(id, client);
    if (!po) throw new AppError('Purchase order not found.', { status: 404 });

    if (po.status === 'RECEIVED') {
      await client.query('COMMIT');
      return po;
    }

    if (po.status !== 'APPROVED') {
      throw new AppError('Only approved purchase orders can be received.', { status: 409 });
    }

    const items = await purchaseItemRepo.listItemsByPurchase(id, { limit: 10000 }, client);
    const stocked = [];
    for (const item of items) {
      const qty = Number(item.quantity_received > 0 ? item.quantity_received : item.quantity_ordered);
      if (!(qty > 0)) continue;
      await inventoryService.createTransaction({
        product_id: item.product_id,
        branch_id: po.branch_id,
        quantity: qty,
        type: 'in',
        reference_type: 'PURCHASE',
        reference_id: po.po_id,
        unit_cost: item.unit_cost,
        notes: `PO receipt ${po.po_number || id}`,
        performedBy: receiverId,
        client,
      });
      if (Number(item.quantity_received) !== qty) {
        await purchaseItemRepo.updatePurchaseItem(item.po_item_id, { quantity_received: qty }, client);
      }
      stocked.push({ product_id: item.product_id, quantity: qty });
    }

    const updated = await purchaseRepo.updatePurchaseOrder(id, { status: 'RECEIVED', received_date: now }, client);
    await client.query('COMMIT');

    try {
      await auditRepo.writeLog(receiverId, 'receive_purchase', 'PURCHASE', id, { stocked });
    } catch (e) {
      console.error('audit error', e.message);
    }
    return updated;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
}

async function recordPayment(id, { amount, payment_method, payment_date, reference_number }, performedBy) {
  const po = await purchaseRepo.getPurchaseOrderById(id);
  if (!po) throw new Error('Purchase order not found');

  const payment_id = uuidv4();
  const payment = await supplierPaymentRepo.createSupplierPayment({
    payment_id,
    supplier_id: po.supplier_id,
    po_id: id,
    amount,
    payment_method,
    payment_date,
    reference_number,
  });

  const payments = await supplierPaymentRepo.listSupplierPayments({ poId: id, limit: 1000 });
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const paymentStatus = totalPaid >= Number(po.total_amount) ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID';
  await purchaseRepo.updatePurchaseOrder(id, { payment_status: paymentStatus });

  try {
    await auditRepo.writeLog(performedBy, 'record_purchase_payment', 'PURCHASE', id, { amount, payment_id });
  } catch (e) {
    console.error('audit error', e.message);
  }
  return payment;
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
  recordPayment,
};
