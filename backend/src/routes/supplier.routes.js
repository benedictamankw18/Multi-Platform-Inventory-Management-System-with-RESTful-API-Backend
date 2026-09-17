const express = require('express');
const router = express.Router();

const supplierController = require('../controllers/supplier.controller');
const supplierPaymentController = require('../controllers/supplierPayment.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const idempotency = require('../middleware/idempotency.middleware');
const { createSupplierValidation, updateSupplierValidation, supplierIdValidation, listSuppliersValidation } = require('../validations/supplier.validation');

router.post('/', authenticate, checkPermission('MANAGE_SUPPLIERS'), createSupplierValidation, validate, idempotency('suppliers'), supplierController.createSupplier);
router.post('/search', authenticate, checkPermission('VIEW_SUPPLIERS'), listSuppliersValidation, validate, supplierController.listSuppliers);
router.get('/:supplierId', authenticate, checkPermission('VIEW_SUPPLIERS'), supplierIdValidation, validate, supplierController.getSupplierById);
router.patch('/:supplierId', authenticate, checkPermission('MANAGE_SUPPLIERS'), supplierIdValidation, updateSupplierValidation, validate, supplierController.updateSupplier);
router.post('/:supplierId/deactivate', authenticate, checkPermission('MANAGE_SUPPLIERS'), supplierIdValidation, validate, supplierController.deactivateSupplier);
router.post('/:supplierId/reactivate', authenticate, checkPermission('MANAGE_SUPPLIERS'), supplierIdValidation, validate, supplierController.reactivateSupplier);

// payments for a supplier
router.get('/:supplierId/payments', authenticate, checkPermission('VIEW_SUPPLIERS'), supplierIdValidation, validate, supplierPaymentController.listPaymentsBySupplier);

module.exports = router;
