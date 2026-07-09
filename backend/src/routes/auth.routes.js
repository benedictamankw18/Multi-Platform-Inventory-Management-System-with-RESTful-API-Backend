/**
 * auth.routes.js
 *
 * Mounted at /api/auth in the main app.
 * Only wires handlers that actually exist on auth.controller.js — login,
 * refreshToken, logout (FR-001, FR-002, NFR-005). No forgot-password /
 * reset-password / verify-token / profile routes here, since
 * auth.service.js doesn't implement that flow; add those once the
 * underlying service methods exist, rather than routing to handlers that
 * would throw "is not a function".
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');

const { loginValidation, refreshTokenValidation, forgotPasswordValidation, resetPasswordValidation } = require('../validations/auth.validation');

// Additional endpoints: logout-all, forgot-password, reset-password

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Log in a user and issue access + refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *     responses:
 *       '200':
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       '401':
 *         description: Invalid credentials
 */
router.post('/login', loginValidation, validate, authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Rotate refresh token and issue a new access token
 *     description: The refresh token may be supplied via an HttpOnly cookie or in the request body as `refreshToken`.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       '200':
 *         description: New access and refresh tokens
 *       '401':
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', refreshTokenValidation, validate, authController.refreshToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Log out the current session and revoke the refresh token
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Logged out successfully
 *       '401':
 *         description: Unauthorized
 */
router.post('/logout', authenticate, authController.logout);

// Logout everywhere (revoke all sessions for current user)
router.post('/logout-all', authenticate, async (req, res) => {
	try {
		const result = await authController.logoutAll ? authController.logoutAll(req, res) : null;
		// If authController.logoutAll handled response, return; otherwise run via service
		if (result === null) return; // handled inside controller
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Unexpected error' });
	}
});

router.post('/forgot-password', forgotPasswordValidation, validate, async (req, res) => {
	try {
		const result = await authController.forgotPassword ? authController.forgotPassword(req, res) : null;
		if (result === null) return;
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Unexpected error' });
	}
});

router.post('/reset-password', resetPasswordValidation, validate, async (req, res) => {
	try {
		const result = await authController.resetPassword ? authController.resetPassword(req, res) : null;
		if (result === null) return;
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Unexpected error' });
	}
});

module.exports = router;
