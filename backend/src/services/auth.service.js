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
const notificationService = require('./notification.service');
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

function signAccessToken(user, sessionId, loginId) {
  return jwt.sign(
    {
      sub: user.user_id,
      role: user.role_name,
      roleId: user.role_id,
      branchId: user.branch_id,
      sid: sessionId,
      loginId: loginId || null,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(userId, sessionId, jti, loginId) {
  return jwt.sign(
    { sub: userId, sid: sessionId, jti, loginId: loginId || null },
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

exports.login = async (usernameOrEmail, password, meta = {}) => {
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
  const loginId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await authRepo.createSession({ sessionId, userId: user.user_id, tokenIdentifier: jti, expiresAt });
  await authRepo.updateLastLogin(user.user_id);

  // Attribute this login (and every request it makes) to a login_history row
  // so the rate limiter can key on { user, device, login, session }.
  await authRepo.createLoginHistory({
    loginId,
    userId: user.user_id,
    username: user.username,
    sessionId,
    successful: true,
    ipAddress: meta.ipAddress || null,
    userAgent: meta.userAgent || null,
    device: meta.device || null,
    operatingSystem: meta.operatingSystem || null,
    browser: meta.browser || null,
  });

  const accessToken = signAccessToken(user, sessionId, loginId);
  const refreshToken = signRefreshToken(user.user_id, sessionId, jti, loginId);

  await auditRepo.writeLog(user.user_id, 'LOGIN', 'USER', user.user_id);

    notificationService.createNotification({
      title: 'New Login',
      message: 'You logged in successfully.',
      type: 'INFO',
      priority: 'LOW',
      user_id: user.user_id,
      recipients: [user.user_id],
      createdBy: user.user_id,
      channels: ['in_app'],
    }).catch((e) => console.error('notif error', e && e.message));

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
      profilePhoto: user.profile_photo,
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

  // Preserve the login attribution across token rotation. Tokens signed before
  // loginId existed fall back to a lookup of the login_history row.
  let loginId = payload.loginId || null;
  if (!loginId) {
    const login = await authRepo.findLoginBySessionId(session.session_id);
    loginId = (login && login.login_id) || null;
  }

  const newAccessToken = signAccessToken(userForToken, session.session_id, loginId);
  const newRefreshToken = signRefreshToken(session.user_id, session.session_id, newJti, loginId);

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

    notificationService.createNotification({
      title: 'Logged Out',
      message: 'You logged out successfully.',
      type: 'INFO',
      priority: 'LOW',
      user_id: userId,
      recipients: [userId],
      createdBy: userId,
      channels: ['in_app'],
    }).catch((e) => console.error('notif error', e && e.message));
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

  notificationService.createNotification({
    title: 'Password Reset Requested',
    message: 'A password reset link has been sent to your email.',
    type: 'INFO',
    priority: 'LOW',
    user_id: user.user_id,
    recipients: [user.user_id],
    createdBy: user.user_id,
    channels: ['in_app'],
  }).catch((e) => console.error('notif error', e && e.message));

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

  notificationService.createNotification({
    title: 'Password Reset',
    message: 'Your password has been reset successfully.',
    type: 'INFO',
    priority: 'HIGH',
    user_id: record.user_id,
    recipients: [record.user_id],
    createdBy: record.user_id,
    channels: ['in_app', 'email', 'sms'],
  }).catch((e) => console.error('reset password notif error', e && e.message));

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
// § Branch selection after login
// ---------------------------------------------------------------------------

exports.listMyBranches = async (userId) => {
  if (!userId) throw new AppError('User ID is required.', { status: 400 });
  const branches = await authRepo.listBranchesForUser(userId);
  return { branches };
};

exports.selectBranch = async (userId, branchId) => {
  if (!userId || !branchId) {
    throw new AppError('User ID and branch ID are required.', { status: 400 });
  }

  // Verify the branch is actually assigned to this user
  const branches = await authRepo.listBranchesForUser(userId);
  const assigned = branches.find((b) => b.branch_id === branchId);
  if (!assigned) {
    throw new AppError('This branch is not assigned to your account.', { status: 403 });
  }
  if (!assigned.is_active) {
    throw new AppError('This branch is currently inactive.', { status: 400 });
  }

  // Update the user's default branch
  const updated = await authRepo.updateUserBranch(userId, branchId);
  if (!updated) {
    throw new AppError('Failed to update branch.', { status: 500 });
  }

  // Re-fetch the user with role info to sign a new token
  const fullUser = await authRepo.findUserForLogin(updated.username);
  if (!fullUser) {
    throw new AppError('Failed to refresh session.', { status: 500 });
  }

  // Find the existing session for this user to rotate the token
  const sessions = await authRepo.listSessionsForUser(userId, { limit: 1 });
  const session = sessions[0];

  if (session) {
    const newJti = crypto.randomUUID();
    await authRepo.rotateSessionToken(session.session_id, newJti);

    // Keep the same login attribution across branch re-signing.
    const login = await authRepo.findLoginBySessionId(session.session_id);
    const loginId = (login && login.login_id) || null;

    const accessToken = signAccessToken(fullUser, session.session_id, loginId);
    const refreshToken = signRefreshToken(userId, session.session_id, newJti, loginId);

    await auditRepo.writeLog(userId, 'SELECT_BRANCH', 'USER', userId);

    return {
      accessToken,
      refreshToken,
      branch: assigned,
      user: {
        userId: updated.user_id,
        username: updated.username,
        fullName: updated.full_name,
        email: updated.email,
        role: fullUser.role_name,
        branchId: branchId,
        profilePhoto: updated.profile_photo,
      },
    };
  }

  // Fallback: no active session, just return the branch info
  await auditRepo.writeLog(userId, 'SELECT_BRANCH', 'USER', userId);
  return {
    branch: assigned,
    user: {
      userId: updated.user_id,
      username: updated.username,
      fullName: updated.full_name,
      email: updated.email,
      role: fullUser.role_name,
      branchId: branchId,
      profilePhoto: updated.profile_photo,
    },
  };
};

// ---------------------------------------------------------------------------
// § Profile — get / update / change password
// ---------------------------------------------------------------------------

exports.getProfile = async (userId) => {
  if (!userId) throw new AppError('User ID is required.', { status: 400 });
  const user = await userRepo.findUserById(userId);
  if (!user) throw new AppError('User not found.', { status: 404 });
  return {
    userId: user.user_id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    profilePhoto: user.profile_photo,
    role: user.role_name,
    branchId: user.branch_id,
    branchName: user.branch_name,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

exports.updateProfile = async (userId, { fullName, email, phone, profilePhoto } = {}) => {
  if (!userId) throw new AppError('User ID is required.', { status: 400 });

  const current = await userRepo.findUserById(userId);
  if (!current) throw new AppError('User not found.', { status: 404 });

  if (email !== undefined) {
    const existing = await userRepo.findUserByEmail(email);
    if (existing && existing.user_id !== userId) {
      throw new AppError('Email is already in use by another account.', { status: 409 });
    }
  }

  const updated = await userRepo.updateUser(userId, { fullName, email, phone, profilePhoto });
  if (!updated) throw new AppError('Failed to update profile.', { status: 500 });

  await auditRepo.writeLog(userId, 'UPDATE_PROFILE', 'USER', userId);

  const changes = []
  const fieldMap = [
    { key: 'fullName', label: 'full name', old: current.full_name, new: fullName },
    { key: 'email', label: 'email', old: current.email, new: email },
    { key: 'phone', label: 'phone number', old: current.phone, new: phone },
    { key: 'profilePhoto', label: 'profile photo', old: current.profile_photo, new: profilePhoto },
  ]

  for (const f of fieldMap) {
    if (f.new === undefined) continue
    const oldStr = f.old || '(none)'
    const newStr = f.new || '(none)'
    if (oldStr === newStr) continue
    if (f.key === 'profilePhoto') {
      changes.push('profile photo has been updated')
    } else {
      changes.push(`${f.label} from ${oldStr} to ${newStr}`)
    }
  }

  let message
  if (changes.length === 0) {
    message = 'Your profile information has been updated.'
  } else if (changes.length === 1) {
    message = `Your ${changes[0]}.`
  } else {
    const summary = changes.slice(1).map((c) => c.split(' from ')[0]).join(' and ')
    const firstLabel = changes[0].split(' from ')[0]
    message = `Your ${firstLabel} and ${summary} have been updated: ${changes.join(', ')}.`
  }

  notificationService.createNotification({
    title: 'Profile Updated',
    message,
    type: 'INFO',
    priority: 'LOW',
    user_id: userId,
    recipients: [userId],
    createdBy: userId,
    channels: ['in_app', 'email', 'sms'],
  }).catch((e) => console.error('profile update notif error', e && e.message));

  return exports.getProfile(userId);
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
  if (!userId || !currentPassword || !newPassword) {
    throw new AppError('User ID, current password, and new password are required.', { status: 400 });
  }

  const user = await userRepo.findUserById(userId);
  if (!user) throw new AppError('User not found.', { status: 404 });

  const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Current password is incorrect.', { code: 'INVALID_PASSWORD', status: 401 });
  }

  const same = await bcrypt.compare(newPassword, user.password_hash);
  if (same) {
    throw new AppError('New password must be different from current password.', { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepo.updatePassword(userId, passwordHash);
  await authRepo.revokeAllSessionsForUser(userId);
  await auditRepo.writeLog(userId, 'CHANGE_PASSWORD', 'USER', userId);

  notificationService.createNotification({
    title: 'Password Changed',
    message: 'Your password has been changed successfully.',
    type: 'INFO',
    priority: 'HIGH',
    user_id: userId,
    recipients: [userId],
    createdBy: userId,
    channels: ['in_app', 'email', 'sms'],
  }).catch((e) => console.error('change password notif error', e && e.message));

  return { message: 'Password changed successfully. Please log in again.' };
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
