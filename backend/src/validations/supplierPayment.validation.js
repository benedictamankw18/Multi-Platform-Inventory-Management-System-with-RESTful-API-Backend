const { body, param } = require('express-validator');

const createSupplierPaymentValidation = [
  body('supplier_id').isUUID().withMessage('supplier_id must be a valid UUID'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('payment_date').optional().isISO8601().withMessage('payment_date must be an ISO8601 date'),
  body('payment_method').optional().isString(),
  body('reference_number').optional().isString(),
];

const supplierIdValidation = [
  param('supplierId').isUUID().withMessage('Invalid supplier ID.'),
];

module.exports = {
  createSupplierPaymentValidation,
  supplierIdValidation,
};
