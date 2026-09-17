const { body, param } = require('express-validator');

const transferIdValidation = [
  param('transferId').isUUID().withMessage('Invalid transfer ID.'),
];

const createTransferValidation = [
  body('product_id').isUUID().withMessage('product_id is required and must be a UUID.'),
  body('from_branch_id').isUUID().withMessage('from_branch_id is required and must be a UUID.'),
  body('to_branch_id').isUUID().withMessage('to_branch_id is required and must be a UUID.'),
  body('quantity').isNumeric().withMessage('quantity is required and must be numeric.'),
  body('transfer_date').optional().isISO8601().toDate(),
  body('notes').optional().isLength({ max: 1000 }),
];

const updateTransferValidation = [
  ...transferIdValidation,
  body('product_id').optional().isUUID(),
  body('from_branch_id').optional().isUUID(),
  body('to_branch_id').optional().isUUID(),
  body('quantity').optional().isNumeric(),
  body('transfer_date').optional().isISO8601().toDate(),
  body('notes').optional().isLength({ max: 1000 }),
  body('is_active').optional().isBoolean(),
];

const listTransfersValidation = [
  body('q').optional().trim().isLength({ max: 100 }),
  body('productId').optional().isUUID(),
  body('fromBranchId').optional().isUUID(),
  body('toBranchId').optional().isUUID(),
  body('isActive').optional().isIn(['true','false']).withMessage('isActive must be true or false.'),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 10000 }),
];

module.exports = {
  transferIdValidation,
  createTransferValidation,
  updateTransferValidation,
  listTransfersValidation,
};
