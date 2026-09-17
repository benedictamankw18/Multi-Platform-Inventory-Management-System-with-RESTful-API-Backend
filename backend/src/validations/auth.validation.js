const { body, oneOf } = require("express-validator");

/**
 * Login Validation
 */
const loginValidation = [
    oneOf(
        [
            body("usernameOrEmail")
                .trim()
                .notEmpty()
                .withMessage("Username or email is required."),

            body("username")
                .trim()
                .notEmpty()
                .withMessage("Username or email is required."),
        ],
        "Username or email is required."
    ),

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
        .withMessage("Email Or Username is required.")
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
 * Update Profile Validation
 */
const updateProfileValidation = [
    body("fullName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Full name cannot be empty."),

    body("email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Valid email is required.")
        .normalizeEmail(),

    body("phone")
        .optional({ values: "null" })
        .trim()
        .isLength({ max: 20 })
        .withMessage("Phone number must be at most 20 characters."),

    body("profilePhoto")
        .optional({ values: "null" })
        .trim()
        .isURL()
        .withMessage("Profile photo must be a valid URL."),
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
    changePasswordValidation,
    updateProfileValidation
};