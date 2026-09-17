const { v4: uuidv4 } = require('uuid');
const customerRepo = require('../repositories/customer.repository');
const auditRepo = require('../repositories/audit.repository');

async function createCustomer({ customer_name, contact_email, phone, address, contact_person, createdBy }) {
  const id = uuidv4();
  const created = await customerRepo.createCustomer({ customer_id: id, business_name: customer_name || null, email: contact_email, phone, address, contact_name: contact_person || null, created_by: createdBy });
  try {
    await auditRepo.writeLog(createdBy, 'create_customer', 'CUSTOMER', id, { customer_name });
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
  const [items, total] = await Promise.all([
    customerRepo.listCustomers({ q, isActive, limit, offset }),
    customerRepo.countCustomers({ q, isActive }),
  ]);
  return { items, total };
}

async function updateCustomer(id, patch, performedBy) {
  const updated = await customerRepo.updateCustomer(id, patch);
  try {
    await auditRepo.writeLog(performedBy, 'update_customer', 'CUSTOMER', id, patch);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return updated;
}

async function deactivateCustomer(id, performedBy) {
  const deactivated = await customerRepo.deactivateCustomer(id);
  try {
    await auditRepo.writeLog(performedBy, 'deactivate_customer', 'CUSTOMER', id);
  } catch (e) {
    console.error('audit error', e.message);
  }
  return deactivated;
}

async function activateCustomer(id, performedBy) {
  const activated = await customerRepo.activateCustomer(id);
  try {
    await auditRepo.writeLog(performedBy, 'activate_customer', 'CUSTOMER', id);
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
