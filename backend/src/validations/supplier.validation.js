const { body, param } = require('express-validator');

const supplierIdValidation = [
  param('supplierId').isUUID().withMessage('Invalid supplier ID.'),
];

const createSupplierValidation = [
  body('supplier_name').trim().notEmpty().withMessage('supplier_name is required.').isLength({ max: 150 }),
  body('email').optional().isEmail().withMessage('Invalid email.'),
  body('phone').optional().isLength({ max: 50 }),
  body('address').optional().isLength({ max: 500 }),
];

const updateSupplierValidation = [
  ...supplierIdValidation,
  body('supplier_name').optional().trim().isLength({ max: 150 }),
  body('email').optional().isEmail(),
  body('phone').optional().isLength({ max: 50 }),
  body('address').optional().isLength({ max: 500 }),
  body('is_active').optional().isBoolean(),
];

const listSuppliersValidation = [
  body('q').optional().trim().isLength({ max: 100 }),
  body('isActive').optional().isIn(['true','false']).withMessage('isActive must be true or false.'),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 10000 }),
];

module.exports = {
  supplierIdValidation,
  createSupplierValidation,
  updateSupplierValidation,
  listSuppliersValidation,
};
