const { v4: uuidv4 } = require('uuid');
const supplierPaymentRepo = require('../repositories/supplierPayment.repository');
const supplierRepo = require('../repositories/supplier.repository');
const auditRepo = require('../repositories/audit.repository');

async function createPayment({ supplier_id, amount, payment_date = null, payment_method = null, reference_number = null, po_id = null, createdBy = null } = {}) {
  // verify supplier exists
  const supplier = await supplierRepo.getSupplierById(supplier_id);
  if (!supplier) throw new Error('Supplier not found');

  const payment_id = uuidv4();
  const created = await supplierPaymentRepo.createSupplierPayment({ payment_id, supplier_id, po_id, amount, payment_method, payment_date, reference_number });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'create_supplier_payment', resource_id: payment_id, meta: { supplier_id, amount }, performed_by: createdBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function listPaymentsBySupplier(supplierId, { limit = 50, offset = 0 } = {}) {
  return supplierPaymentRepo.listSupplierPayments({ supplierId, limit, offset });
}

module.exports = {
  createPayment,
  listPaymentsBySupplier,
};
