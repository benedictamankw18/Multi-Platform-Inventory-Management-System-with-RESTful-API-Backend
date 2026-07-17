const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const controller = require('../controllers/adminQueue.controller');

// GET /api/v1/admin/queue?status=...&type=...&limit=50&offset=0
router.get('/', authenticate, authorize('Administrator'), controller.list);

module.exports = router;
