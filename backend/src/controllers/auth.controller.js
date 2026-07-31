/**
 * auth.controller.js  (thin)
 *
 * HTTP mapping only — Request -> Validation -> Service -> Response. All
 * password verification, JWT signing, and session business rules live in
 * auth.service.js. This file's only real responsibilities beyond calling
 * the service are:
 *   - extracting the refresh token from a cookie or the request body
 *   - setting/clearing the refresh-token cookie
 *   - mapping AppError -> HTTP status code
 *
 * Routes:
 *   POST /api/auth/login     (FR-001)
 *   POST /api/auth/refresh   (NFR-005, NFR-007)
 *   POST /api/auth/logout    (FR-002)
 *
 * Required packages: express, cookie-parser
 * Make sure `app.use(require('cookie-parser')())` and `app.use(express.json())`
 * are registered before the auth routes.
 */

const authService = require('../services/auth.service');
const roleRepo = require('../repositories/role.repository');

const REFRESH_COOKIE_NAME = 'refreshToken';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: authService.REFRESH_TOKEN_TTL_MS,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

// The desktop (Electron) app may not always carry cookies between requests,
// so accept the refresh token from either an httpOnly cookie or the body.
function extractRefreshToken(req) {
  // Accept either the primary cookie name or a common alternative used by clients.
  const cookieToken = req.cookies && (req.cookies[REFRESH_COOKIE_NAME] || req.cookies['refresh_token']);
  return cookieToken || req.body.refreshToken || req.body.refresh_token || null;
}

function handleError(res, err) {
  console.error('[auth.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

// ---------------------------------------------------------------------------
// POST /api/auth/login                                              (FR-001)
// Body: { username, password }
// ---------------------------------------------------------------------------

exports.login = async (req, res) => {
  try {
    const { usernameOrEmail, username, password } = req.body;
    const identifier = usernameOrEmail || username;
    const result = await authService.login(identifier, password);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/refresh                                  (NFR-005, NFR-007)
// Body (optional if using cookies): { refreshToken }
// ---------------------------------------------------------------------------

exports.refreshToken = async (req, res) => {
  try {
    const token = extractRefreshToken(req);
    const result = await authService.refreshToken(token);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json(result);
  } catch (err) {
    // Any failure here means the refresh token is no longer good for
    // anything — clear it client-side too, not just reject the request.
    clearRefreshCookie(res);
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/logout                                              (FR-002)
//
// Expects an auth middleware to have already verified the access token and
// attached its payload to req.user (i.e. { sub, sid, role, ... }). Falls
// back to decoding the refresh token if, for some reason, req.user isn't set.
// ---------------------------------------------------------------------------

exports.logout = async (req, res) => {
  try {
    let sessionId = req.user && req.user.sid;
    let userId = req.user && req.user.sub;

    if (!sessionId) {
      const fallbackToken = extractRefreshToken(req);
      const decoded = fallbackToken ? authService.decodeTokenUnsafe(fallbackToken) : null;
      sessionId = decoded && decoded.sid;
      userId = decoded && decoded.sub;
    }

    const result = await authService.logout({ sessionId, userId });

    clearRefreshCookie(res);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/logout-all
// ---------------------------------------------------------------------------
exports.logoutAll = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    const result = await authService.logoutAll(userId);
    clearRefreshCookie(res);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/my-branches
// Lists all branches assigned to the logged-in user
// ---------------------------------------------------------------------------

exports.listMyBranches = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });
    const result = await authService.listMyBranches(userId);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/select-branch
// Sets the user's active branch and re-issues tokens with the new branchId
// Body: { branchId }
// ---------------------------------------------------------------------------

exports.selectBranch = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });

    const { branchId } = req.body;
    if (!branchId) return res.status(400).json({ message: 'branchId is required.' });

    const result = await authService.selectBranch(userId, branchId);

    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken);
    }

    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// Body: { email }
// ---------------------------------------------------------------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// Body: { token, password }
// ---------------------------------------------------------------------------
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me/permissions
// Returns the permission names assigned to the current user's role
// ---------------------------------------------------------------------------

exports.getMyPermissions = async (req, res) => {
  try {
    const roleId = req.user && req.user.roleId;
    if (!roleId) return res.status(401).json({ message: 'Authentication required.' });

    const permissions = await roleRepo.getRolePermissions(roleId);
    const names = permissions.map(p => p.permission_name);
    return res.status(200).json({ permissions: names });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Returns the logged-in user's full profile
// ---------------------------------------------------------------------------

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });
    const result = await authService.getProfile(userId);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/auth/me/profile
// Updates profile fields: fullName, email, phone, profilePhoto
// ---------------------------------------------------------------------------

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });
    const { fullName, email, phone, profilePhoto } = req.body;
    const result = await authService.updateProfile(userId, { fullName, email, phone, profilePhoto });
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/me/change-password
// Body: { currentPassword, newPassword }
// ---------------------------------------------------------------------------

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/me/profile-photo
// Upload a profile photo file
// ---------------------------------------------------------------------------

exports.uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });
    if (!req.file) return res.status(400).json({ message: 'No image file provided.' });

    const imageUrl = `/uploads/${req.file.filename}`;
    const result = await authService.updateProfile(userId, { profilePhoto: imageUrl });
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};
