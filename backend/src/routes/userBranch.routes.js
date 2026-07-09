const express = require('express');
const router = express.Router();

const userBranchController = require('../controllers/userBranch.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validation.middleware');
const { createUserBranchValidation, deleteUserBranchValidation } = require('../validations/userBranch.validation');

// Only administrators/business owners may assign branches
router.use(authenticate, authorize('Administrator', 'Business Owner'));

router.post('/', createUserBranchValidation, validate, userBranchController.createUserBranch);

// Delete by URL params: /user-branches/:userId/:branchId
router.delete('/:userId/:branchId', deleteUserBranchValidation, validate, userBranchController.deleteUserBranch);

// Delete by body: { user_id, branch_id }
router.delete('/', deleteUserBranchValidation, validate, userBranchController.deleteUserBranch);

module.exports = router;
