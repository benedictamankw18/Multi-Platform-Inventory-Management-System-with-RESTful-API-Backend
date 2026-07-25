const express = require('express');
const router = express.Router();

const systemController = require('../controllers/system.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const {
  settingKeyParamValidation,
  upsertSystemValidation,
  updateSystemValidation,
  listSystemValidation,
} = require('../validations/system.validation');

router.get('/', authenticate, checkPermission('MANAGE_SETTINGS'), listSystemValidation, validate, systemController.listSettings);
router.post('/', authenticate, checkPermission('MANAGE_SETTINGS'), upsertSystemValidation, validate, systemController.upsertSetting);
router.get('/:key', authenticate, checkPermission('MANAGE_SETTINGS'), settingKeyParamValidation, validate, systemController.getSetting);
router.put('/:key', authenticate, checkPermission('MANAGE_SETTINGS'), updateSystemValidation, validate, systemController.updateSetting);
router.delete('/:key', authenticate, checkPermission('MANAGE_SETTINGS'), settingKeyParamValidation, validate, systemController.deleteSetting);

module.exports = router;
