const express = require('express');
const router = express.Router();

const supplierPaymentController = require('../controllers/supplierPayment.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const idempotency = require('../middleware/idempotency.middleware');
const { createSupplierPaymentValidation, paymentIdValidation, updateSupplierPaymentValidation, listSupplierPaymentsValidation } = require('../validations/supplierPayment.validation');

router.get('/', authenticate, checkPermission('VIEW_SUPPLIERS'), supplierPaymentController.listAllPayments);
router.post('/', authenticate, createSupplierPaymentValidation, validate, idempotency('supplier-payments'), supplierPaymentController.createSupplierPayment);
router.get('/:paymentId', authenticate, paymentIdValidation, validate, supplierPaymentController.getPaymentById);
router.put('/:paymentId', authenticate, paymentIdValidation, updateSupplierPaymentValidation, validate, supplierPaymentController.updatePayment);
router.delete('/:paymentId', authenticate, paymentIdValidation, validate, supplierPaymentController.deletePayment);
router.get('/supplier/:supplierId', authenticate, listSupplierPaymentsValidation, validate, supplierPaymentController.listPaymentsBySupplier);
module.exports = router;
