const { body, param, query } = require("express-validator");

/**
 * User ID Validation
 */
const userIdValidation = [
    param("userId")
        .isUUID()
        .withMessage("Invalid user ID.")
];

const passwordComplexity = (field) =>
  body(field)
    .isLength({ min: 8 })
    .withMessage(`${field} must be at least 8 characters.`)
    .matches(/[A-Z]/)
    .withMessage(`${field} must contain an uppercase letter.`)
    .matches(/[a-z]/)
    .withMessage(`${field} must contain a lowercase letter.`)
    .matches(/[0-9]/)
    .withMessage(`${field} must contain a number.`);

/**
 * Create User Validation
 */
const createUserValidation = [
    body('fullName').trim().notEmpty().withMessage('fullName is required.').isLength({ max: 100 }),
      body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('username must be between 3 and 50 characters.')
        .matches(/^[a-zA-Z0-9_.-]+$/)
        .withMessage('username contains invalid characters.'),
      body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
      passwordComplexity('password'),
      body('roleId').isUUID().withMessage('A valid roleId is required.'),
      body('branchId').optional({ nullable: true }).isUUID().withMessage('Invalid branchId.'),
];

/**
 * Update User Validation
 */
const updateUserValidation = [
    ...userIdValidation,

    body("role_id")
        .optional()
        .isUUID()
        .withMessage("Invalid role ID."),

    body("branch_id")
        .optional({ nullable: true })
        .isUUID()
        .withMessage("Invalid branch ID."),

    body("username")
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 }),

    body("email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Invalid email."),

    body('fullName')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('fullName cannot be blank.')
        .isLength({ max: 100 }),


    body("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be true or false.")
];

const listUsersValidation = [
  body('branchId').optional().isUUID().withMessage('Invalid branchId.'),
  body('roleId').optional().isUUID().withMessage('Invalid roleId.'),
  body('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false.'),
  body('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
];

/**
 * Search Users Validation
 */
const searchUserValidation = [
    query("q")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Search keyword is too long.")
];

/**
 * Change Password Validation
 */
const changePasswordValidation = [
    body("currentPassword")
        .notEmpty()
        .withMessage("Current password is required."),

    body("newPassword")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters.")
        .matches(/[A-Z]/)
        .withMessage("Password must contain an uppercase letter.")
        .matches(/[a-z]/)
        .withMessage("Password must contain a lowercase letter.")
        .matches(/[0-9]/)
        .withMessage("Password must contain a number.")
];

/**
 * Reset Password Validation
 */
const resetPasswordValidation = [
    ...userIdValidation,

    body("newPassword")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters.")
        .matches(/[A-Z]/)
        .withMessage("Password must contain an uppercase letter.")
        .matches(/[a-z]/)
        .withMessage("Password must contain a lowercase letter.")
        .matches(/[0-9]/)
        .withMessage("Password must contain a number.")
];

/**
 * Assign Role Validation
 */
const assignRoleValidation = [
    ...userIdValidation,

    body("role_id")
        .isUUID()
        .withMessage("Invalid role ID.")
];

/**
 * Assign Branch Validation
 */
const assignBranchValidation = [
    ...userIdValidation,

    body("branch_id")
        .isUUID()
        .withMessage("Invalid branch ID.")
];

module.exports = {
    createUserValidation,
    updateUserValidation,
    userIdValidation,
    searchUserValidation,
    changePasswordValidation,
    listUsersValidation,
    resetPasswordValidation,
    assignRoleValidation,
    assignBranchValidation
};

