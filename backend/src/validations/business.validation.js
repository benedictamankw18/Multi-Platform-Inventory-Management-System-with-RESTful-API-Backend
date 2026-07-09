const { body, query } = require('express-validator');

const updateBusinessValidation = [
  body('name').optional().isString(),
  body('registration_number').optional().isString(),
  body('address').optional().isString(),
  body('phone').optional().isString(),
  body('email').optional().isEmail(),
];

const getBusinessValidation = [
  query('branchId').optional().isUUID(),
];


const upsertBusinessSettingValidation = [
  body('key')
    .trim()
    .notEmpty()
    .withMessage('key is required')
    .isString()
    .withMessage('key must be a string')
    .isLength({ max: 100 })
    .withMessage('key cannot exceed 100 characters'),
  body('value')
    .not().isEmpty()
    .withMessage('value is required'),
  body().custom((payload) => {
    // Additional per-key validation
    const { key, value } = payload;
    if (!key) return true;
    if (key === 'currency') {
      if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) throw new Error('currency must be a 3-letter uppercase code');
    }
    if (key === 'timezone') {
      if (typeof value !== 'string' || !value.trim()) throw new Error('timezone must be a non-empty string');
    }
    return true;
  }),
];

module.exports = {
  updateBusinessValidation,
  upsertBusinessSettingValidation,
  getBusinessValidation,
};
