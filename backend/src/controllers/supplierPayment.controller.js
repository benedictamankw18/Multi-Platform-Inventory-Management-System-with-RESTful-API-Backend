const supplierPaymentService = require('../services/supplierPayment.service');

async function createSupplierPayment(req, res, next) {
  try {
    const created = await supplierPaymentService.createPayment({
      supplier_id: req.body.supplier_id,
      amount: req.body.amount,
      payment_date: req.body.payment_date,
      payment_method: req.body.payment_method,
      reference_number: req.body.reference_number,
      po_id: req.body.po_id,
      createdBy: req.user ? req.user.id : null,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

async function listPaymentsBySupplier(req, res, next) {
  try {
    const supplierId = req.params.supplierId;
    const { page = 1, limit = 50 } = req.query || {};
    const offset = (page - 1) * limit;
    const results = await supplierPaymentService.listPaymentsBySupplier(supplierId, { limit: Number(limit), offset: Number(offset) });
    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function getPaymentById(req, res, next) {
  try {
    const paymentId = req.params.paymentId;
    const payment = await supplierPaymentService.getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }
    res.json({ data: payment });
  } catch (err) {
    next(err);
  } 
};

async function updatePayment(req, res, next) {
  try {
    const paymentId = req.params.paymentId;
    const updated = await supplierPaymentService.updatePayment(paymentId, req.body);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

async function deletePayment(req, res, next) {
  try {
    const paymentId = req.params.paymentId;
    const deleted = await supplierPaymentService.deletePayment(paymentId);
    res.json({ data: deleted });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSupplierPayment,
  listPaymentsBySupplier,
  getPaymentById,
  updatePayment,
  deletePayment,
};
