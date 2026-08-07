const express = require('express');
const router = express.Router();

const expenseController = require('../controllers/expense.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const idempotency = require('../middleware/idempotency.middleware');
const { createExpenseValidation, updateExpenseValidation, expenseIdValidation, listExpensesValidation } = require('../validations/expense.validation');

router.get('/', authenticate, checkPermission('VIEW_EXPENSES'), listExpensesValidation, validate, expenseController.listExpenses);
router.post('/', authenticate, checkPermission('MANAGE_EXPENSES'), createExpenseValidation, validate, idempotency('expenses'), expenseController.createExpense);
router.get('/export', authenticate, checkPermission('VIEW_EXPENSES'), expenseController.exportExpenses);
router.get('/:expenseId', authenticate, checkPermission('VIEW_EXPENSES'), expenseIdValidation, validate, expenseController.getExpenseById);
router.put('/:expenseId', authenticate, checkPermission('MANAGE_EXPENSES'), expenseIdValidation, updateExpenseValidation, validate, expenseController.updateExpense);
router.delete('/:expenseId', authenticate, checkPermission('MANAGE_EXPENSES'), expenseIdValidation, validate, expenseController.deleteExpense);

module.exports = router;
