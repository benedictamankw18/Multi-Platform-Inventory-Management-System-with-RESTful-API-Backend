const { body, param, query } = require('express-validator');

const roleIdValidation = [
  param('id').isUUID().withMessage('Invalid role ID.'),
];

const userIdValidation = [
  param('userId').isUUID().withMessage('Invalid user ID.'),
];

const permissionsBodyValidation = [
  body('permissions').optional().isArray().withMessage('permissions must be an array.'),
  body('permissions.*').optional().isUUID().withMessage('Each permission must be a valid UUID.'),
  body('permissionIds').optional().isArray().withMessage('permissionIds must be an array.'),
  body('permissionIds.*').optional().isUUID().withMessage('Each permissionId must be a valid UUID.'),
];

const createRoleValidation = [
  body('name')
    .if(body('roleName').not().exists())
    .trim()
    .notEmpty()
    .withMessage('name is required.')
    .isLength({ min: 2, max: 50 })
    .withMessage('name must be between 2 and 50 characters.'),
  body('roleName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('roleName cannot be empty.')
    .isLength({ min: 2, max: 50 })
    .withMessage('roleName must be between 2 and 50 characters.'),
  body('description').optional().trim().isLength({ max: 255 }).withMessage('description cannot exceed 255 characters.'),
  ...permissionsBodyValidation,
];

const updateRoleValidation = [
  ...roleIdValidation,
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('name must be between 2 and 50 characters.'),
  body('roleName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('roleName must be between 2 and 50 characters.'),
  body('description').optional().trim().isLength({ max: 255 }).withMessage('description cannot exceed 255 characters.'),
  ...permissionsBodyValidation,
];

const assignRoleValidation = [
  ...userIdValidation,
  body('roleId').notEmpty().withMessage('roleId is required.').isUUID().withMessage('Invalid roleId.'),
];

const searchRoleValidation = [
  body('q').optional().trim().isLength({ max: 100 }).withMessage('Search term cannot exceed 100 characters.'),
];

const listRolesQueryValidation = [
  query('q').optional().trim().isLength({ max: 100 }),
  query('isSystem').optional().isIn(['true', 'false']).withMessage('isSystem must be true or false.'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 10000 }),
];

const assignPermissionValidation = [
  ...roleIdValidation,
  body('permission').optional().isUUID().withMessage('Invalid permission.'),
  body('permissionId').optional().isUUID().withMessage('Invalid permissionId.'),
  body('permissions').optional().isArray({ min: 1 }).withMessage('permissions must be a non-empty array.'),
  body('permissions.*').optional().isUUID().withMessage('Each permission must be a valid UUID.'),
  body('permissionIds').optional().isArray({ min: 1 }).withMessage('permissionIds must be a non-empty array.'),
  body('permissionIds.*').optional().isUUID().withMessage('Each permissionId must be a valid UUID.'),
  body().custom((_, { req }) => {
    if (!req.body.permission && !req.body.permissionId && !req.body.permissions && !req.body.permissionIds) {
      throw new Error('permission or permissions is required.');
    }
    return true;
  }),
];

const replacePermissionsValidation = [
  ...roleIdValidation,
  body('permissions').if(body('permissionIds').not().exists()).isArray().withMessage('permissions must be an array.'),
  body('permissions.*').optional().isUUID().withMessage('Each permission must be a valid UUID.'),
  body('permissionIds').optional().isArray().withMessage('permissionIds must be an array.'),
  body('permissionIds.*').optional().isUUID().withMessage('Each permissionId must be a valid UUID.'),
];

const removePermissionValidation = [
  ...roleIdValidation,
  param('permissionId').isUUID().withMessage('Invalid permission ID.'),
];

const copyPermissionsValidation = [
  ...roleIdValidation,
  param('sourceId').isUUID().withMessage('Invalid source role ID.'),
];

module.exports = {
  createRoleValidation,
  updateRoleValidation,
  assignRoleValidation,
  roleIdValidation,
  userIdValidation,
  searchRoleValidation,
  listRolesQueryValidation,
  assignPermissionValidation,
  replacePermissionsValidation,
  removePermissionValidation,
  copyPermissionsValidation,
};
