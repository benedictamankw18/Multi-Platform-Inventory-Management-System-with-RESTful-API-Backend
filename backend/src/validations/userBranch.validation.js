const { body, param } = require('express-validator');

exports.createUserBranchValidation = [
  body('user_id').exists().isUUID().withMessage('Invalid user_id.'),
  body('branch_id').exists().isUUID().withMessage('Invalid branch_id.'),
];

exports.deleteUserBranchValidation = [
  // support both URL params and body
  param('userId').optional().isUUID().withMessage('Invalid userId.'),
  param('branchId').optional().isUUID().withMessage('Invalid branchId.'),
  body('user_id').optional().isUUID().withMessage('Invalid user_id.'),
  body('branch_id').optional().isUUID().withMessage('Invalid branch_id.'),
];
