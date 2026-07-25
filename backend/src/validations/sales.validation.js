const { body, param, query } = require('express-validator');

const paymentMethods = ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CREDIT'];

const saleIdValidation = [
  param('saleId').isUUID().withMessage('Invalid sale ID.'),
];

const itemValidation = [
  body('items').isArray({ min: 1 }).withMessage('items is required as a non-empty array.'),
  body('items.*.product_id').isUUID().withMessage('items.*.product_id must be a UUID.'),
  body('items.*.uom_id').optional().isUUID().withMessage('items.*.uom_id must be a UUID.'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('items.*.quantity must be greater than 0.'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('items.*.unit_price must be 0 or greater.'),
  body('items.*.line_discount').optional().isFloat({ min: 0 }).withMessage('items.*.line_discount must be 0 or greater.'),
  body('items.*.tax_amount').optional().isFloat({ min: 0 }).withMessage('items.*.tax_amount must be 0 or greater.'),
  body('items.*.cost_price').optional().isFloat({ min: 0 }).withMessage('items.*.cost_price must be 0 or greater.'),
  body('items.*.batch_number').optional().trim().isLength({ max: 100 }),
  body('items.*.expiry_date').optional().isISO8601().toDate(),
];

const paymentValidation = [
  body('payment.amount').optional().isFloat({ min: 0 }).withMessage('payment.amount must be 0 or greater.'),
  body('payment.payment_method').optional().isIn(paymentMethods).withMessage('Invalid payment.payment_method.'),
  body('payment.reference_number').optional().trim().isLength({ max: 100 }),
  body('payments').optional().isArray().withMessage('payments must be an array.'),
  body('payments.*.amount').optional().isFloat({ min: 0 }).withMessage('payments.*.amount must be 0 or greater.'),
  body('payments.*.payment_method').optional().isIn(paymentMethods).withMessage('Invalid payments.*.payment_method.'),
  body('payments.*.reference_number').optional().trim().isLength({ max: 100 }),
  body('payment_amount').optional().isFloat({ min: 0 }).withMessage('payment_amount must be 0 or greater.'),
  body('payment_method').optional().isIn(paymentMethods).withMessage('Invalid payment_method.'),
];

const createSaleValidation = [
  body('branch_id').optional().isUUID().withMessage('branch_id must be a UUID.'),
  body('customer_id').optional({ nullable: true }).isUUID().withMessage('customer_id must be a UUID.'),
  body('cashier_id').optional().isUUID().withMessage('cashier_id must be a UUID.'),
  body('sale_type').optional().isIn(['RETAIL', 'WHOLESALE']),
  body('sale_date').optional().isISO8601().toDate(),
  body('discount_amount').optional().isFloat({ min: 0 }),
  body('tax_amount').optional().isFloat({ min: 0 }),
  body('total_amount').optional().isFloat({ min: 0 }),
  body('amount_paid').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['COMPLETED', 'PARTIALLY_PAID', 'VOID', 'REFUNDED', 'PARTIALLY_REFUNDED']),
  body('invoice_number').optional().trim().isLength({ max: 50 }),
  body('cashier_name').optional().trim().isLength({ max: 100 }),
  body('customer_name').optional().trim().isLength({ max: 150 }),
  body('remarks').optional().trim(),
  body('device_id').optional().trim().isLength({ max: 100 }),
  body('due_date').optional().isISO8601().toDate(),
  ...itemValidation,
  ...paymentValidation,
];

const listSalesQueryValidation = [
  query('q').optional().trim().isLength({ max: 100 }),
  query('customerId').optional().isUUID().withMessage('customerId must be a UUID.'),
  query('branchId').optional().isUUID().withMessage('branchId must be a UUID.'),
  query('status').optional().isIn(['COMPLETED', 'PARTIALLY_PAID', 'VOID', 'REFUNDED', 'PARTIALLY_REFUNDED']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 10000 }),
];

const listSalesValidation = [
  body('q').optional().trim().isLength({ max: 100 }),
  body('customerId').optional().isUUID().withMessage('customerId must be a UUID.'),
  body('branchId').optional().isUUID().withMessage('branchId must be a UUID.'),
  body('status').optional().isIn(['COMPLETED', 'PARTIALLY_PAID', 'VOID', 'REFUNDED', 'PARTIALLY_REFUNDED']),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 10000 }),
];

const refundSaleValidation = [
  body('amount').optional().isFloat({ min: 0 }).withMessage('amount must be 0 or greater.'),
  body('reason').optional().trim().isLength({ max: 500 }),
];

module.exports = {
  saleIdValidation,
  createSaleValidation,
  listSalesQueryValidation,
  listSalesValidation,
  refundSaleValidation,
};
