const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createNotificationValidation, notificationIdValidation, listNotificationsValidation } = require('../validations/notification.validation');

router.get('/', authenticate, listNotificationsValidation, validate, notificationController.listNotifications);
router.get('/me', authenticate, listNotificationsValidation, validate, notificationController.listNotifications);
router.post('/', authenticate, createNotificationValidation, validate, notificationController.createNotification);
router.patch('/:notificationId/read', authenticate, notificationIdValidation, validate, notificationController.markAsRead);
router.delete('/:notificationId', authenticate, notificationIdValidation, validate, notificationController.deleteNotification);
router.get('/:notificationId', authenticate, notificationIdValidation, validate, notificationController.getNotificationById);
router.patch('/:notificationId', authenticate, notificationIdValidation, validate, notificationController.updateNotification);

module.exports = router;
