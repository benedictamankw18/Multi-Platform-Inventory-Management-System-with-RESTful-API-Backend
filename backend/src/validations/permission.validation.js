const { body, query, param } = require('express-validator');

const permissionCodePattern = /^[a-zA-Z0-9._:-]+$/;

const permissionIdValidation = [
  param('id').isUUID().withMessage('Invalid permission ID.'),
];

const createPermissionValidation = [
  body('name')
    .if(body('permissionName').not().exists())
    .trim()
    .notEmpty()
    .withMessage('name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters.'),
  body('code')
    .if(body('permissionName').not().exists())
    .trim()
    .notEmpty()
    .withMessage('code is required.')
    .isLength({ min: 3, max: 100 })
    .withMessage('code must be between 3 and 100 characters.')
    .matches(permissionCodePattern)
    .withMessage('code may only contain letters, numbers, dots, underscores, colons and hyphens.'),
  body('permissionName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('permissionName cannot be empty.')
    .isLength({ min: 3, max: 100 })
    .withMessage('permissionName must be between 3 and 100 characters.')
    .matches(permissionCodePattern)
    .withMessage('permissionName may only contain letters, numbers, dots, underscores, colons and hyphens.'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('description cannot exceed 500 characters.'),
];

const updatePermissionValidation = [
  ...permissionIdValidation,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('name cannot be empty.')
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters.'),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('code cannot be empty.')
    .isLength({ min: 3, max: 100 })
    .withMessage('code must be between 3 and 100 characters.')
    .matches(permissionCodePattern)
    .withMessage('code may only contain letters, numbers, dots, underscores, colons and hyphens.'),
  body('permissionName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('permissionName cannot be empty.')
    .isLength({ min: 3, max: 100 })
    .withMessage('permissionName must be between 3 and 100 characters.')
    .matches(permissionCodePattern)
    .withMessage('permissionName may only contain letters, numbers, dots, underscores, colons and hyphens.'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('description cannot exceed 500 characters.'),
];

const searchPermissionValidation = [
  query('q').optional().trim().isLength({ max: 100 }).withMessage('Search query cannot exceed 100 characters.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
];

const roleIdValidation = [
  param('roleId').isUUID().withMessage('Invalid role ID.'),
];

module.exports = {
  createPermissionValidation,
  updatePermissionValidation,
  searchPermissionValidation,
  permissionIdValidation,
  roleIdValidation,
};
