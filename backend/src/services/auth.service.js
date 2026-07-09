/**
 * auth.service.js
 *
 * Authentication business logic: bcrypt password verification, JWT signing
 * and verification, session validation rules (revoked? expired? inactive
 * too long? reused refresh token?), and audit logging. Sits between
 * auth.repository.js (pure SQL) and the thin auth.controller.js (HTTP only).
 *
 * What deliberately does NOT live here, because it's an HTTP concern:
 *   - Setting/clearing the refresh-token cookie
 *   - Reading the refresh token out of req.cookies vs req.body
 *   - res.status()/res.json() of any kind
 * Every function here takes and returns plain values/objects. The thin
 * auth.controller.js is responsible for cookie management around these
 * calls.
 *
 * § Error contract
 * All exported functions throw AppError on invalid credentials / invalid or
 * expired sessions / validation failures, so the controller only needs:
 *   try { ... }
 *   catch (err) { res.status(err.status || 500).json({ message: err.message }); }
 *
 * Required environment variables (.env):
 *   ACCESS_TOKEN_SECRET
 *   REFRESH_TOKEN_SECRET
 *   ACCESS_TOKEN_TTL                       e.g. "15m"
 *   REFRESH_TOKEN_TTL_DAYS                 e.g. 7
 *   SESSION_INACTIVITY_TIMEOUT_MINUTES     e.g. 30   (NFR-007: configurable)
 */

const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const authRepo = require('../repositories/auth.repository');
const auditRepo = require('../repositories/audit.repository');
const userRepo = require('../repositories/user.repository');
const jwtUtils = require('../utils/jwt.utils');
const AppError = require('../utils/AppError');
const { env } = require('process');

const ACCESS_TOKEN_SECRET  = env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_TTL     = env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL_DAYS = Number(env.REFRESH_TOKEN_TTL_DAYS || 7);
// NFR-007: configurable inactivity timeout
const INACTIVITY_TIMEOUT_MINUTES = Number(env.SESSION_INACTIVITY_TIMEOUT_MINUTES || 30);


if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  // Fail loudly at startup instead of silently signing tokens with `undefined`
  throw new Error('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set in the environment.');
}

