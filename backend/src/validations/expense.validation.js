const { body, param, query } = require('express-validator');

const createExpenseValidation = [
  body('category_id').isUUID().withMessage('category_id is required and must be a UUID'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount is required and must be a positive number'),
  body('date').optional().isISO8601().withMessage('date must be an ISO date'),
  body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
  body('branch_id').optional().isUUID().withMessage('branch_id must be a UUID'),
];

const updateExpenseValidation = [
  body('category_id').optional().isUUID().withMessage('category_id must be a UUID'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('date').optional().isISO8601().withMessage('date must be an ISO date'),
  body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
];

const expenseIdValidation = [
  param('expenseId').isUUID().withMessage('expenseId must be a UUID'),
];

const listExpensesValidation = [
  query('branchId').optional().isUUID(),
  query('category').optional().isUUID(),
  query('fromDate').optional().isISO8601(),
  query('toDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 }),
];

module.exports = {
  createExpenseValidation,
  updateExpenseValidation,
  expenseIdValidation,
  listExpensesValidation,
};
