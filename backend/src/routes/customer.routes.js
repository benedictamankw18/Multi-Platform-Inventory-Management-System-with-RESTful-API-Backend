const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customer.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const { createCustomerValidation, updateCustomerValidation, customerIdValidation, listCustomersValidation } = require('../validations/customer.validation');
const customerPaymentController = require('../controllers/customerPayment.controller');
const { customerIdParam } = require('../validations/customerPayment.validation');

router.post('/', authenticate, checkPermission('MANAGE_CUSTOMERS'), createCustomerValidation, validate, customerController.createCustomer);
router.post('/search', authenticate, checkPermission('VIEW_CUSTOMERS'), listCustomersValidation, validate, customerController.listCustomers);
router.get('/:customerId', authenticate, checkPermission('VIEW_CUSTOMERS'), customerIdValidation, validate, customerController.getCustomerById);
router.patch('/:customerId', authenticate, checkPermission('MANAGE_CUSTOMERS'), customerIdValidation, updateCustomerValidation, validate, customerController.updateCustomer);
router.post('/:customerId/deactivate', authenticate, checkPermission('MANAGE_CUSTOMERS'), customerIdValidation, validate, customerController.deactivateCustomer);
router.post('/:customerId/activate', authenticate, checkPermission('MANAGE_CUSTOMERS'), customerIdValidation, validate, customerController.activateCustomer);
router.get('/:customerId/payments', authenticate, checkPermission('VIEW_CUSTOMERS'), customerIdValidation, validate, customerPaymentController.listPaymentsByCustomer);
router.post('/:customerId/import', authenticate, checkPermission('MANAGE_CUSTOMERS'), customerIdValidation, validate, (req, res) => res.status(501).json({ message: 'Import not implemented' }));
router.get('/:customerId/export', authenticate, checkPermission('VIEW_CUSTOMERS'), customerIdValidation, validate, (req, res) => res.status(501).json({ message: 'Export not implemented' }));

module.exports = router;
