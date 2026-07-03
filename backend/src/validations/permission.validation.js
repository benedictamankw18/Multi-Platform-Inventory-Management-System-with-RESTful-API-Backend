const { body, query, param } = require("express-validator");

/**
 * Create Permission Validation
 */
exports.createPermissionValidation = [
  body("permissionName")
    .trim()
    .notEmpty()
    .withMessage("Permission name is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Permission name must be between 3 and 100 characters.")
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage(
      "Permission name may only contain letters, numbers, dots (.), underscores (_) and hyphens (-)."
    ),

  body("description")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
];

/**
 * Update Permission Validation
 */
exports.updatePermissionValidation = [
  param("id")
    .isUUID()
    .withMessage("Invalid permission ID."),

  body("permissionName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Permission name cannot be empty.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Permission name must be between 3 and 100 characters.")
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage(
      "Permission name may only contain letters, numbers, dots (.), underscores (_) and hyphens (-)."
    ),

  body("description")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
];

/**
 * Search Permission Validation
 */
exports.searchPermissionValidation = [
  query("q")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query cannot exceed 100 characters."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
];

/**
 * Permission ID Validation
 */
exports.permissionIdValidation = [
  param("id")
    .isUUID()
    .withMessage("Invalid permission ID."),
];

/**
 * Role ID Validation
 */
exports.roleIdValidation = [
  param("roleId")
    .isUUID()
    .withMessage("Invalid role ID."),
];