const express = require('express');
const router = express.Router();

const inventoryController = require('../controllers/inventory.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const { createInventoryValidation, updateInventoryValidation, inventoryIdValidation, listInventoriesValidation } = require('../validations/inventory.validation');

router.post('/', authenticate, checkPermission('MANAGE_INVENTORY'), createInventoryValidation, validate, inventoryController.createInventory);
router.post('/search', authenticate, checkPermission('VIEW_INVENTORY'), listInventoriesValidation, validate, inventoryController.listInventories);
router.get('/:inventoryId', authenticate, checkPermission('VIEW_INVENTORY'), inventoryIdValidation, validate, inventoryController.getInventoryById);
router.patch('/:inventoryId', authenticate, checkPermission('MANAGE_INVENTORY'), inventoryIdValidation, updateInventoryValidation, validate, inventoryController.updateInventory);
router.post('/:inventoryId/deactivate', authenticate, checkPermission('MANAGE_INVENTORY'), inventoryIdValidation, validate, inventoryController.deactivateInventory);
router.post('/:inventoryId/activate', authenticate, checkPermission('MANAGE_INVENTORY'), inventoryIdValidation, validate, inventoryController.activateInventory);

module.exports = router;
