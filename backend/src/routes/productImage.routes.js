const express = require('express');
const router = express.Router();

const productImageController = require('../controllers/productImage.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const { productImageIdValidation } = require('../validations/productImage.validation');

router.use(authenticate);
router.use(checkPermission('CREATE_PRODUCT'));

router.patch('/:id/primary', productImageIdValidation, validate, productImageController.setPrimaryImage);
router.delete('/:id', productImageIdValidation, validate, productImageController.deleteProductImage);

module.exports = router;
