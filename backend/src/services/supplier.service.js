const { v4: uuidv4 } = require('uuid');
const supplierRepo = require('../repositories/supplier.repository');
const auditRepo = require('../repositories/audit.repository');

async function createSupplier({ supplier_name, contact_email, contact_name, phone, email, address, company_registration_no, tax_number, website, bank_name, account_name, account_number, payment_terms, is_active, createdBy }) {
  const id = uuidv4();
  const created = await supplierRepo.createSupplier({ supplier_id: id, supplier_name, email: contact_email, contact_name: contact_name || null, phone, email: email || null, address, company_registration_no: company_registration_no || null, tax_number: tax_number || null, website: website || null, bank_name: bank_name || null, account_name: account_name || null, account_number: account_number || null, payment_terms: payment_terms || null, is_active: is_active || true, created_by: createdBy });
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

async function reactivateSupplier(id, performedBy) {
  const reactivated = await supplierRepo.reactivateSupplier(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'reactivate_supplier', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return reactivated;
}

module.exports = {
  createSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
  deactivateSupplier,
  reactivateSupplier,
};
