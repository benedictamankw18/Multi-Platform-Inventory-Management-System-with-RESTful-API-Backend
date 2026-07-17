const { body, query } = require('express-validator');

const createPriceHistoryValidation = [
  body('product_id').isUUID().withMessage('product_id is required and must be a UUID'),
  body('price').isFloat({ gt: 0 }).withMessage('price must be a positive number'),
  body('effective_date').optional().isISO8601().withMessage('effective_date must be an ISO date'),
];

const listPriceHistoryValidation = [
  body('product_id').optional().isUUID().withMessage('product_id must be a UUID'),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = {
  createPriceHistoryValidation,
  listPriceHistoryValidation,
};
