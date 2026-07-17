const { body, param } = require('express-validator');

const createSupplierPaymentValidation = [
  body('supplier_id').isUUID().withMessage('supplier_id must be a valid UUID'),
  body('po_id').isUUID().optional().withMessage('po_id must be a valid UUID'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('payment_date').optional().isISO8601().withMessage('payment_date must be an ISO8601 date'),
  body('payment_method').optional().isString(),
  body('reference_number').optional().isString(),
];

const supplierIdValidation = [
  param('supplierId').isUUID().withMessage('Invalid supplier ID.'),
];

const paymentIdValidation = [
  param('paymentId').isUUID().withMessage('Invalid payment ID.'),
];

const updateSupplierPaymentValidation = [
  ...paymentIdValidation,
  body('supplier_id').optional().isUUID().withMessage('supplier_id must be a valid UUID'),
  body('po_id').optional().isUUID().withMessage('po_id must be a valid UUID'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('payment_date').optional().isISO8601().withMessage('payment_date must be an ISO8601 date'),
  body('payment_method').optional().isString(),
  body('reference_number').optional().isString(),
];

const listSupplierPaymentsValidation = [
  ...supplierIdValidation,
  body('poId').optional().isUUID().withMessage('poId must be a valid UUID'),
  body('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be an integer between 1 and 100'),
];

module.exports = {
  createSupplierPaymentValidation,
  supplierIdValidation,
  paymentIdValidation,
  updateSupplierPaymentValidation,
  listSupplierPaymentsValidation,
};
