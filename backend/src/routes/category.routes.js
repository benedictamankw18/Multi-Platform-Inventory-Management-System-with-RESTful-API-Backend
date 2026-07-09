const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/category.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createCategoryValidation, updateCategoryValidation, categoryIdValidation, listCategoriesValidation } = require('../validations/category.validation');

router.post('/', authenticate, createCategoryValidation, validate, categoryController.createCategory);
router.post('/search', authenticate, listCategoriesValidation, validate, categoryController.listCategories);
router.get('/:categoryId', authenticate, categoryIdValidation, validate, categoryController.getCategoryById);
router.patch('/:categoryId', authenticate, categoryIdValidation, updateCategoryValidation, validate, categoryController.updateCategory);
router.post('/:categoryId/deactivate', authenticate, categoryIdValidation, validate, categoryController.deactivateCategory);
router.post('/:categoryId/activate', authenticate, categoryIdValidation, validate, categoryController.activateCategory);

module.exports = router;
