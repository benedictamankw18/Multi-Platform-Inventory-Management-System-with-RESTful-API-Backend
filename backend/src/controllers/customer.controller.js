const customerService = require('../services/customer.service');

async function createCustomer(req, res, next) {
  try {
    const created = await customerService.createCustomer({
      customer_name: req.body.customer_name,
      contact_email: req.body.contact_email,
      phone: req.body.phone,
      address: req.body.address,
      contact_person: req.body.contact_person,
      createdBy: req.user ? req.user.id : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listCustomers(req, res, next) {
  try {
    const results = await customerService.listCustomers(req.body || req.query);
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function getCustomerById(req, res, next) {
  try {
    const customer = await customerService.getCustomerById(req.params.customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const id = req.params.customerId;
    const patch = req.body;
    const updated = await customerService.updateCustomer(id, patch, req.user ? req.user.id : null);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function deactivateCustomer(req, res, next) {
  try {
    const id = req.params.customerId;
    const deactivated = await customerService.deactivateCustomer(id, req.user ? req.user.id : null);
    res.json({ data: deactivated });
  } catch (err) {
    next(err);
  }
}

async function activateCustomer(req, res, next) {
  try {
    const id = req.params.customerId;
    const activated = await customerService.activateCustomer(id, req.user ? req.user.id : null);
    res.json({ data: activated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  activateCustomer,
  deactivateCustomer,
};
