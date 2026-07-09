const express = require('express');
const router = express.Router();

const sessionsController = require('../controllers/sessions.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { param } = require('express-validator');

router.use(authenticate);

router.get('/', sessionsController.listMySessions);
router.delete('/:id', [param('id').isUUID()], validate, sessionsController.revokeSession);

module.exports = router;
