/**
 * auth.middleware.js
 *
 * Verifies the Bearer access token, attaches its payload to req.user, and —
 * crucially — confirms the underlying session is still valid on every request.
 *
 * Why the database check: an access token is a short-lived (ACCESS_TOKEN_TTL,
 * 15m) bearer credential. Purely stateless verification means a session that is
 * revoked mid-flight (logout, logout-all, an admin "Revoke session", a password
 * reset/change) or an account that is deactivated would keep working until the
 * token's own expiry. To make those take effect immediately we look the session
 * up by the sid claim and reject the request when the session is missing,
 * revoked, or its user is inactive:
 *
 *   - logout / session revoke / password change  -> user_sessions.revoked = true
 *   - admin deactivation                         -> revoked = true AND is_active = false
 *
 * The trade-off is one indexed lookup per authenticated request, which is the
 * cost of instant revocation over the bounded 15m window. On a lookup failure we
 * fail closed (next(err) -> global error handler) rather than let a request
 * through unchecked.
 *
 * Uses ACCESS_TOKEN_SECRET to match auth.service.js's signing secret — this must
 * be the same env var name on both sides or every token will fail verification.
 */

const jwt = require('jsonwebtoken');
const authRepo = require('../repositories/auth.repository');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error('ACCESS_TOKEN_SECRET must be set in the environment.');
}

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }
  return authorizationHeader.slice('Bearer '.length).trim() || null;
}

module.exports = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: 'Access token is required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token has expired.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid access token.' });
    }
    console.error('[auth.middleware]', err);
    return res.status(500).json({ message: 'Authentication failed.' });
  }

  // Every access token is minted against a real session (see auth.service.js's
  // signAccessToken), so a missing sid means the token was not issued by this API.
  if (!decoded.sid) {
    return res.status(401).json({ message: 'Session is no longer valid. Please log in again.', code: 'SESSION_INVALID' });
  }

  let session;
  try {
    session = await authRepo.getSessionById(decoded.sid);
  } catch (err) {
    // Fail closed: a lookup error must never be treated as "valid".
    return next(err);
  }

  if (!session || session.revoked || !session.is_active) {
    return res.status(401).json({ message: 'Session is no longer valid. Please log in again.', code: 'SESSION_INVALID' });
  }

  req.user = decoded; // { sub, role, roleId, branchId, sid, loginId, iat, exp }
  return next();
};
