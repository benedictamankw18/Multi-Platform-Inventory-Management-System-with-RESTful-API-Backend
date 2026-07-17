const { body,  param, query } = require('express-validator');

const createNotificationValidation = [
  body('title').isString().notEmpty().withMessage('title is required'),
  body('branch_id').isUUID().withMessage('branch_id is required'),
  body('message').isString().notEmpty().withMessage('message is required'),
  body('type').optional().isIn(['INFO','WARNING','ERROR','SUCCESS','OTHER','TRANSFER_REQUEST','BRANCH_SHORTAGE','SYNC_FAILURE','LOW_STOCK']),
  body('priority').optional().isIn(['LOW','NORMAL', 'HIGH', 'URGENT']),
  body('recipients').isArray().isUUID(),
];

const notificationIdValidation = [
  param('notificationId').isUUID().withMessage('notificationId must be a UUID'),
];

const listNotificationsValidation = [
  query('isRead').optional().isIn(['true','false']).withMessage('isRead must be true or false'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('q').optional().isString(),
];

module.exports = {
  createNotificationValidation,
  listNotificationsValidation,
  notificationIdValidation,
};
