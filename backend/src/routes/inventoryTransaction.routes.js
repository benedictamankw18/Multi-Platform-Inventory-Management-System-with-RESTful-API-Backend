const express = require('express');
const router = express.Router();

const invTransactionController = require('../controllers/inventoryTransaction.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const idempotency = require('../middleware/idempotency.middleware');
const { createTransactionValidation, transactionIdValidation, listTransactionsValidation } = require('../validations/inventoryTransaction.validation');

router.post('/', authenticate, checkPermission('MANAGE_INVENTORY'), createTransactionValidation, validate, idempotency('inventory-transactions'), invTransactionController.createTransaction);
router.get('/', authenticate, checkPermission('VIEW_INVENTORY'), listTransactionsValidation, validate, invTransactionController.listTransactions);
router.get('/:transactionId', authenticate, checkPermission('VIEW_INVENTORY'), transactionIdValidation, validate, invTransactionController.getTransactionById);

module.exports = router;
