const { param, body } = require('express-validator');

const productIdValidation = [
  param('id').isUUID().withMessage('Invalid product ID.'),
];

const productImageIdValidation = [
  param('id').isUUID().withMessage('Invalid product image ID.'),
];

const createProductImageValidation = [
  ...productIdValidation,
];

const productImageBodyValidation = [
  body('is_primary').optional().isBoolean().withMessage('is_primary must be true or false.'),
];

module.exports = {
  productIdValidation,
  productImageIdValidation,
  createProductImageValidation,
  productImageBodyValidation,
};
