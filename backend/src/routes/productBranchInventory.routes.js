const express = require('express');
const router = express.Router();

const productBranchInventoryController = require('../controllers/productBranchInventory.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  createInventoryRecordValidation,
  listInventoryRecordsValidation,
  updateInventoryRecordValidation,
  getInventoryByIdValidation,
  getInventoryByProductAndBranchValidation,
  deleteInventoryRecordValidation,
} = require('../validations/productBranchInventory.validation');

router.use(authenticate);

router.get('/', listInventoryRecordsValidation, validate, productBranchInventoryController.listInventoryRecords);
router.post('/', createInventoryRecordValidation, validate, productBranchInventoryController.createInventoryRecord);
router.put('/:inventory_id', updateInventoryRecordValidation, validate, productBranchInventoryController.updateInventoryRecord);
router.get('/:inventory_id', getInventoryByIdValidation, validate, productBranchInventoryController.getInventoryById);
router.get('/product/:product_id/branch/:branch_id', getInventoryByProductAndBranchValidation, validate, productBranchInventoryController.getInventoryByProductAndBranch);
router.delete('/:inventory_id', deleteInventoryRecordValidation, validate, productBranchInventoryController.deleteInventoryRecord);

module.exports = router;
