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

const { loginValidation, refreshTokenValidation } = require('../validations/auth.validation');

router.post('/login', loginValidation, validate, authController.login);
router.post('/refresh', refreshTokenValidation, validate, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
