/**
 * user.routes.js
 *
 * Mounted at /api/users in the main app.
 * Wires exactly the seven handlers that exist on user.controller.js
 * (FR-003, FR-004). No /search, /me, /change-password, or /unlock routes —
 * those handlers don't exist on user.service.js/user.controller.js yet;
 * add them there first, then wire the route, rather than the other way
 * around.
 *
 * All routes require Administrator (or Business Owner, per the stakeholder
 * table) — FR-004 frames user management as an administrative function.
 * Loosen listUsers/getUserById to just `authenticate` if you want any
 * logged-in user to browse the directory.
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validation.middleware');

const {
  createUserValidation,
  updateUserValidation,
  userIdValidation,
  assignRoleValidation,
  listUsersValidation,
} = require('../validations/user.validation');

const ADMIN_ROLES = ['Administrator', 'Business Owner'];

router.post('/', authenticate, authorize(...ADMIN_ROLES), createUserValidation, validate, userController.createUser);
router.get('/', authenticate, authorize(...ADMIN_ROLES), listUsersValidation, validate, userController.listUsers);
router.get('/:userId', authenticate, authorize(...ADMIN_ROLES), userIdValidation, validate, userController.getUserById);
router.patch('/:userId', authenticate, authorize(...ADMIN_ROLES), updateUserValidation, validate, userController.updateUser);
router.patch('/:userId/role', authenticate, authorize(...ADMIN_ROLES), assignRoleValidation, validate, userController.assignRole);
router.patch('/:userId/deactivate', authenticate, authorize(...ADMIN_ROLES), userIdValidation, validate, userController.deactivateUser);
router.patch('/:userId/reactivate', authenticate, authorize(...ADMIN_ROLES), userIdValidation, validate, userController.reactivateUser);

module.exports = router;
