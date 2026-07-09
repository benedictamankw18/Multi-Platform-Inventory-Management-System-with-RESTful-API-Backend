const { body, param, query } = require('express-validator');

const productIdValidation = [
  param('productId').isUUID().withMessage('Invalid product ID.'),
];

// Accept both `product_name` and `name`, `base_uom_id` and `uom_id`, prices in either naming
const createProductValidation = [
  body('sku').trim().notEmpty().withMessage('sku is required.').isLength({ max: 50 }),
  body('product_name').optional().trim().isLength({ max: 150 }),
  body('name').optional().trim().isLength({ max: 150 }),
  body('base_uom_id').optional().isUUID().withMessage('base_uom_id must be a UUID.'),
  body('uom_id').optional().isUUID().withMessage('uom_id must be a UUID.'),
  body('category_id').optional().isUUID().withMessage('Invalid category_id.'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('cost_price must be >= 0'),
  body('sell_price').optional().isFloat({ min: 0 }).withMessage('sell_price must be >= 0'),
  body('reorder_level').optional().isInt({ min: 0 }).withMessage('reorder_level must be an integer >= 0'),
];

const updateProductValidation = [
  ...productIdValidation,
  body('sku').optional().trim().isLength({ max: 50 }),
  body('product_name').optional().trim().isLength({ max: 150 }),
  body('name').optional().trim().isLength({ max: 150 }),
  body('category_id').optional().isUUID().withMessage('Invalid category_id.'),
  body('uom_id').optional().isUUID().withMessage('Invalid uom_id.'),
  body('cost_price').optional().isFloat({ min: 0 }),
  body('sell_price').optional().isFloat({ min: 0 }),
  body('reorder_level').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
];

const listProductsQueryValidation = [
  query('q').optional().trim().isLength({ max: 100 }),
  query('categoryId').optional().isUUID().withMessage('Invalid categoryId.'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
];

const importProductsValidation = [
  // file validation is handled in controller (mime/extension)
];

module.exports = {
  productIdValidation,
  createProductValidation,
  updateProductValidation,
  listProductsQueryValidation,
  importProductsValidation,
  listProductsValidation: listProductsQueryValidation,
};
