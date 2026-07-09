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

module.exports = {
  createSupplierPayment,
  listPaymentsBySupplier,
};
