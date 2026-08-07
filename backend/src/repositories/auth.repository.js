/**
 * auth.repository.js
 *
 * Pure data-access layer backing authentication. No bcrypt, no JWT, no
 * cookie handling, no business rules — all of that is auth.service.js's
 * job. Every exported function is a thin wrapper around one SQL statement,
 * same convention as role.repository.js / permission.repository.js.
 *
 * Session revocation is also used outside the auth flow itself — when
 * user.service.js changes someone's role or deactivates their account, it
 * needs to kill their existing sessions immediately rather than waiting for
 * their access token to expire. Rather than duplicate that query, those
 * cross-cutting session functions live here (since user_sessions is
 * fundamentally an auth-table concern) and user.service.js requires this
 * file alongside user.repository.js.
 */

const db = require('../config/db');

// ---------------------------------------------------------------------------
// Login lookup
// ---------------------------------------------------------------------------

exports.findUserForLogin = async (usernameOrEmail, client = db) => {
  const query = `
    SELECT u.user_id, u.username, u.full_name, u.email, u.password_hash,
           u.is_active, u.branch_id, r.role_id, r.role_name
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    WHERE u.username = $1 OR u.email = $1
    LIMIT 1;
  `;
  const { rows } = await client.query(query, [usernameOrEmail]);
  return rows[0];
};

exports.updateLastLogin = async (userId, client = db) => {
  const query = `UPDATE users SET last_login_at = now() WHERE user_id = $1;`;
  await client.query(query, [userId]);
};

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

exports.createSession = async ({ sessionId, userId, tokenIdentifier, expiresAt }, client = db) => {
  const query = `
    INSERT INTO user_sessions (session_id, user_id, token_identifier, issued_at, expires_at, last_activity_at, revoked)
    VALUES ($1, $2, $3, now(), $4, now(), FALSE)
    RETURNING session_id, user_id, expires_at;
  `;
  const { rows } = await client.query(query, [sessionId, userId, tokenIdentifier, expiresAt]);
  return rows[0];
};

// Joined with the owning user + role so the service layer has everything it
// needs to re-issue an access token without a second round trip.
exports.getSessionById = async (sessionId, client = db) => {
  const query = `
    SELECT s.session_id, s.user_id, s.token_identifier, s.expires_at,
           s.last_activity_at, s.revoked,
           u.is_active, u.branch_id, r.role_id, r.role_name
    FROM user_sessions s
    JOIN users u ON u.user_id = s.user_id
    JOIN roles r ON r.role_id = u.role_id
    WHERE s.session_id = $1
    LIMIT 1;
  `;
  const { rows } = await client.query(query, [sessionId]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// List sessions for a user
// ---------------------------------------------------------------------------
exports.listSessionsForUser = async (userId, { limit = 50, offset = 0 } = {}, client = db) => {
  const query = `
    SELECT s.session_id, s.user_id, s.token_identifier, s.issued_at, s.expires_at, s.last_activity_at, s.revoked, s.created_at, s.updated_at
    FROM user_sessions s
    WHERE s.user_id = $1
    ORDER BY s.revoked ASC, s.issued_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const { rows } = await client.query(query, [userId, limit, offset]);
  return rows;
};

exports.countSessionsForUser = async (userId, client = db) => {
  const query = `
    SELECT COUNT(*)::int AS total
    FROM user_sessions
    WHERE user_id = $1;
  `;
  const { rows } = await client.query(query, [userId]);
  return rows[0] ? rows[0].total : 0;
};

exports.rotateSessionToken = async (sessionId, newTokenIdentifier, client = db) => {
  const query = `
    UPDATE user_sessions
    SET token_identifier = $1, last_activity_at = now()
    WHERE session_id = $2
    RETURNING session_id;
  `;
  const { rows } = await client.query(query, [newTokenIdentifier, sessionId]);
  return rows[0];
};

exports.revokeSession = async (sessionId, client = db) => {
  const query = `
    UPDATE user_sessions
    SET revoked = TRUE
    WHERE session_id = $1
    RETURNING session_id;
  `;
  const { rows } = await client.query(query, [sessionId]);
  return rows[0];
};

// Used both by logout-everywhere flows and by user.service.js after a role
// change or deactivation, so a user's outstanding sessions can't keep
// operating under stale claims.
exports.revokeAllSessionsForUser = async (userId, client = db) => {
  const query = `
    UPDATE user_sessions
    SET revoked = TRUE
    WHERE user_id = $1 AND revoked = FALSE
    RETURNING session_id;
  `;
  const { rows } = await client.query(query, [userId]);
  return rows.map(r => r.session_id);
};

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

exports.createRefreshToken = async ({ refreshTokenId, userId, tokenHash, expiresAt }, client = db) => {
  const query = `
    INSERT INTO refresh_tokens (refresh_token_id, user_id, token_hash, expires_at, revoked, created_at, updated_at)
    VALUES ($1, $2, $3, $4, FALSE, now(), now())
    RETURNING refresh_token_id, user_id, expires_at, revoked, created_at;
  `;
  const { rows } = await client.query(query, [refreshTokenId || null, userId, tokenHash, expiresAt]);
  return rows[0];
};

exports.getRefreshTokenById = async (refreshTokenId, client = db) => {
  const query = `SELECT * FROM refresh_tokens WHERE refresh_token_id = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [refreshTokenId]);
  return rows[0];
};

exports.getRefreshTokenByHash = async (tokenHash, client = db) => {
  const query = `SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [tokenHash]);
  return rows[0];
};

exports.revokeRefreshToken = async (refreshTokenId, client = db) => {
  const query = `
    UPDATE refresh_tokens
    SET revoked = TRUE, updated_at = now()
    WHERE refresh_token_id = $1
    RETURNING refresh_token_id;
  `;
  const { rows } = await client.query(query, [refreshTokenId]);
  return rows[0];
};

exports.replaceRefreshToken = async (oldId, newId, client = db) => {
  const query = `
    UPDATE refresh_tokens
    SET revoked = TRUE, replaced_by = $2, updated_at = now()
    WHERE refresh_token_id = $1
    RETURNING refresh_token_id;
  `;
  const { rows } = await client.query(query, [oldId, newId]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Password reset tokens
// ---------------------------------------------------------------------------

exports.createPasswordResetToken = async ({ id, userId, token, expiresAt }, client = db) => {
  const query = `
    INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
    VALUES ($1, $2, $3, $4, FALSE, now())
    RETURNING id, user_id, expires_at, used, created_at;
  `;
  const { rows } = await client.query(query, [id || null, userId, token, expiresAt]);
  return rows[0];
};

exports.getPasswordResetTokenById = async (id, client = db) => {
  const query = `SELECT * FROM password_reset_tokens WHERE id = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [id]);
  return rows[0];
};

