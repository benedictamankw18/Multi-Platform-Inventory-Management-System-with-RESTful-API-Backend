const express = require('express');
const router = express.Router();

const productBatchController = require('../controllers/productBatch.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const {
  listBatchesValidation,
  getBatchByIdValidation,
  listBatchesByProductAndBranchValidation,
  disposeBatchValidation,
} = require('../validations/productBatch.validation');

// The batch ledger is written as a side effect of stock movements (purchases,
// sales, transfers) so the aggregate and the ledger stay consistent. Direct
// writes are limited to disposal of a specific lot.
router.get('/', authenticate, checkPermission('VIEW_INVENTORY'), listBatchesValidation, validate, productBatchController.listBatches);
router.get('/product/:product_id/branch/:branch_id', authenticate, checkPermission('VIEW_INVENTORY'), listBatchesByProductAndBranchValidation, validate, productBatchController.listBatchesByProductAndBranch);
router.post('/:batch_id/dispose', authenticate, checkPermission('MANAGE_INVENTORY'), disposeBatchValidation, validate, productBatchController.disposeBatch);
router.get('/:batch_id', authenticate, checkPermission('VIEW_INVENTORY'), getBatchByIdValidation, validate, productBatchController.getBatchById);

module.exports = router;