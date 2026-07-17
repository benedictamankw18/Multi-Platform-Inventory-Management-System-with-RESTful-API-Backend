const { body, query, param } = require('express-validator');

const createCustomerPaymentValidation = [
  body('customer_id').isUUID().withMessage('customer_id is required and must be a UUID'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('payment_date').optional().isISO8601().withMessage('payment_date must be an ISO date'),
  body('method').optional().isIn(['CASH','CARD','BANK_TRANSFER','OTHER']).withMessage('Invalid payment method'),
];

const listCustomerPaymentsValidation = [
  query('customer_id').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const customerIdParam = [
  param('customerId').isUUID().withMessage('Invalid customer ID.'),
];

module.exports = {
  createCustomerPaymentValidation,
  listCustomerPaymentsValidation,
  customerIdParam,
};
