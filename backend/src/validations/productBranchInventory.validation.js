const { param ,body, query } = require('express-validator');
// const { param } = require('../routes/productBranchInventory.routes');

exports.createInventoryRecordValidation = [
  body('product_id').exists().isUUID().withMessage('product_id is required and must be a UUID.'),
  body('branch_id').exists().isUUID().withMessage('branch_id is required and must be a UUID.'),
  body('quantity').exists().isNumeric().withMessage('quantity is required and must be numeric.'),
];

exports.listInventoryRecordsValidation = [
  body('branch_id').exists().isUUID().withMessage('branch_id is required and must be a UUID.'),
  body('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  body('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('limit must be between 1 and 10000.'),
];

exports.updateInventoryRecordValidation = [
  param('inventory_id').exists().isUUID().withMessage('inventory_id is required and must be a UUID.'),
  body('product_id').optional().isUUID().withMessage('product_id must be a UUID.'),
  body('branch_id').optional().isUUID().withMessage('branch_id must be a UUID.'),
  body('quantity').optional().isNumeric().withMessage('quantity must be numeric.'),
];

exports.deleteInventoryRecordValidation = [
  param('inventory_id').exists().isUUID().withMessage('inventory_id is required and must be a UUID.'),
];

exports.getInventoryByIdValidation = [
  param('inventory_id').exists().isUUID().withMessage('inventory_id is required and must be a UUID.'),
];

exports.getInventoryByProductAndBranchValidation = [
  param('product_id').exists().isUUID().withMessage('product_id is required and must be a UUID.'),
  param('branch_id').exists().isUUID().withMessage('branch_id is required and must be a UUID.'),
];