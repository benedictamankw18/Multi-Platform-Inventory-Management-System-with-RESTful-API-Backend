const express = require('express');
const router = express.Router();

const purchaseController = require('../controllers/purchase.controller');
const purchaseItemController = require('../controllers/purchaseItem.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const { body } = require('express-validator');
const { createPurchaseValidation, updatePurchaseValidation, purchaseIdValidation, listPurchasesValidation } = require('../validations/purchase.validation');
const { purchaseIdParam,
        createPurchaseItemValidation,
        updatePurchaseItemValidation
    } = require('../validations/purchaseItem.validation');


router.post('/', authenticate, checkPermission('MANAGE_PURCHASES'), createPurchaseValidation, validate, purchaseController.createPurchase);
router.post('/search', authenticate, checkPermission('VIEW_PURCHASES'), listPurchasesValidation, validate, purchaseController.listPurchases);
router.get('/:purchaseId', authenticate, checkPermission('VIEW_PURCHASES'), purchaseIdValidation, validate, purchaseController.getPurchaseById);
router.patch('/:purchaseId', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseIdValidation, updatePurchaseValidation, validate, purchaseController.updatePurchase);
router.post('/:purchaseId/deactivate', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseIdValidation, validate, purchaseController.deactivatePurchase);
router.post('/:purchaseId/reactivate', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseIdValidation, validate, purchaseController.reactivatePurchase);

// actions
router.post('/:purchaseId/submit', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseIdValidation, validate, purchaseController.submitPurchase);
router.post('/:purchaseId/approve', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseIdValidation, validate, purchaseController.approvePurchase);
router.post('/:purchaseId/receive', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseIdValidation, validate, purchaseController.receivePurchase);
router.post('/:purchaseId/payments', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseIdValidation, [
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('payment_method').optional().isString(),
  body('payment_date').optional().isISO8601().toDate(),
  body('reference_number').optional().isString(),
], validate, purchaseController.recordPayment);

// purchase order items
router.post('/:purchaseId/items', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseIdValidation, createPurchaseItemValidation, validate, purchaseItemController.createPurchaseItem);
router.get('/:purchaseId/items', authenticate, checkPermission('VIEW_PURCHASES'), purchaseIdValidation, validate, purchaseItemController.listPurchaseItems);
router.patch('/:purchaseId/items/:itemId', authenticate, checkPermission('MANAGE_PURCHASES'), updatePurchaseItemValidation, validate, purchaseItemController.updatePurchaseItem);
router.delete('/:purchaseId/items/:itemId', authenticate, checkPermission('MANAGE_PURCHASES'), purchaseItemController.deletePurchaseItem);

module.exports = router;
