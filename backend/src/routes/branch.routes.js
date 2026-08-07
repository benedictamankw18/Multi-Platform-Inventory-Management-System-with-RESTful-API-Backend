const express = require('express');
const router = express.Router();

const branchController = require('../controllers/branch.controller');
const authenticate = require('../middleware/auth.middleware');
const checkPermission = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const idempotency = require('../middleware/idempotency.middleware');
const {
  createBranchValidation,
  updateBranchValidation,
  branchIdValidation,
  idValidation,
  listBranchesValidation,
} = require('../validations/branch.validation');

router.get('/', authenticate, checkPermission('VIEW_BRANCHES'), listBranchesValidation, validate, branchController.listBranches);
router.post('/', authenticate, checkPermission('MANAGE_BRANCHES'), createBranchValidation, validate, idempotency('branches'), branchController.createBranch);
router.get('/search', authenticate, checkPermission('VIEW_BRANCHES'), listBranchesValidation, validate, branchController.searchBranches);
router.post('/:id/activate', authenticate, checkPermission('MANAGE_BRANCHES'), idValidation, validate, branchController.activateBranch);
router.post('/:id/deactivate', authenticate, checkPermission('MANAGE_BRANCHES'), idValidation, validate, branchController.deactivateBranch);
router.get('/:branchId', authenticate, checkPermission('VIEW_BRANCHES'), branchIdValidation, validate, branchController.getBranchById);
router.put('/:branchId', authenticate, checkPermission('MANAGE_BRANCHES'), branchIdValidation, updateBranchValidation, validate, branchController.updateBranch);
router.delete('/:branchId', authenticate, checkPermission('MANAGE_BRANCHES'), branchIdValidation, validate, branchController.deleteBranch);

module.exports = router;
