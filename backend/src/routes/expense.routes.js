const express = require('express');
const router = express.Router();

const expenseController = require('../controllers/expense.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createExpenseValidation, updateExpenseValidation, expenseIdValidation, listExpensesValidation } = require('../validations/expense.validation');

router.get('/', authenticate, listExpensesValidation, validate, expenseController.listExpenses);
router.post('/', authenticate, createExpenseValidation, validate, expenseController.createExpense);
router.get('/export', authenticate, expenseController.exportExpenses);
router.get('/:expenseId', authenticate, expenseIdValidation, validate, expenseController.getExpenseById);
router.put('/:expenseId', authenticate, expenseIdValidation, updateExpenseValidation, validate, expenseController.updateExpense);
router.delete('/:expenseId', authenticate, expenseIdValidation, validate, expenseController.deleteExpense);

module.exports = router;
