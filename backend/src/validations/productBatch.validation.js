const { param, query, body } = require('express-validator');

exports.listBatchesValidation = [
  query('product_id').optional().isUUID().withMessage('product_id must be a UUID.'),
  query('branch_id').optional().isUUID().withMessage('branch_id must be a UUID.'),
  query('status').optional().isIn(['ACTIVE', 'DEPLETED', 'EXPIRED', 'DISPOSED']).withMessage('status is invalid.'),
  query('expiringWithinDays').optional().isInt({ min: 0, max: 3650 }).withMessage('expiringWithinDays must be between 0 and 3650.'),
  query('includeEmpty').optional().isBoolean().withMessage('includeEmpty must be a boolean.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000.'),
];

exports.getBatchByIdValidation = [
  param('batch_id').exists().isUUID().withMessage('batch_id is required and must be a UUID.'),
];

exports.listBatchesByProductAndBranchValidation = [
  param('product_id').exists().isUUID().withMessage('product_id is required and must be a UUID.'),
  param('branch_id').exists().isUUID().withMessage('branch_id is required and must be a UUID.'),
];

exports.disposeBatchValidation = [
  param('batch_id').exists().isUUID().withMessage('batch_id is required and must be a UUID.'),
  body('notes').optional().isString().withMessage('notes must be a string.'),
];
