/**
 * role.routes.js
 *
 * Mounted at /api/roles in the main app.
 * Wires exactly the fifteen handlers that exist on role.controller.js.
 *
 * Route ORDER matters: /dropdown and /statistics are static paths and must
 * be registered before GET /:id, or Express will match "dropdown" /
 * "statistics" as a value for the :id param instead of the literal route.
 */

const express = require('express');
const router = express.Router();

const roleController = require('../controllers/role.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validation.middleware');

const {
  createRoleValidation,
  updateRoleValidation,
  roleIdValidation,
  listRolesQueryValidation,
  assignPermissionValidation,
  replacePermissionsValidation,
  removePermissionValidation,
  copyPermissionsValidation,
} = require('../validations/role.validation');

router.use(authenticate, authorize('Administrator'));

// --- Static paths BEFORE /:id ---
router.get('/dropdown', roleController.getRolesDropdown);
router.get('/statistics', roleController.getRoleStatistics);

// --- Collection ---
router.get('/', listRolesQueryValidation, validate, roleController.getAllRoles);
router.post('/', createRoleValidation, validate, roleController.createRole);

// --- Single role ---
router.get('/:id', roleIdValidation, validate, roleController.getRoleById);
router.get('/:id/summary', roleIdValidation, validate, roleController.getRoleSummary);
router.get('/:id/can-delete', roleIdValidation, validate, roleController.canDeleteRole);
router.put('/:id', updateRoleValidation, validate, roleController.updateRole);
router.delete('/:id', roleIdValidation, validate, roleController.deleteRole);

// --- Role <-> permission management ---
router.get('/:id/permissions', roleIdValidation, validate, roleController.getRolePermissions);
router.put('/:id/permissions', replacePermissionsValidation, validate, roleController.replaceRolePermissions);
router.post('/:id/permissions', assignPermissionValidation, validate, roleController.assignPermissionToRole);
router.delete('/:id/permissions/:permissionId', removePermissionValidation, validate, roleController.removePermissionFromRole);
router.post('/:id/permissions/copy-from/:sourceId', copyPermissionsValidation, validate, roleController.copyRolePermissions);

// --- Role <-> users ---
router.get('/:id/users', roleIdValidation, validate, roleController.getUsersByRole);

module.exports = router;
