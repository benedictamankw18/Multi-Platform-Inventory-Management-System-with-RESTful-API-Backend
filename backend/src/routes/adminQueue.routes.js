const express = require('express');
const router = express.Router();
const { param } = require('express-validator');

const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validation.middleware');
const controller = require('../controllers/adminQueue.controller');

// GET /api/v1/admin/queue?status=...&type=...&limit=50&offset=0
router.get('/', authenticate, authorize('Administrator'), controller.list);

// POST /api/v1/admin/queue/:id/resend - requeue a stuck PROCESSING / FAILED message
router.post(
  '/:id/resend',
  authenticate,
  authorize('Administrator'),
  param('id').isUUID().withMessage('id must be a UUID'),
  validate,
  controller.resend
);

module.exports = router;
