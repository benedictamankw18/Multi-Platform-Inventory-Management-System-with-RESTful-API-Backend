const express = require('express');
const router = express.Router();

const businessController = require('../controllers/business.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { upsertBusinessSettingValidation } = require('../validations/business.validation');

router.get('/', authenticate, businessController.listSettings);
router.get('/:key', authenticate, businessController.getSetting);
router.post('/', authenticate, upsertBusinessSettingValidation, validate, businessController.upsertSetting);
router.put('/', authenticate, upsertBusinessSettingValidation, validate, businessController.upsertSetting);
router.delete('/:setting_id', authenticate, businessController.deleteSetting);

module.exports = router;
