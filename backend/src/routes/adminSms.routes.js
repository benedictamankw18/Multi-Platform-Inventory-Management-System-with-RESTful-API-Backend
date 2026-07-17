const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const controller = require('../controllers/adminSms.controller');

// POST /api/v1/admin/sms/test  { to, message }
router.post('/test', authenticate, authorize('Administrator'), controller.sendTest);

module.exports = router;
