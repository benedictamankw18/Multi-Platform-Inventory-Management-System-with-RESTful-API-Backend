const express = require('express');
const router = express.Router();

const supplierController = require('../controllers/supplier.controller');
const supplierPaymentController = require('../controllers/supplierPayment.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createSupplierValidation, updateSupplierValidation, supplierIdValidation, listSuppliersValidation } = require('../validations/supplier.validation');

router.post('/', authenticate, createSupplierValidation, validate, supplierController.createSupplier);
router.post('/search', authenticate, listSuppliersValidation, validate, supplierController.listSuppliers);
router.get('/:supplierId', authenticate, supplierIdValidation, validate, supplierController.getSupplierById);
router.patch('/:supplierId', authenticate, supplierIdValidation, updateSupplierValidation, validate, supplierController.updateSupplier);
router.post('/:supplierId/deactivate', authenticate, supplierIdValidation, validate, supplierController.deactivateSupplier);
router.post('/:supplierId/reactivate', authenticate, supplierIdValidation, validate, supplierController.reactivateSupplier);

// payments for a supplier
router.get('/:supplierId/payments', authenticate, supplierIdValidation, validate, supplierPaymentController.listPaymentsBySupplier);

module.exports = router;
