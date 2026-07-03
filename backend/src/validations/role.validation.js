const { body, param } = require("express-validator");
const { uuidParam } = require('./common.validation');

/**
 * Validate Role ID
 */
const roleIdValidation = [
    param("id")
        .isUUID()
        .withMessage("Invalid role ID.")
];

/**
 * Validate User ID
 */
const userIdValidation = [
    param("userId")
        .isUUID()
        .withMessage("Invalid user ID.")
];

/**
 * Create Role Validation
 */
const createRoleValidation = [
    body("roleName")
        .trim()
        .notEmpty()
        .withMessage("Role name is required.")
        .isLength({ min: 2, max: 50 })
        .withMessage("Role name must be between 2 and 50 characters.")
        .matches(/^[A-Za-z\s]+$/)
        .withMessage("Role name may only contain letters and spaces."),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Description cannot exceed 255 characters.")
];

/**
 * Update Role Validation
 */
const updateRoleValidation = [
    ...roleIdValidation,

    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Role name must be between 2 and 50 characters.")
        .matches(/^[A-Za-z\s]+$/)
        .withMessage("Role name may only contain letters and spaces."),

    body("description")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Description cannot exceed 255 characters.")
];

/**
 * Assign Role Validation
 */
const assignRoleValidation = [
    ...userIdValidation,

    body("roleId")
        .notEmpty()
        .withMessage("Role ID is required.")
        .isUUID()
        .withMessage("Invalid role ID.")
];

/**
 * Search Roles Validation
 */
const searchRoleValidation = [
    body("q")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Search term cannot exceed 100 characters.")
];


/**
 * POST /api/roles/:id/permissions
 * Body: EITHER { permissionId } OR { permissionIds: [...] }
 */
const assignPermissionValidation = [
  uuidParam('id', 'role ID'),
  body('permissionId').optional().isUUID().withMessage('Invalid permissionId.'),
  body('permissionIds').optional().isArray({ min: 1 }).withMessage('permissionIds must be a non-empty array.'),
  body('permissionIds.*').optional().isUUID().withMessage('Each entry in permissionIds must be a valid UUID.'),
  body().custom((_, { req }) => {
    if (!req.body.permissionId && !req.body.permissionIds) {
      throw new Error('Either permissionId or permissionIds is required.');
    }
    return true;
  }),
];

/**
 * PUT /api/roles/:id/permissions
 * Body: { permissionIds: [...] } — full replace, array required (an empty
 * array is valid here and means "clear all permissions").
 */
const replacePermissionsValidation = [
  uuidParam('id', 'role ID'),
  body('permissionIds').isArray().withMessage('permissionIds must be an array.'),
  body('permissionIds.*').isUUID().withMessage('Each entry in permissionIds must be a valid UUID.'),
];

/**
 * DELETE /api/roles/:id/permissions/:permissionId
 */
const removePermissionValidation = [
  uuidParam('id', 'role ID'),
  uuidParam('permissionId', 'permission ID'),
];

/**
 * POST /api/roles/:id/permissions/copy-from/:sourceId
 */
const copyPermissionsValidation = [
  uuidParam('id', 'target role ID'),
  uuidParam('sourceId', 'source role ID'),
];


module.exports = {
    createRoleValidation,
    updateRoleValidation,
    assignRoleValidation,
    roleIdValidation,
    userIdValidation,
    searchRoleValidation,
    assignPermissionValidation,
    replacePermissionsValidation,
    removePermissionValidation,
    copyPermissionsValidation
};



