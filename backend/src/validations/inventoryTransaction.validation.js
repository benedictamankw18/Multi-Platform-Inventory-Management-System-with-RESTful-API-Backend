const { body, param, query } = require('express-validator');

const createTransactionValidation = [
  body('product_id').isUUID().withMessage('product_id is required and must be a UUID.'),
  body('branch_id').isUUID().withMessage('branch_id is required and must be a UUID.'),
  body('quantity').isFloat().withMessage('quantity is required and must be numeric.').custom((v) => Number(v) !== 0).withMessage('quantity must be non-zero.'),
  body('type').isIn(['in','out','adjustment']).withMessage("type must be one of 'in','out','adjustment'"),
  body('reference_type').optional().isString(),
  body('reference_id').optional().isUUID(),
  body('notes').optional().isString(),
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
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = {
  createTransactionValidation,
  transactionIdValidation,
  listTransactionsValidation,
};
