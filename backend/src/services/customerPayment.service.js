const { v4: uuidv4 } = require('uuid');
const customerPaymentRepo = require('../repositories/customerPayment.repository');
const customerRepo = require('../repositories/customer.repository');
const auditRepo = require('../repositories/audit.repository');

async function createPayment({ customer_id, amount, payment_date = null, method = null, reference = null, createdBy = null } = {}) {
  const customer = await customerRepo.getCustomerById(customer_id);
  if (!customer) throw new Error('Customer not found');

  const payment_id = uuidv4();
  const created = await customerPaymentRepo.createCustomerPayment({ payment_id, customer_id, sale_id: null, amount, payment_method: method, payment_date, reference_number: reference });
  try {
    await auditRepo.writeLog(createdBy, 'create_customer_payment', 'CUSTOMER_PAYMENT', payment_id, { customer_id, amount });
  } catch (e) {
    console.error('audit error', e.message);
  }
  return created;
}

async function listPayments({ customer_id = null, page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  return customerPaymentRepo.listCustomerPayments({ customerId: customer_id, limit, offset });
}

module.exports = {
  createPayment,
  listPayments,
};
