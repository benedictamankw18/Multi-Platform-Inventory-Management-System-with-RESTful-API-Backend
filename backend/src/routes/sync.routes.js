const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { pushValidation, pullValidation, logsValidation, retryValidation, pushEntityValidation } = require('../validations/sync.validation');

// entity is the table or resource name, e.g. 'products', 'inventories'
router.get('/:entity/last', authenticate, syncController.getLastSync);
router.get('/:entity/pull', authenticate, syncController.pull);
router.post('/:entity/push', pushEntityValidation, authenticate, syncController.push);

// Global sync endpoints
router.post('/push', authenticate, pushValidation, validate, syncController.pushGlobal);
router.post('/pull', authenticate, pullValidation, validate, syncController.pullGlobal);
router.get('/logs', authenticate, logsValidation, validate, syncController.listLogs);
router.post('/retry', authenticate, retryValidation, validate, syncController.retry);

module.exports = router;
