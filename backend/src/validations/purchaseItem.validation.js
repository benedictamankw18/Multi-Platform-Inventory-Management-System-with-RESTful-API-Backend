const { body, param } = require('express-validator');

const purchaseIdParam = [
  param('purchaseId').isUUID().withMessage('Invalid purchase ID.'),
];

const createPurchaseItemValidation = [
  ...purchaseIdParam,
  body('product_id').isUUID().withMessage('product_id is required and must be a UUID'),
  body('uom_id').isUUID().withMessage('uom_id is required and must be a UUID'),
  body('quantity').isFloat({ gt: 0 }).withMessage('quantity must be a number greater than 0'),
  body('unit_price').isFloat({ min: 0 }).withMessage('unit_price must be a number >= 0'),
  body('discount').optional().isFloat({ min: 0 }),
  body('expiry_date').optional().isISO8601().toDate(),
  body('batch_number').optional().isString(),
  body('serial_number').optional().isString(),
];

const updatePurchaseItemValidation = [
  body('product_id').optional().isUUID(),
  body('uom_id').optional().isUUID(),
  body('quantity').optional().isFloat({ gt: 0 }),
  body('unit_price').optional().isFloat({ min: 0 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('expiry_date').optional().isISO8601().toDate(),
  body('batch_number').optional().isString(),
  body('serial_number').optional().isString(),
];

module.exports = {
  purchaseIdParam,
  createPurchaseItemValidation,
  updatePurchaseItemValidation,
};
