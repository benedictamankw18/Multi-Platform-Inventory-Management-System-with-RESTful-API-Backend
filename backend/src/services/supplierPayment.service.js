const { v4: uuidv4 } = require('uuid');
const supplierPaymentRepo = require('../repositories/supplierPayment.repository');
const supplierRepo = require('../repositories/supplier.repository');
const auditRepo = require('../repositories/audit.repository');

async function createPayment({ supplier_id, amount, payment_date = null, payment_method = null, reference_number = null, po_id = null, createdBy = null } = {}) {
  const supplier = await supplierRepo.getSupplierById(supplier_id);
  if (!supplier) throw new Error('Supplier not found');

  const payment_id = uuidv4();
  const created = await supplierPaymentRepo.createSupplierPayment({ payment_id, supplier_id, po_id, amount, payment_method, payment_date, reference_number });
  try {
    await auditRepo.writeLog(createdBy, 'create_supplier_payment', 'SUPPLIER_PAYMENT', payment_id, { supplier_id, amount });
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function listPaymentsBySupplier(supplierId, { limit = 50, offset = 0 } = {}) {
  return supplierPaymentRepo.listSupplierPayments({ supplierId, limit, offset });
}

async function getPaymentById(payment_id) {
  return supplierPaymentRepo.getSupplierPaymentById(payment_id);
}

async function updatePayment(payment_id, patch) {
  const updated = await supplierPaymentRepo.updateSupplierPayment(payment_id, patch);
  return updated;
}

async function deletePayment(payment_id) {
  const deleted = await supplierPaymentRepo.deleteSupplierPayment(payment_id);
  return deleted;
}

module.exports = {
  createPayment,
  listPaymentsBySupplier,
  getPaymentById,
  updatePayment,
  deletePayment,
};
