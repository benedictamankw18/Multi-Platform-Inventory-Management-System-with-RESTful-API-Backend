const { body, param, query } = require('express-validator');

const productIdValidation = [
  param('productId').isUUID().withMessage('Invalid product ID.'),
];

// Accept both `product_name` and `name`, `base_uom_id` and `uom_id`, prices in either naming
const createProductValidation = [
  body('sku').trim().notEmpty().withMessage('sku is required.').isLength({ max: 50 }),
  body('barcode').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('barcode must be at most 100 characters.'),
  body('product_name').optional().trim().isLength({ max: 150 }),
  body('name').optional().trim().isLength({ max: 150 }),
  body('base_uom_id').optional().isUUID().withMessage('base_uom_id must be a UUID.'),
  body('uom_id').optional().isUUID().withMessage('uom_id must be a UUID.'),
  body('category_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid category_id.'),
  body('supplier_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid supplier_id.'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('cost_price must be >= 0'),
  body('retail_price').optional().isFloat({ min: 0 }).withMessage('retail_price must be >= 0'),
  body('wholesale_price').optional().isFloat({ min: 0 }).withMessage('wholesale_price must be >= 0'),
  body().custom((_, { req }) => {
    const retail = req.body.retail_price;
    const wholesale = req.body.wholesale_price;
    const hasRetail = retail !== undefined && retail !== null && retail !== '';
    const hasWholesale = wholesale !== undefined && wholesale !== null && wholesale !== '';
    if (!hasRetail && !hasWholesale) {
      throw new Error('At least one of retail_price or wholesale_price is required.');
    }
    return true;
  }),
  body('wholesale_uom_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid wholesale_uom_id.'),
  body('wholesale_conversion_factor').optional().isFloat({ min: 0 }),
  body('wholesale_min_qty').optional().isFloat({ min: 0 }),
  body('reorder_level').optional().isInt({ min: 0 }).withMessage('reorder_level must be an integer >= 0'),
  body('description').optional().trim(),
  body('image_url').optional().trim(),
  body('brand').optional().trim().isLength({ max: 100 }),
  body('model').optional().trim().isLength({ max: 100 }),
  body('manufacturer').optional().trim().isLength({ max: 150 }),
  body('weight').optional().isFloat({ min: 0 }),
  body('length').optional().isFloat({ min: 0 }),
  body('width').optional().isFloat({ min: 0 }),
  body('height').optional().isFloat({ min: 0 }),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }),
  body('discount_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('minimum_stock').optional().isFloat({ min: 0 }),
  body('maximum_stock').optional().isFloat({ min: 0 }),
  body('serial_number_required').optional().isBoolean(),
  body('expiry_required').optional().isBoolean(),
  body('track_inventory').optional().isBoolean(),
  body('branch_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid branch_id.'),
  body('quantity').optional().isFloat({ min: 0 }).withMessage('quantity must be >= 0'),
  body('quantity_on_hand').optional().isFloat({ min: 0 }).withMessage('quantity_on_hand must be >= 0'),
  body('reorder_quantity').optional().isFloat({ min: 0 }),
  body('reserved_quantity').optional().isFloat({ min: 0 }),
  body('damaged_quantity').optional().isFloat({ min: 0 }),
  body('expired_quantity').optional().isFloat({ min: 0 }),
  body('available_quantity').optional().isFloat({ min: 0 }),
];

const updateProductValidation = [
  ...productIdValidation,
  body('sku').optional().trim().isLength({ max: 50 }),
  body('barcode').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('barcode must be at most 100 characters.'),
  body('product_name').optional().trim().isLength({ max: 150 }),
  body('name').optional().trim().isLength({ max: 150 }),
  body('category_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid category_id.'),
  body('supplier_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid supplier_id.'),
  body('uom_id').optional().isUUID().withMessage('Invalid uom_id.'),
  body('base_uom_id').optional().isUUID().withMessage('Invalid base_uom_id.'),
  body('cost_price').optional().isFloat({ min: 0 }),
  body('retail_price').optional().isFloat({ min: 0 }),
  body('wholesale_price').optional().isFloat({ min: 0 }),
  body('wholesale_uom_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid wholesale_uom_id.'),
  body('wholesale_conversion_factor').optional().isFloat({ min: 0 }),
  body('wholesale_min_qty').optional().isFloat({ min: 0 }),
  body('reorder_level').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
  body('description').optional().trim(),
  body('image_url').optional().trim(),
  body('brand').optional().trim().isLength({ max: 100 }),
  body('model').optional().trim().isLength({ max: 100 }),
  body('manufacturer').optional().trim().isLength({ max: 150 }),
  body('weight').optional().isFloat({ min: 0 }),
  body('length').optional().isFloat({ min: 0 }),
  body('width').optional().isFloat({ min: 0 }),
  body('height').optional().isFloat({ min: 0 }),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }),
  body('discount_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('minimum_stock').optional().isFloat({ min: 0 }),
  body('maximum_stock').optional().isFloat({ min: 0 }),
  body('serial_number_required').optional().isBoolean(),
  body('expiry_required').optional().isBoolean(),
  body('track_inventory').optional().isBoolean(),
  body('branch_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid branch_id.'),
  body('quantity').optional().isFloat({ min: 0 }).withMessage('quantity must be >= 0'),
  body('quantity_on_hand').optional().isFloat({ min: 0 }).withMessage('quantity_on_hand must be >= 0'),
  body('reorder_quantity').optional().isFloat({ min: 0 }),
  body('reserved_quantity').optional().isFloat({ min: 0 }),
  body('damaged_quantity').optional().isFloat({ min: 0 }),
  body('expired_quantity').optional().isFloat({ min: 0 }),
  body('available_quantity').optional().isFloat({ min: 0 }),
];

const listProductsQueryValidation = [
  body('q').optional().trim().isLength({ max: 100 }),
  body('categoryId').optional().isUUID().withMessage('Invalid categoryId.'),
  body('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false.'),
  body('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  body('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('limit must be between 1 and 10000.'),
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
