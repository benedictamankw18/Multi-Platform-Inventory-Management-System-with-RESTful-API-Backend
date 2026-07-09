const express = require('express');
const router = express.Router();

const productImageController = require('../controllers/productImage.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { productImageIdValidation } = require('../validations/productImage.validation');

router.delete('/:id', authenticate, productImageIdValidation, validate, productImageController.deleteProductImage);

module.exports = router;
