const express = require('express');
const router = express.Router();

const customerPaymentController = require('../controllers/customerPayment.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createCustomerPaymentValidation, listCustomerPaymentsValidation } = require('../validations/customerPayment.validation');

router.post('/', authenticate, createCustomerPaymentValidation, validate, customerPaymentController.createCustomerPayment);
router.get('/', authenticate, listCustomerPaymentsValidation, validate, customerPaymentController.listCustomerPayments);

module.exports = router;
