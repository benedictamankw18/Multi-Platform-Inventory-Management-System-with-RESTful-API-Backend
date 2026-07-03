const { body } = require("express-validator");

/**
 * Login Validation
 */
const loginValidation = [
    body("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required."),

    body("password")
        .notEmpty()
        .withMessage("Password is required.")
];

/**
 * Refresh Token Validation
 */
const refreshTokenValidation = [
    body("refreshToken")
        .trim()
        .notEmpty()
        .withMessage("Refresh token is required.")
];

/**
 * Forgot Password Validation
 */
const forgotPasswordValidation = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required.")
        .isEmail()
        .withMessage("Invalid email address.")
        .normalizeEmail()
];

/**
 * Reset Password Validation
 */
const resetPasswordValidation = [
    body("token")
        .trim()
        .notEmpty()
        .withMessage("Reset token is required."),

    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters.")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter.")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter.")
        .matches(/[0-9]/)
        .withMessage("Password must contain at least one number.")
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
        .withMessage("New password must be at least 8 characters.")
        .matches(/[A-Z]/)
        .withMessage("New password must contain at least one uppercase letter.")
        .matches(/[a-z]/)
        .withMessage("New password must contain at least one lowercase letter.")
        .matches(/[0-9]/)
        .withMessage("New password must contain at least one number.")
];

module.exports = {
    loginValidation,
    refreshTokenValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    changePasswordValidation
};