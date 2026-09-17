const express = require('express');
const router = express.Router();

const uomController = require('../controllers/uom.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const {
  createUomValidation,
  updateUomValidation,
  uomIdValidation,
  listUomsValidation,
} = require('../validations/uom.validation');

router.get('/', authenticate, checkPermission('VIEW_CATEGORIES'), listUomsValidation, validate, uomController.listUoms);
router.post('/', authenticate, checkPermission('MANAGE_CATEGORIES'), createUomValidation, validate, uomController.createUom);
router.get('/:id', authenticate, checkPermission('VIEW_CATEGORIES'), uomIdValidation, validate, uomController.getUomById);
router.put('/:id', authenticate, checkPermission('MANAGE_CATEGORIES'), updateUomValidation, validate, uomController.updateUom);
router.delete('/:id', authenticate, checkPermission('MANAGE_CATEGORIES'), uomIdValidation, validate, uomController.deleteUom);

module.exports = router;
