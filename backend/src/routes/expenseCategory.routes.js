const express = require('express');
const router = express.Router();

const expenseCategoryController = require('../controllers/expenseCategory.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const { createExpenseCategoryValidation, updateExpenseCategoryValidation, categoryIdValidation, listExpenseCategoriesValidation } = require('../validations/expenseCategory.validation');

router.get('/', authenticate, checkPermission('VIEW_EXPENSES'), listExpenseCategoriesValidation, validate, expenseCategoryController.listExpenseCategories);
router.post('/', authenticate, checkPermission('MANAGE_EXPENSES'), createExpenseCategoryValidation, validate, expenseCategoryController.createExpenseCategory);
router.get('/:categoryId', authenticate, checkPermission('VIEW_EXPENSES'), categoryIdValidation, validate, expenseCategoryController.getExpenseCategoryById);
router.put('/:categoryId', authenticate, checkPermission('MANAGE_EXPENSES'), categoryIdValidation, updateExpenseCategoryValidation, validate, expenseCategoryController.updateExpenseCategory);
router.delete('/:categoryId', authenticate, checkPermission('MANAGE_EXPENSES'), categoryIdValidation, validate, expenseCategoryController.deleteExpenseCategory);

module.exports = router;