const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function signAccessToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user.user_id,
      role: user.role_name,
      roleId: user.role_id,
      branchId: user.branch_id,
      sid: sessionId,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(userId, sessionId, jti) {
  return jwt.sign(
    { sub: userId, sid: sessionId, jti },
    REFRESH_TOKEN_SECRET,
    { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` }
  );
}

function invalidCredentialsError() {
  // Same message/code whether the account doesn't exist or the password is
  // wrong, so the caller never learns which usernames are registered.
  return new AppError('Invalid username or password.', { code: 'INVALID_CREDENTIALS', status: 401 });
}

function sessionInvalidError(message = 'Session is no longer valid. Please log in again.') {
  return new AppError(message, { code: 'SESSION_INVALID', status: 401 });
}

// ---------------------------------------------------------------------------
// § login                                                            (FR-001)
// ---------------------------------------------------------------------------

exports.login = async (usernameOrEmail, password) => {
  if (!usernameOrEmail || !password) {
    throw new AppError('Username and password are required.', { code: 'VALIDATION_ERROR', status: 400 });
  }

  const user = await authRepo.findUserForLogin(usernameOrEmail);
  if (!user) {
    throw invalidCredentialsError();
  }

  if (!user.is_active) {
    throw new AppError(
      'This account has been deactivated. Contact an administrator.',
      { code: 'ACCOUNT_DEACTIVATED', status: 403 }
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw invalidCredentialsError();
  }

  // Create a session row backing this login. NFR-007 uses it to expire idle
  // sessions; it also lets logout (or "log out all devices") revoke access
  // without waiting for the JWT to expire on its own.
  const sessionId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await authRepo.createSession({ sessionId, userId: user.user_id, tokenIdentifier: jti, expiresAt });
  await authRepo.updateLastLogin(user.user_id);

  const accessToken = signAccessToken(user, sessionId);
  const refreshToken = signRefreshToken(user.user_id, sessionId, jti);

  await auditRepo.writeLog(user.user_id, 'LOGIN', 'USER', user.user_id);

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.user_id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role: user.role_name,
      branchId: user.branch_id,
    },
  };
};

// ---------------------------------------------------------------------------
// § refreshToken                                          (NFR-005, NFR-007)
// ---------------------------------------------------------------------------

exports.refreshToken = async (token) => {

  if (!token) {
    throw new AppError('No refresh token provided.', { code: 'TOKEN_REQUIRED', status: 401 });
    return;
  }

  let payload;
  try {
    payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw new AppError('Refresh token is invalid or expired.', { code: 'TOKEN_INVALID', status: 401 });
  }

  const session = await authRepo.getSessionById(payload.sid);

  if (!session || session.revoked || !session.is_active) {
    throw sessionInvalidError();
  }

  // The stored token_identifier should always match the jti of the most
  // recently issued refresh token. A mismatch means this token was already
  // rotated past (or stolen) — kill the whole session, not just this request.
  if (session.token_identifier !== payload.jti) {
    await authRepo.revokeSession(session.session_id);
    await auditRepo.writeLog(session.user_id, 'REFRESH_TOKEN_REUSE_DETECTED', 'USER', session.user_id);
    throw sessionInvalidError();
  }

  if (new Date(session.expires_at) < new Date()) {
    throw sessionInvalidError('Session has expired. Please log in again.');
  }

  // NFR-007: configurable inactivity expiry, independent of the absolute
  // session lifetime checked above.
  const minutesSinceActivity = (Date.now() - new Date(session.last_activity_at).getTime()) / 60000;
  if (minutesSinceActivity > INACTIVITY_TIMEOUT_MINUTES) {
    await authRepo.revokeSession(session.session_id);
    throw sessionInvalidError('Session expired due to inactivity. Please log in again.');
  }

  // Rotate the refresh token: a fresh jti invalidates the one just used.
  const newJti = crypto.randomUUID();
  await authRepo.rotateSessionToken(session.session_id, newJti);

  const userForToken = {
    user_id: session.user_id,
    role_name: session.role_name,
    role_id: session.role_id,
    branch_id: session.branch_id,
  };

  const newAccessToken = signAccessToken(userForToken, session.session_id);
  const newRefreshToken = signRefreshToken(session.user_id, session.session_id, newJti);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ---------------------------------------------------------------------------
// § logout                                                           (FR-002)
//
// Accepts whatever the controller was able to determine the session from —
// either the decoded access token payload (preferred, via auth middleware)
// or a decoded refresh token as a fallback. Either way this function only
// ever receives plain { sessionId, userId } values, never a raw JWT.
// ---------------------------------------------------------------------------

exports.logout = async ({ sessionId, userId } = {}) => {
  if (sessionId) {
    await authRepo.revokeSession(sessionId);
    await auditRepo.writeLog(userId, 'LOGOUT', 'USER', userId);
  }
  return { message: 'Logged out successfully.' };
};

// ---------------------------------------------------------------------------
// Logout All (revoke all sessions for a user)
// ---------------------------------------------------------------------------
exports.logoutAll = async (userId) => {
  if (!userId) throw new AppError('userId is required.', { status: 400 });
  await authRepo.revokeAllSessionsForUser(userId);
  await auditRepo.writeLog(userId, 'LOGOUT_ALL', 'USER', userId);
  return { message: 'All sessions revoked.' };
};

// ---------------------------------------------------------------------------
// Forgot password: create a reset token and persist it
// ---------------------------------------------------------------------------
exports.forgotPassword = async (email) => {
  if (!email) throw new AppError('Email is required.', { status: 400 });

  const user = await authRepo.findUserForLogin(email);
  // Do not reveal whether an account exists
  if (!user) return { message: 'If an account exists, a reset email will be sent.' };

  const token = jwtUtils.generatePasswordResetToken();
  const id = crypto.randomUUID();
  const expiresAt = jwtUtils.getPasswordResetExpiry();

  await authRepo.createPasswordResetToken({ id, userId: user.user_id, token, expiresAt });
  // enqueue/send email and SMS (best-effort, do not fail the request)
  try {
    const queueService = require('./queue.service');
    // enqueue send operations; do not block
    queueService.enqueuePasswordReset(user, token).catch((e) => console.error('enqueuePasswordReset error', e && e.message));
  } catch (e) {
    console.error('enqueue send error', e && e.message);
  }
  return { message: 'If an account exists, a reset email will be sent.' };
};

// ---------------------------------------------------------------------------
// Reset password using token
// ---------------------------------------------------------------------------
exports.resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) throw new AppError('Token and new password are required.', { status: 400 });

  const record = await authRepo.getPasswordResetTokenByToken(token);
  if (!record || record.used) throw new AppError('Invalid or expired reset token.', { status: 400 });
  if (new Date(record.expires_at) < new Date()) throw new AppError('Reset token has expired.', { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepo.updatePassword(record.user_id, passwordHash);
  await authRepo.markPasswordResetUsed(record.id);

  // Revoke any existing sessions for this user
  await authRepo.revokeAllSessionsForUser(record.user_id);
  await auditRepo.writeLog(record.user_id, 'PASSWORD_RESET', 'USER', record.user_id);

  return { message: 'Password has been reset.' };
};

// ---------------------------------------------------------------------------
// Expose session listing and session revoke helpers for controllers
// ---------------------------------------------------------------------------
exports.listSessionsForUser = async (userId, opts = {}) => {
  return authRepo.listSessionsForUser(userId, opts);
};

exports.revokeSessionById = async (sessionId, actorId = null) => {
  await authRepo.revokeSession(sessionId);
  await auditRepo.writeLog(actorId, 'REVOKE_SESSION', 'SESSION', sessionId);
  return { sessionId };
};

// ---------------------------------------------------------------------------
// § Helpers exposed for the controller layer
// ---------------------------------------------------------------------------

// Used by the controller's logout fallback path to decode a refresh token
// WITHOUT verifying its signature/expiry — logout should succeed even with
// an expired token, since the goal is just to find the session to revoke.
exports.decodeTokenUnsafe = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

exports.REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_MS;
