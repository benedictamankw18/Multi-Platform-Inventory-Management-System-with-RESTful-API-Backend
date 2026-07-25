const { body, param } = require('express-validator');

const purchaseIdValidation = [
  param('purchaseId').isUUID().withMessage('Invalid purchase ID.'),
];

const createPurchaseValidation = [
  body('supplier_id').isUUID().withMessage('supplier_id is required and must be a UUID.'),
  body('branch_id').isUUID().withMessage('branch_id is required and must be a UUID.'),
  body('po_number').trim().notEmpty().withMessage('po_number is required.').isLength({ max: 100 }),
  body('order_date').optional().isISO8601().toDate(),
  body('expected_date').optional().isISO8601().toDate(),
  body('status').optional().isString().isLength({ max: 50 }),
  body('total_amount').optional().isFloat().withMessage('total_amount must be numeric.'),
];

const updatePurchaseValidation = [
  ...purchaseIdValidation,
  body('supplier_id').optional().isUUID(),
  body('branch_id').optional().isUUID(),
  body('po_number').optional().trim().isLength({ max: 100 }),
  body('order_date').optional().isISO8601().toDate(),
  body('expected_date').optional().isISO8601().toDate(),
  body('status').optional().isString().isLength({ max: 50 }),
  body('total_amount').optional().isFloat(),
  body('is_active').optional().isBoolean(),
];

const listPurchasesValidation = [
  body('q').optional().trim().isLength({ max: 100 }),
  body('supplierId').optional().isUUID(),
  body('status').optional().isString(),
  body('isActive').optional().isIn(['true','false']).withMessage('isActive must be true or false.'),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 10000 }),
];

module.exports = {
  purchaseIdValidation,
  createPurchaseValidation,
  updatePurchaseValidation,
  listPurchasesValidation,
};
