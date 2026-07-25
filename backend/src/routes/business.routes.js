const express = require('express');
const router = express.Router();

const businessController = require('../controllers/business.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const { upsertBusinessSettingValidation } = require('../validations/business.validation');

router.get('/', authenticate, checkPermission('MANAGE_SETTINGS'), businessController.listSettings);
router.get('/:key', authenticate, checkPermission('MANAGE_SETTINGS'), businessController.getSetting);
router.post('/', authenticate, checkPermission('MANAGE_SETTINGS'), upsertBusinessSettingValidation, validate, businessController.upsertSetting);
router.put('/', authenticate, checkPermission('MANAGE_SETTINGS'), upsertBusinessSettingValidation, validate, businessController.upsertSetting);
router.delete('/:setting_id', authenticate, checkPermission('MANAGE_SETTINGS'), businessController.deleteSetting);

module.exports = router;
