const customerPaymentService = require('../services/customerPayment.service');

async function createCustomerPayment(req, res, next) {
  try {
    const created = await customerPaymentService.createPayment({
      customer_id: req.body.customer_id,
      amount: req.body.amount,
      payment_date: req.body.payment_date,
      method: req.body.method,
      reference: req.body.reference,
      createdBy: req.user ? req.user.id : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listCustomerPayments(req, res, next) {
  try {
    const { customer_id, page = 1, limit = 50 } = req.query || {};
    const results = await customerPaymentService.listPayments({ customer_id, page: Number(page), limit: Number(limit) });
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function listPaymentsByCustomer(req, res, next) {
  try {
    const customerId = req.params.customerId;
    const { page = 1, limit = 50 } = req.query || {};
    const results = await customerPaymentService.listPayments({ customer_id: customerId, page: Number(page), limit: Number(limit) });
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCustomerPayment,
  listCustomerPayments,
  listPaymentsByCustomer,
};
