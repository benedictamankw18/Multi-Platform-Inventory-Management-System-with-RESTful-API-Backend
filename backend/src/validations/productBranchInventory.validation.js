const { body, query } = require('express-validator');

exports.createInventoryRecordValidation = [
  body('product_id').exists().isUUID().withMessage('product_id is required and must be a UUID.'),
  body('branch_id').exists().isUUID().withMessage('branch_id is required and must be a UUID.'),
  body('quantity').exists().isNumeric().withMessage('quantity is required and must be numeric.'),
];

exports.listInventoryRecordsValidation = [
  query('branch_id').exists().isUUID().withMessage('branch_id is required and must be a UUID.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
];
