const { body, param, query } = require('express-validator');
const userRepo = require('../repositories/user.repository');
const roleRepo = require('../repositories/role.repository');

const idParam = param('id').isUUID().withMessage('Invalid user ID.');

const userIdValidation = [idParam];

const roleArrayValidation = [
  body('roles')
    .isArray({ min: 1 })
    .withMessage('roles must be a non-empty array.'),
  body('roles.*')
    .isUUID()
    .withMessage('Each role must be a valid role ID.')
    .bail()
    .custom(async (roleId) => {
      if (!(await roleRepo.roleExists(roleId))) {
        throw new Error(`Role ${roleId} does not exist.`);
      }
    }),
];

const optionalRoleArrayValidation = [
  body('roles')
    .optional()
    .isArray({ min: 1 })
    .withMessage('roles must be a non-empty array.'),
  body('roles.*')
    .optional()
    .isUUID()
    .withMessage('Each role must be a valid role ID.')
    .bail()
    .custom(async (roleId) => {
      if (!(await roleRepo.roleExists(roleId))) {
        throw new Error(`Role ${roleId} does not exist.`);
      }
    }),
];

const createUserValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email is required.')
    .normalizeEmail()
    .bail()
    .custom(async (email) => {
      if (await userRepo.findUserByEmail(email)) {
        throw new Error('Email is already in use.');
      }
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters.'),
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('first_name is required.')
    .isLength({ max: 50 })
    .withMessage('first_name must be at most 50 characters.'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('last_name is required.')
    .isLength({ max: 50 })
    .withMessage('last_name must be at most 50 characters.'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('username must be between 3 and 50 characters.')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('username contains invalid characters.'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('phone must be at most 20 characters.'),
  body('branch_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid branch_id.'),
  ...roleArrayValidation,
];

const updateUserValidation = [
  idParam,
  body()
    .custom((value) => {
      const allowedFields = [
        'email',
        'first_name',
        'last_name',
        'full_name',
        'fullName',
        'branch_id',
        'branchId',
        'role_id',
        'roleId',
        'roles',
        'phone',
      ];
      return allowedFields.some((field) => value[field] !== undefined);
    })
    .withMessage('At least one updatable field is required.'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email.')
    .normalizeEmail()
    .bail()
    .custom(async (email, { req }) => {
      const existing = await userRepo.findUserByEmail(email);
      if (existing && existing.user_id !== req.params.id) {
        throw new Error('Email is already in use.');
      }
    }),
  body('first_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('first_name cannot be blank.')
    .isLength({ max: 50 })
    .withMessage('first_name must be at most 50 characters.'),
  body('last_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('last_name cannot be blank.')
    .isLength({ max: 50 })
    .withMessage('last_name must be at most 50 characters.'),
  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('full_name cannot be blank.')
    .isLength({ max: 100 })
    .withMessage('full_name must be at most 100 characters.'),
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('fullName cannot be blank.')
    .isLength({ max: 100 })
    .withMessage('fullName must be at most 100 characters.'),
  body('branch_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid branch_id.'),
  body('branchId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid branchId.'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('phone must be at most 20 characters.'),
  body('role_id')
    .optional()
    .isUUID()
    .withMessage('Invalid role_id.')
    .bail()
    .custom(async (roleId) => {
      if (!(await roleRepo.roleExists(roleId))) {
        throw new Error(`Role ${roleId} does not exist.`);
      }
    }),
  body('roleId')
    .optional()
    .isUUID()
    .withMessage('Invalid roleId.')
    .bail()
    .custom(async (roleId) => {
      if (!(await roleRepo.roleExists(roleId))) {
        throw new Error(`Role ${roleId} does not exist.`);
      }
    }),
  ...optionalRoleArrayValidation,
];

const listUsersValidation = [
  query('q').optional().trim().isLength({ max: 100 }).withMessage('Search query too long.'),
  query('branch_id').optional().isUUID().withMessage('Invalid branch_id.'),
  query('branchId').optional().isUUID().withMessage('Invalid branchId.'),
  query('role_id').optional().isUUID().withMessage('Invalid role_id.'),
  query('roleId').optional().isUUID().withMessage('Invalid roleId.'),
  query('is_active').optional().isIn(['true', 'false']).withMessage('is_active must be true or false.'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false.'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('limit must be between 1 and 10000.'),
];

const assignRoleValidation = [
  idParam,
  body('role_id')
    .optional()
    .isUUID()
    .withMessage('Invalid role_id.'),
  body('roleId')
    .optional()
    .isUUID()
    .withMessage('Invalid roleId.'),
  body()
    .custom((value) => value.role_id || value.roleId)
    .withMessage('role_id is required.'),
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  userIdValidation,
  listUsersValidation,
  assignRoleValidation,
  searchUserValidation: [query('q').optional().trim().isLength({ max: 100 })],
  changePasswordValidation: [],
  resetPasswordValidation: [],
  assignBranchValidation: [
    idParam,
    body('branch_id').isUUID().withMessage('Invalid branch_id.'),
  ],
};
