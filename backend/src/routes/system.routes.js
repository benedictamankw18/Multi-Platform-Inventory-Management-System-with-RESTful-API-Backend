const express = require('express');
const router = express.Router();

const systemController = require('../controllers/system.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  settingKeyParamValidation,
  upsertSystemValidation,
  updateSystemValidation,
  listSystemValidation,
} = require('../validations/system.validation');

router.get('/', authenticate, listSystemValidation, validate, systemController.listSettings);
router.post('/', authenticate, upsertSystemValidation, validate, systemController.upsertSetting);
router.get('/:key', authenticate, settingKeyParamValidation, validate, systemController.getSetting);
router.put('/:key', authenticate, updateSystemValidation, validate, systemController.updateSetting);
router.delete('/:key', authenticate, settingKeyParamValidation, validate, systemController.deleteSetting);

module.exports = router;
