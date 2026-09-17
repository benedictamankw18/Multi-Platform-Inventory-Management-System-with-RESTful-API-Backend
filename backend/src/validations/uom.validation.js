const { body, param, query } = require('express-validator');

const uomIdValidation = [
  param('id').isUUID().withMessage('Invalid UoM ID.'),
];

const nameValidation = body('name')
  .trim()
  .notEmpty()
  .withMessage('name is required.')
  .isLength({ max: 50 })
  .withMessage('name must be at most 50 characters.');

const optionalNameValidation = body('name')
  .optional()
  .trim()
  .notEmpty()
  .withMessage('name cannot be blank.')
  .isLength({ max: 50 })
  .withMessage('name must be at most 50 characters.');

const symbolValidation = body('symbol')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 20 })
  .withMessage('symbol must be at most 20 characters.');

const conversionFactorValidation = body('conversion_factor')
  .optional()
  .isFloat({ gt: 0 })
  .withMessage('conversion_factor must be a positive number.')
  .toFloat();

const createUomValidation = [
  nameValidation,
  symbolValidation,
  conversionFactorValidation,
  body('description').optional({ nullable: true }).isLength({ max: 400 }),
];

const updateUomValidation = [
  ...uomIdValidation,
  body()
    .custom((value) => ['name', 'symbol', 'conversion_factor', 'description'].some((field) => value[field] !== undefined))
    .withMessage('At least one updatable field is required.'),
  optionalNameValidation,
  symbolValidation,
  conversionFactorValidation,
  body('description').optional({ nullable: true }).isLength({ max: 400 }),
];

const listUomsValidation = [
  query('q').optional().trim().isLength({ max: 100 }).withMessage('q must be at most 100 characters.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('limit must be between 1 and 10000.'),
];

module.exports = {
  uomIdValidation,
  createUomValidation,
  updateUomValidation,
  listUomsValidation,
};
