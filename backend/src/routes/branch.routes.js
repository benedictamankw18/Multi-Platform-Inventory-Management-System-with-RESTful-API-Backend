const express = require('express');
const router = express.Router();

const branchController = require('../controllers/branch.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  createBranchValidation,
  updateBranchValidation,
  branchIdValidation,
  idValidation,
  listBranchesValidation,
} = require('../validations/branch.validation');

router.get('/', authenticate, listBranchesValidation, validate, branchController.listBranches);
router.post('/', authenticate, createBranchValidation, validate, branchController.createBranch);
router.get('/search', authenticate, listBranchesValidation, validate, branchController.searchBranches);
router.post('/:id/activate', authenticate, idValidation, validate, branchController.activateBranch);
router.post('/:id/deactivate', authenticate, idValidation, validate, branchController.deactivateBranch);
router.get('/:branchId', authenticate, branchIdValidation, validate, branchController.getBranchById);
router.put('/:branchId', authenticate, branchIdValidation, updateBranchValidation, validate, branchController.updateBranch);
router.delete('/:branchId', authenticate, branchIdValidation, validate, branchController.deleteBranch);

module.exports = router;