exports.getPasswordResetTokenByToken = async (token, client = db) => {
  const query = `SELECT * FROM password_reset_tokens WHERE token = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [token]);
  return rows[0];
};

exports.markPasswordResetUsed = async (id, client = db) => {
  const query = `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1 RETURNING id, used;`;
  const { rows } = await client.query(query, [id]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Login history
// ---------------------------------------------------------------------------

exports.createLoginHistory = async ({ loginId, userId, username, sessionId, successful, ipAddress = null, userAgent = null, device = null, operatingSystem = null, browser = null, failureReason = null, location = null }, client = db) => {
  const query = `
    INSERT INTO login_history (login_id, user_id, username, session_id, login_time, logout_time, ip_address, user_agent, device, operating_system, browser, successful, failure_reason, location, created_at)
    VALUES ($1,$2,$3,$4, now(), NULL, $5, $6, $7, $8, $9, $10, $11, $12, now())
    RETURNING login_id, user_id, username, session_id, login_time, successful, created_at;
  `;
  const params = [loginId || null, userId || null, username || null, sessionId || null, ipAddress, userAgent, device, operatingSystem, browser, successful, failureReason, location];
  const { rows } = await client.query(query, params);
  return rows[0];
};

exports.findLoginBySessionId = async (sessionId, client = db) => {
  const query = `
    SELECT login_id, session_id
    FROM login_history
    WHERE session_id = $1
    ORDER BY login_time DESC
    LIMIT 1;
  `;
  const { rows } = await client.query(query, [sessionId]);
  return rows[0] || null;
};

exports.listLoginHistoryForUser = async (userId, { limit = 50, offset = 0 } = {}, client = db) => {
  const query = `SELECT * FROM login_history WHERE user_id = $1 ORDER BY login_time DESC LIMIT $2 OFFSET $3;`;
  const { rows } = await client.query(query, [userId, limit, offset]);
  return rows;
};

// ---------------------------------------------------------------------------
// User-branch assignment (for branch selection after login)
// ---------------------------------------------------------------------------

exports.listBranchesForUser = async (userId, client = db) => {
  const query = `
    SELECT b.branch_id, b.branch_name, b.address, b.city, b.country, b.is_active
    FROM user_branches ub
    JOIN branches b ON b.branch_id = ub.branch_id
    WHERE ub.user_id = $1
    ORDER BY b.branch_name;
  `;
  const { rows } = await client.query(query, [userId]);
  return rows;
};

exports.updateUserBranch = async (userId, branchId, client = db) => {
  const query = `
    UPDATE users SET branch_id = $1, updated_at = now()
    WHERE user_id = $2 AND deleted_at IS NULL
    RETURNING user_id, branch_id, role_id, full_name, username, email, is_active;
  `;
  const { rows } = await client.query(query, [branchId, userId]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------

exports.createActivityLog = async ({ activityId, userId, activity, ipAddress = null }, client = db) => {
  const query = `
    INSERT INTO activity_logs (activity_id, user_id, activity, ip_address, created_at)
    VALUES ($1,$2,$3,$4, now())
    RETURNING activity_id, user_id, activity, ip_address, created_at;
  `;
  const { rows } = await client.query(query, [activityId || null, userId || null, activity, ipAddress]);
  return rows[0];
};

exports.listActivityLogsForUser = async (userId, { limit = 50, offset = 0 } = {}, client = db) => {
  const query = `SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;`;
  const { rows } = await client.query(query, [userId, limit, offset]);
  return rows;
};
