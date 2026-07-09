/**
 * permission.routes.js
 *
 * Mounted at /api/permissions in the main app.
 * Wires exactly the seven handlers that exist on permission.controller.js.
 */

const express = require('express');
const router = express.Router();

const permissionController = require('../controllers/permission.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validation.middleware');

const {
  createPermissionValidation,
  updatePermissionValidation,
  permissionIdValidation,
  searchPermissionValidation,
} = require('../validations/permission.validation');

router.use(authenticate, authorize('Administrator'));

router.get('/', searchPermissionValidation, validate, permissionController.getAllPermissions);
router.post('/', createPermissionValidation, validate, permissionController.createPermission);

router.get('/:id', permissionIdValidation, validate, permissionController.getPermissionById);
router.put('/:id', updatePermissionValidation, validate, permissionController.updatePermission);
router.delete('/:id', permissionIdValidation, validate, permissionController.deletePermission);

router.get('/:id/roles', permissionIdValidation, validate, permissionController.getRolesUsingPermission);
router.get('/:id/can-delete', permissionIdValidation, validate, permissionController.canDeletePermission);

module.exports = router;
