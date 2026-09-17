/**
 * auth.middleware.js
 *
 * Verifies the Bearer access token and attaches its payload to req.user.
 * Deliberately stateless — no DB lookup on every request. The access token
 * signed by auth.service.js's signAccessToken() already carries everything
 * downstream code needs:
 *
 *   { sub, role, roleId, branchId, sid }
 *
 * Trade-off worth knowing: because this doesn't hit the database, a user
 * deactivated mid-session keeps working until their access token naturally
 * expires (ACCESS_TOKEN_TTL, 15m by default) — deactivateUser() in
 * user.service.js revokes their REFRESH sessions immediately, which closes
 * the window the next time they'd try to refresh, but doesn't retroactively
 * invalidate an access token already in someone's hands. If you need
 * instant revocation instead of a bounded window, swap this for a version
 * that looks up req.user.sid against user_sessions.revoked on every
 * request — at the cost of a DB round trip per authenticated call, which
 * works against NFR-001's 3-second response target under load.
 *
 * Uses ACCESS_TOKEN_SECRET to match auth.service.js's signing secret —
 * this must be the same env var name on both sides or every token will
 * fail verification.
 */

const jwt = require('jsonwebtoken');

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

module.exports = (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: 'Access token is required.' });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decoded; // { sub, role, roleId, branchId, sid, iat, exp }
    return next();
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
};
