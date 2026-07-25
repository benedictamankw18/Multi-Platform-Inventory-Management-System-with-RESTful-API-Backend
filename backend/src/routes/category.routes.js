const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/category.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const upload = require('../middleware/upload.middleware');
const { createCategoryValidation, updateCategoryValidation, categoryIdValidation, listCategoriesValidation } = require('../validations/category.validation');

router.post('/', authenticate, checkPermission('MANAGE_CATEGORIES'), createCategoryValidation, validate, categoryController.createCategory);
router.post('/search', authenticate, checkPermission('VIEW_CATEGORIES'), listCategoriesValidation, validate, categoryController.listCategories);
router.get('/:categoryId', authenticate, checkPermission('VIEW_CATEGORIES'), categoryIdValidation, validate, categoryController.getCategoryById);
router.patch('/:categoryId', authenticate, checkPermission('MANAGE_CATEGORIES'), categoryIdValidation, updateCategoryValidation, validate, categoryController.updateCategory);
router.post('/:categoryId/deactivate', authenticate, checkPermission('MANAGE_CATEGORIES'), categoryIdValidation, validate, categoryController.deactivateCategory);
router.post('/:categoryId/activate', authenticate, checkPermission('MANAGE_CATEGORIES'), categoryIdValidation, validate, categoryController.activateCategory);
router.post('/:categoryId/image', authenticate, checkPermission('MANAGE_CATEGORIES'), categoryIdValidation, validate, upload.single('image'), categoryController.uploadCategoryImage);

module.exports = router;
