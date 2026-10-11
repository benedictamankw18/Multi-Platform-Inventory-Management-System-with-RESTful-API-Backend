const { body, param, query } = require('express-validator');

const createTransactionValidation = [
  body('product_id').isUUID().withMessage('product_id is required and must be a UUID.'),
  body('branch_id').isUUID().withMessage('branch_id is required and must be a UUID.'),
  body('quantity').isFloat().withMessage('quantity is required and must be numeric.').custom((v) => Number(v) !== 0).withMessage('quantity must be non-zero.'),
  body('type').isIn(['in','out','adjustment']).withMessage("type must be one of 'in','out','adjustment'"),
  body('reference_type').optional().isString(),
  body('reference_id').optional().isUUID(),
  body('notes').optional().isString(),
  // Expiry-tracked products need lot identity on stock-in and may name a
  // specific lot on stock-out (strict override). Ignored for other products.
  body('unit_cost').optional().isFloat({ min: 0 }).withMessage('unit_cost must be a non-negative number.'),
  body('batch_number').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('batch_number must be 100 characters or fewer.'),
  body('expiry_date').optional({ values: 'falsy' }).isISO8601().toDate().withMessage('expiry_date must be a valid date.'),
  body('batch_id').optional({ values: 'falsy' }).isUUID().withMessage('batch_id must be a UUID.'),
];

const transactionIdValidation = [
  param('transactionId').isUUID().withMessage('Invalid transaction ID.'),
];

const listTransactionsValidation = [
  query('product_id').optional().isUUID(),
  query('branch_id').optional().isUUID(),
  query('transaction_type').optional().isIn(['in','out','adjustment']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 10000 }),
];

module.exports = {
  createTransactionValidation,
  transactionIdValidation,
  listTransactionsValidation,
};
