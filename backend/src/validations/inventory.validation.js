const { body, param } = require('express-validator');

const inventoryIdValidation = [
  param('inventoryId').isUUID().withMessage('Invalid inventory ID.'),
];

const createInventoryValidation = [
  body('product_id').isUUID().withMessage('product_id is required and must be a UUID.'),
  body('supplier_id').optional().isUUID().withMessage('supplier_id must be a UUID.'),
  body('uom_id').optional().isUUID().withMessage('uom_id must be a UUID.'),
  body('quantity').isNumeric().withMessage('quantity is required and must be numeric.'),
  body('cost_price').optional().isFloat().withMessage('cost_price must be numeric.'),
  body('selling_price').optional().isFloat().withMessage('selling_price must be numeric.'),
  body('location').optional().isLength({ max: 200 }),
];

const updateInventoryValidation = [
  ...inventoryIdValidation,
  body('product_id').optional().isUUID(),
  body('supplier_id').optional().isUUID(),
  body('uom_id').optional().isUUID(),
  body('quantity').optional().isNumeric(),
  body('cost_price').optional().isFloat(),
  body('selling_price').optional().isFloat(),
  body('location').optional().isLength({ max: 200 }),
  body('is_active').optional().isBoolean(),
];

const listInventoriesValidation = [
  body('q').optional().trim().isLength({ max: 100 }),
  body('productId').optional().isUUID(),
  body('supplierId').optional().isUUID(),
  body('isActive').optional().isIn(['true','false']).withMessage('isActive must be true or false.'),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = {
  inventoryIdValidation,
  createInventoryValidation,
  updateInventoryValidation,
  listInventoriesValidation,
};
