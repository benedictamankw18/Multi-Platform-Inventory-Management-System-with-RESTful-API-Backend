const express = require('express');
const router = express.Router();

const productBranchInventoryController = require('../controllers/productBranchInventory.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  createInventoryRecordValidation,
  listInventoryRecordsValidation,
} = require('../validations/productBranchInventory.validation');

router.use(authenticate);

router.get('/', listInventoryRecordsValidation, validate, productBranchInventoryController.listInventoryRecords);
router.post('/', createInventoryRecordValidation, validate, productBranchInventoryController.createInventoryRecord);

module.exports = router;
