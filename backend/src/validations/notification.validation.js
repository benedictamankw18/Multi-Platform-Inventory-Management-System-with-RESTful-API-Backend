const { body,  param, query } = require('express-validator');

const createNotificationValidation = [
  body('title').isString().notEmpty().withMessage('title is required'),
  body('branch_id').isUUID().withMessage('branch_id is required'),
  body('message').isString().notEmpty().withMessage('message is required'),
  body('type').optional().isIn(['INFO','WARNING','ERROR','SUCCESS','OTHER','TRANSFER_REQUEST','BRANCH_SHORTAGE','SYNC_FAILURE','LOW_STOCK']),
  body('priority').optional().isIn(['LOW','NORMAL', 'HIGH', 'URGENT']),
  body('recipients').isArray({ min: 1 }).withMessage('recipients must be a non-empty array'),
  body('recipients.*').isUUID().withMessage('each recipient must be a valid UUID'),
  body('channels').optional().isArray().withMessage('channels must be an array'),
  body('channels.*').optional().isIn(['in_app', 'email', 'sms']).withMessage('each channel must be in_app, email, or sms'),
];

const notificationIdValidation = [
  param('notificationId').isUUID().withMessage('notificationId must be a UUID'),
];

const NOTIFICATION_TYPES = ['INFO','WARNING','ERROR','SUCCESS','OTHER','TRANSFER_REQUEST','BRANCH_SHORTAGE','SYNC_FAILURE','LOW_STOCK'];

const listNotificationsValidation = [
  query('isRead').optional().isIn(['true','false']).withMessage('isRead must be true or false'),
  query('type').optional().isIn(NOTIFICATION_TYPES).withMessage('Invalid notification type'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('q').optional().isString(),
];

module.exports = {
  createNotificationValidation,
  listNotificationsValidation,
  notificationIdValidation,
};
