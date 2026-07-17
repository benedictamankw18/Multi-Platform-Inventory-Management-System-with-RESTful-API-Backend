const { v4: uuidv4 } = require('uuid');
const customerRepo = require('../repositories/customer.repository');
const auditRepo = require('../repositories/audit.repository');

async function createCustomer({ customer_name, contact_email, phone, address, contact_person, createdBy }) {
  const id = uuidv4();
  console.log('Creating customer with ID:', id);
  const created = await customerRepo.createCustomer({ customer_id: id, customer_name, contact_email, phone, address, contact_person, created_by: createdBy });
  console.log('Creating customer with ID:', id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'create_customer', resource_id: id, meta: { customer_name }, performed_by: createdBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function getCustomerById(id) {
  return customerRepo.getCustomerById(id);
}

async function listCustomers(query) {
  const { q, isActive, page = 1, limit = 25 } = query || {};
  const offset = (page - 1) * limit;
  return customerRepo.listCustomers({ q, isActive, limit, offset });
}

async function updateCustomer(id, patch, performedBy) {
  const updated = await customerRepo.updateCustomer(id, patch);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'update_customer', resource_id: id, meta: patch, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivateCustomer(id, performedBy) {
  const deactivated = await customerRepo.deactivateCustomer(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'deactivate_customer', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

async function activateCustomer(id, performedBy) {
  const activated = await customerRepo.activateCustomer(id);
  try {
    if (auditRepo && typeof auditRepo.create === 'function') {
      auditRepo.create({ action: 'activate_customer', resource_id: id, performed_by: performedBy });
    }
  } catch (e) {
    console.error('audit error', e.message);
  }
  return activated;
}

module.exports = {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  deactivateCustomer,
  activateCustomer,
};
