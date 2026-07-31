const express = require('express');
const router = express.Router();

const businessController = require('../controllers/business.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const upload = require('../middleware/upload.middleware');
const { upsertBusinessSettingValidation, bulkUpsertBusinessSettingValidation } = require('../validations/business.validation');

router.get('/', authenticate, businessController.listSettings);
router.get('/:key', authenticate, businessController.getSetting);
router.post('/', authenticate, checkPermission('MANAGE_SETTINGS'), upsertBusinessSettingValidation, validate, businessController.upsertSetting);
router.put('/', authenticate, checkPermission('MANAGE_SETTINGS'), bulkUpsertBusinessSettingValidation, validate, businessController.upsertSetting);
router.delete('/:setting_id', authenticate, checkPermission('MANAGE_SETTINGS'), businessController.deleteSetting);
router.post('/logo', authenticate, checkPermission('MANAGE_SETTINGS'), upload.single('image'), businessController.uploadLogo);

module.exports = router;
