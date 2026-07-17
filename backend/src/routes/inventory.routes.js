const express = require('express');
const router = express.Router();

const inventoryController = require('../controllers/inventory.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createInventoryValidation, updateInventoryValidation, inventoryIdValidation, listInventoriesValidation } = require('../validations/inventory.validation');

router.post('/', authenticate, createInventoryValidation, validate, inventoryController.createInventory);
router.post('/search', authenticate, listInventoriesValidation, validate, inventoryController.listInventories);
router.get('/:inventoryId', authenticate, inventoryIdValidation, validate, inventoryController.getInventoryById);
router.patch('/:inventoryId', authenticate, inventoryIdValidation, updateInventoryValidation, validate, inventoryController.updateInventory);
router.post('/:inventoryId/deactivate', authenticate, inventoryIdValidation, validate, inventoryController.deactivateInventory);
router.post('/:inventoryId/activate', authenticate, inventoryIdValidation, validate, inventoryController.activateInventory);

module.exports = router;
