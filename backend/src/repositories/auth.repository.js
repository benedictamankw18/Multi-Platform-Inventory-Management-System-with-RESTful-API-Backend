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
