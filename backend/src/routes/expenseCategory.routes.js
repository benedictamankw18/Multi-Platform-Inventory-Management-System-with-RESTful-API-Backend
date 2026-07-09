const express = require('express');
const router = express.Router();

const expenseCategoryController = require('../controllers/expenseCategory.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createExpenseCategoryValidation, updateExpenseCategoryValidation, categoryIdValidation, listExpenseCategoriesValidation } = require('../validations/expenseCategory.validation');

router.get('/', authenticate, listExpenseCategoriesValidation, validate, expenseCategoryController.listExpenseCategories);
router.post('/', authenticate, createExpenseCategoryValidation, validate, expenseCategoryController.createExpenseCategory);
router.get('/:categoryId', authenticate, categoryIdValidation, validate, expenseCategoryController.getExpenseCategoryById);
router.put('/:categoryId', authenticate, categoryIdValidation, updateExpenseCategoryValidation, validate, expenseCategoryController.updateExpenseCategory);
router.delete('/:categoryId', authenticate, categoryIdValidation, validate, expenseCategoryController.deleteExpenseCategory);

module.exports = router;
