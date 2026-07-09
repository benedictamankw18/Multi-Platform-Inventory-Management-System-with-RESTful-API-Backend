const { body, param, query } = require('express-validator');

const branchPayloadValidation = [
  body('branch_name')
    .trim()
    .notEmpty()
    .withMessage('branch_name is required.')
    .isString()
    .withMessage('branch_name must be a string.')
    .isLength({ max: 100 })
    .withMessage('branch_name cannot exceed 100 characters.'),
  body('address').optional({ nullable: true }).isString().withMessage('address must be a string.'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean.'),
  body('phone').optional({ nullable: true }).isString().withMessage('phone must be a string.'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid.'),
  body('manager_id').optional({ nullable: true }).isUUID().withMessage('manager_id must be a UUID.'),
  body('city').optional({ nullable: true }).isString().withMessage('city must be a string.'),
  body('country').optional({ nullable: true }).isString().withMessage('country must be a string.'),
  body('postal_code').optional({ nullable: true }).isString().withMessage('postal_code must be a string.'),
  body('latitude').optional({ nullable: true }).isFloat().withMessage('latitude must be numeric.'),
  body('longitude').optional({ nullable: true }).isFloat().withMessage('longitude must be numeric.'),
];

const createBranchValidation = [...branchPayloadValidation];
const updateBranchValidation = [...branchPayloadValidation];

const branchIdValidation = [
  param('branchId').isUUID().withMessage('branchId must be a UUID.'),
];

const idValidation = [
  param('id').isUUID().withMessage('id must be a UUID.'),
];

const listBranchesValidation = [
  query('q').optional().trim().isLength({ max: 100 }).withMessage('q cannot exceed 100 characters.'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
  body('q').optional().trim().isLength({ max: 100 }).withMessage('q cannot exceed 100 characters.'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.'),
  body('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
];

module.exports = {
  createBranchValidation,
  updateBranchValidation,
  branchIdValidation,
  idValidation,
  listBranchesValidation,
};
