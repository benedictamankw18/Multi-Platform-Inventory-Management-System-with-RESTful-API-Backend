const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const productImageController = require('../controllers/productImage.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const idempotency = require('../middleware/idempotency.middleware');
const productImageUpload = require('../middleware/productImageUpload.middleware');
const { createProductValidation, updateProductValidation, productIdValidation, listProductsValidation } = require('../validations/product.validation');
const {
  createProductImageValidation,
  updateProductImageValidation,
  productImageBodyValidation,
  productIdValidation: productImageProductIdValidation,
} = require('../validations/productImage.validation');

// Public (or protected depending on your RBAC) product endpoints
router.post('/', authenticate, checkPermission('CREATE_PRODUCT'), createProductValidation, validate, idempotency('products'), productController.createProduct);
router.post('/search', authenticate, checkPermission('VIEW_PRODUCTS'), listProductsValidation, validate, productController.listProducts);
router.post('/:id/images', authenticate, checkPermission('CREATE_PRODUCT'), createProductImageValidation, validate, productImageUpload, productImageBodyValidation, validate, productImageController.addProductImage);
router.patch('/:id/images', authenticate, checkPermission('CREATE_PRODUCT'), updateProductImageValidation, validate, productImageUpload, productImageBodyValidation, validate, productImageController.updateProductImage);
router.get('/:id/images', authenticate, checkPermission('VIEW_PRODUCTS'), productImageProductIdValidation, validate, productImageController.getProductImages);
router.get('/:productId', authenticate, checkPermission('VIEW_PRODUCTS'), productIdValidation, validate, productController.getProductById);
router.patch('/:productId', authenticate, checkPermission('CREATE_PRODUCT'), productIdValidation, updateProductValidation, validate, productController.updateProduct);
router.post('/:productId/deactivate', authenticate, checkPermission('CREATE_PRODUCT'), productIdValidation, validate, productController.deactivateProduct);
router.post('/:productId/reactivate', authenticate, checkPermission('CREATE_PRODUCT'), productIdValidation, validate, productController.activateProduct);

module.exports = router;
