const express = require('express');
const router = express.Router();

const invTransactionController = require('../controllers/inventoryTransaction.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createTransactionValidation, transactionIdValidation, listTransactionsValidation } = require('../validations/inventoryTransaction.validation');

router.post('/', authenticate, createTransactionValidation, validate, invTransactionController.createTransaction);
router.get('/', authenticate, listTransactionsValidation, validate, invTransactionController.listTransactions);
router.get('/:transactionId', authenticate, transactionIdValidation, validate, invTransactionController.getTransactionById);

module.exports = router;
