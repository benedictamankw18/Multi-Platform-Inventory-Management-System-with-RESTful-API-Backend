const { body, param } = require('express-validator');

const customerIdValidation = [
  param('customerId').isUUID().withMessage('Invalid customer ID.'),
];

const createCustomerValidation = [
  body('customer_name').optional().trim().isLength({ max: 150 }),
  body('contact_email').optional().isEmail().withMessage('Invalid email.'),
  body('phone').optional().isLength({ max: 50 }),
  body('address').optional().isLength({ max: 500 }),
  body('contact_person').optional().trim().isLength({ max: 150 }),
  body().custom((_, { req }) => {
    const hasIdentifier = [req.body.customer_name, req.body.contact_person, req.body.phone]
      .some((v) => typeof v === 'string' && v.trim().length > 0);
    if (!hasIdentifier) {
      throw new Error('At least one of business name, contact name, or phone is required.');
    }
    return true;
  }),
];

const updateCustomerValidation = [
  ...customerIdValidation,
  body('customer_name').optional().trim().isLength({ max: 150 }),
  body('contact_email').optional().isEmail(),
  body('phone').optional().isLength({ max: 50 }),
  body('address').optional().isLength({ max: 500 }),
  body('contact_person').optional().isLength({ max: 150 }),
  body('is_active').optional().isBoolean(),
];

const listCustomersValidation = [
  body('q').optional().trim().isLength({ max: 100 }),
  body('isActive').optional().isIn(['true','false']).withMessage('isActive must be true or false.'),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 10000 }),
];

module.exports = {
  customerIdValidation,
  createCustomerValidation,
  updateCustomerValidation,
  listCustomersValidation,
};
