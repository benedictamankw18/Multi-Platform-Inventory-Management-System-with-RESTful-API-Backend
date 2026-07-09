const { v4: uuidv4 } = require('uuid');
const supplierRepo = require('../repositories/supplier.repository');
const auditRepo = require('../repositories/audit.repository');

async function createSupplier({ supplier_name, contact_email, phone, address, createdBy }) {
  const id = uuidv4();
  const created = await supplierRepo.createSupplier({ id, supplier_name, contact_email, phone, address, created_by: createdBy });
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'create_supplier', resource_id: id, meta: { supplier_name }, performed_by: createdBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function getSupplierById(id) {
  return supplierRepo.getSupplierById(id);
}

async function listSuppliers(query) {
  const { q, isActive, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  return supplierRepo.listSuppliers({ q, isActive, limit, offset });
}

async function updateSupplier(id, patch, performedBy) {
  const updated = await supplierRepo.updateSupplier(id, patch);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'update_supplier', resource_id: id, meta: patch, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivateSupplier(id, performedBy) {
  const deactivated = await supplierRepo.deactivateSupplier(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'deactivate_supplier', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

module.exports = {
  createSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
  deactivateSupplier,
};
