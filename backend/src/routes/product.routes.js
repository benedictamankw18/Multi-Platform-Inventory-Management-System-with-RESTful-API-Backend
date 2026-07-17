const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const productImageController = require('../controllers/productImage.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const productImageUpload = require('../middleware/productImageUpload.middleware');
const { createProductValidation, updateProductValidation, productIdValidation, listProductsValidation } = require('../validations/product.validation');
const {
  createProductImageValidation,
  updateProductImageValidation,
  productImageBodyValidation,
  productIdValidation: productImageProductIdValidation,
} = require('../validations/productImage.validation');

// Public (or protected depending on your RBAC) product endpoints
router.post('/', authenticate, createProductValidation, validate, productController.createProduct);
router.post('/search', authenticate, listProductsValidation, validate, productController.listProducts);
router.post('/:id/images', authenticate, createProductImageValidation, validate, productImageUpload, productImageBodyValidation, validate, productImageController.addProductImage);
router.patch('/:id/images', authenticate, updateProductImageValidation, validate, productImageUpload, productImageBodyValidation, validate, productImageController.updateProductImage);
router.get('/:id/images', authenticate, productImageProductIdValidation, validate, productImageController.getProductImages);
router.get('/:productId', authenticate, productIdValidation, validate, productController.getProductById);
router.patch('/:productId', authenticate, productIdValidation, updateProductValidation, validate, productController.updateProduct);
router.post('/:productId/deactivate', authenticate, productIdValidation, validate, productController.deactivateProduct);
router.post('/:productId/reactivate', authenticate, productIdValidation, validate, productController.activateProduct);

module.exports = router;
