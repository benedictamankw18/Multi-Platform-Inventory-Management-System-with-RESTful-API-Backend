"use strict";

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * ============================================================
 * JWT Utility
 * ============================================================
 * Handles:
 *  - Access Token generation
 *  - Refresh Token generation
 *  - Verification
 *  - Decoding
 *  - Token Identifier generation
 * ============================================================
 */

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_EXPIRES =
    process.env.JWT_EXPIRES_IN || "15m";

const REFRESH_EXPIRES =
    process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * ============================================================
 * Generate Access Token
 * ============================================================
 */
exports.generateAccessToken = (user) => {

    return jwt.sign(
        {
            userId: user.user_id,
            username: user.username,
            roleId: user.role_id,
            branchId: user.branch_id,
            type: "access"
        },
        ACCESS_SECRET,
        {
            expiresIn: ACCESS_EXPIRES
        }
    );

};

/**
 * ============================================================
 * Generate Refresh Token
 * ============================================================
 */
exports.generateRefreshToken = (user) => {

    return jwt.sign(
        {
            userId: user.user_id,
            type: "refresh"
        },
        REFRESH_SECRET,
        {
            expiresIn: REFRESH_EXPIRES
        }
    );

};

/**
 * ============================================================
 * Verify Access Token
 * ============================================================
 */
exports.verifyAccessToken = (token) => {

    return jwt.verify(
        token,
        ACCESS_SECRET
    );

};

/**
 * ============================================================
 * Verify Refresh Token
 * ============================================================
 */
exports.verifyRefreshToken = (token) => {

    return jwt.verify(
        token,
        REFRESH_SECRET
    );

};

/**
 * ============================================================
 * Decode Token (without verification)
 * ============================================================
 */
exports.decodeToken = (token) => {

    return jwt.decode(token);

};

/**
 * ============================================================
 * Generate Secure Token Identifier
 * Used for user_sessions.token_identifier
 * ============================================================
 */
exports.generateTokenIdentifier = () => {

    return crypto.randomUUID();

};

/**
 * ============================================================
 * Generate Password Reset Token
 * ============================================================
 */
exports.generatePasswordResetToken = () => {

    return crypto.randomBytes(48).toString("hex");

};

/**
 * ============================================================
 * Calculate Refresh Token Expiry Date
 * ============================================================
 */
exports.getRefreshTokenExpiry = () => {

    const days = Number(
        process.env.JWT_REFRESH_DAYS || 7
    );

    return new Date(
        Date.now() +
        (days * 24 * 60 * 60 * 1000)
    );

};

/**
 * ============================================================
 * Calculate Password Reset Expiry
 * Default: 1 Hour
 * ============================================================
 */
exports.getPasswordResetExpiry = () => {

    const minutes = Number(
        process.env.PASSWORD_RESET_EXPIRES_MINUTES || 60
    );

    return new Date(
        Date.now() +
        (minutes * 60 * 1000)
    );

};

/**
 * ============================================================
 * Extract Bearer Token
 * ============================================================
 */
exports.extractToken = (authorizationHeader) => {

    if (!authorizationHeader) {
        return null;
    }

    const parts = authorizationHeader.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer"
    ) {
        return null;
    }

    return parts[1];

};

/**
 * ============================================================
 * Check Token Type
 * ============================================================
 */
exports.isAccessToken = (decoded) => {

    return decoded?.type === "access";

};

exports.isRefreshToken = (decoded) => {

    return decoded?.type === "refresh";

};