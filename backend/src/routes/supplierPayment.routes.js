const express = require('express');
const router = express.Router();

const supplierPaymentController = require('../controllers/supplierPayment.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createSupplierPaymentValidation } = require('../validations/supplierPayment.validation');

router.post('/', authenticate, createSupplierPaymentValidation, validate, supplierPaymentController.createSupplierPayment);

module.exports = router;
