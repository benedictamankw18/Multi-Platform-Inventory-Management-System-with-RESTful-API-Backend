const express = require('express');
const router = express.Router();

const purchaseController = require('../controllers/purchase.controller');
const purchaseItemController = require('../controllers/purchaseItem.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createPurchaseValidation, updatePurchaseValidation, purchaseIdValidation, listPurchasesValidation } = require('../validations/purchase.validation');
const { purchaseIdParam,
        createPurchaseItemValidation,
        updatePurchaseItemValidation
    } = require('../validations/purchaseItem.validation');


router.post('/', authenticate, createPurchaseValidation, validate, purchaseController.createPurchase);
router.post('/search', authenticate, listPurchasesValidation, validate, purchaseController.listPurchases);
router.get('/:purchaseId', authenticate, purchaseIdValidation, validate, purchaseController.getPurchaseById);
router.patch('/:purchaseId', authenticate, purchaseIdValidation, updatePurchaseValidation, validate, purchaseController.updatePurchase);
router.post('/:purchaseId/deactivate', authenticate, purchaseIdValidation, validate, purchaseController.deactivatePurchase);
router.post('/:purchaseId/reactivate', authenticate, purchaseIdValidation, validate, purchaseController.reactivatePurchase);

// actions
router.post('/:purchaseId/submit', authenticate, purchaseIdValidation, validate, purchaseController.submitPurchase);
router.post('/:purchaseId/approve', authenticate, purchaseIdValidation, validate, purchaseController.approvePurchase);
router.post('/:purchaseId/receive', authenticate, purchaseIdValidation, validate, purchaseController.receivePurchase);

// purchase order items
router.post('/:purchaseId/items', authenticate, purchaseIdValidation, createPurchaseItemValidation, validate, purchaseItemController.createPurchaseItem);
router.get('/:purchaseId/items', authenticate, purchaseIdValidation, validate, purchaseItemController.listPurchaseItems);
router.patch('/:purchaseId/items/:itemId', authenticate, updatePurchaseItemValidation, validate, purchaseItemController.updatePurchaseItem);
router.delete('/:purchaseId/items/:itemId', authenticate, purchaseItemController.deletePurchaseItem);

module.exports = router;
