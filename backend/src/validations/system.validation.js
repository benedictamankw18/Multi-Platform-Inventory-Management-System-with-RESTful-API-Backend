const { body, param, query } = require('express-validator');

const SETTING_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.:-]{1,99}$/;
const ALLOWED_TYPES = ['boolean', 'number', 'string'];

function inferType(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value === 'string') return 'string';
  return null;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function validateTypedValue(value, { req }) {
  const actualType = inferType(value);
  if (!actualType) {
    throw new Error('value must be a boolean, number, or string.');
  }

  if (req.body.type && req.body.type !== actualType) {
    throw new Error(`value must match declared type ${req.body.type}.`);
  }

  return true;
}

const settingKeyBodyValidation = body('key')
  .trim()
  .matches(SETTING_KEY_PATTERN)
  .withMessage('key must start with a letter and contain only letters, numbers, _, ., :, or -.');

const settingKeyParamValidation = [
  param('key')
    .trim()
    .matches(SETTING_KEY_PATTERN)
    .withMessage('Invalid setting key.'),
];

const settingTypeValidation = body('type')
  .optional()
  .isIn(ALLOWED_TYPES)
  .withMessage('type must be boolean, number, or string.');

const settingValueValidation = body('value')
  .custom((value, context) => {
    if (!hasOwn(context.req.body, 'value')) {
      throw new Error('value is required.');
    }
    return validateTypedValue(value, context);
  });

const optionalSettingValueValidation = body('value')
  .optional({ values: 'undefined' })
  .custom(validateTypedValue);

const descriptionValidation = body('description')
  .optional({ nullable: true })
  .isString()
  .withMessage('description must be a string.')
  .isLength({ max: 500 })
  .withMessage('description must be at most 500 characters.');

const upsertSystemValidation = [
  settingKeyBodyValidation,
  settingTypeValidation,
  settingValueValidation,
  descriptionValidation,
];

const updateSystemValidation = [
  ...settingKeyParamValidation,
  body()
    .custom((value) => ['value', 'type', 'description'].some((field) => hasOwn(value, field)))
    .withMessage('At least one updatable field is required.'),
  settingTypeValidation,
  optionalSettingValueValidation,
  descriptionValidation,
];

const listSystemValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 10000 }),
];

module.exports = {
  settingKeyParamValidation,
  upsertSystemValidation,
  updateSystemValidation,
  listSystemValidation,
};
