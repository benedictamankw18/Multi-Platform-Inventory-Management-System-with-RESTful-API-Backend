const express = require('express');
const router = express.Router();

const uomController = require('../controllers/uom.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  createUomValidation,
  updateUomValidation,
  uomIdValidation,
  listUomsValidation,
} = require('../validations/uom.validation');

router.get('/', authenticate, listUomsValidation, validate, uomController.listUoms);
router.post('/', authenticate, createUomValidation, validate, uomController.createUom);
router.get('/:id', authenticate, uomIdValidation, validate, uomController.getUomById);
router.put('/:id', authenticate, updateUomValidation, validate, uomController.updateUom);
router.delete('/:id', authenticate, uomIdValidation, validate, uomController.deleteUom);

module.exports = router;
