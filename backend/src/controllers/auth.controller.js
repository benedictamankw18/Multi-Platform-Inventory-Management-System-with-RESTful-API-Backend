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

const REFRESH_COOKIE_NAME = 'refreshToken';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
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
  return (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) || req.body.refreshToken || null;
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
    const { username, password } = req.body;
    const result = await authService.login(username, password);

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
