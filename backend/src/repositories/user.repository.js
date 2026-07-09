/**
 * user.repository.js
 *
 * Pure data-access layer for the `users` table. No bcrypt, no validation,
 * no business rules, no audit logging — those belong in user.service.js.
 *
 * Role-change session revocation lives in auth.repository.js
 * (revokeAllSessionsForUser), not here — see that file's header for why.
 * user.service.js requires both repositories.
 *
 * branchExistsAndActive() is a small duplication of what would ideally be
 * branch.repository.js's job, but that file doesn't exist yet (branches
 * are still served by a flat controller). Keeping one tiny query here
 * avoids a circular/premature dependency on a layer that hasn't been built;
 * replace this with a call into branch.repository.js once that's split out.
 */

const db = require('../config/db');

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

exports.createUser = async ({ branchId, roleId, fullName, username, email, passwordHash }, client = db) => {
  const query = `
    INSERT INTO users (branch_id, role_id, full_name, username, email, password_hash)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING user_id, branch_id, role_id, full_name, username, email, is_active, created_at;
  `;
  const { rows } = await client.query(query, [branchId || null, roleId, fullName, username, email, passwordHash]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

// Includes password_hash deliberately — callers that need the hash (login,
// password verification) use this; user.service.js strips it before
// anything reaches the controller. Use findUserByIdSafe() below when the
// hash is never needed.
exports.findUserById = async (userId, client = db) => {
  const query = `
    SELECT u.user_id, u.branch_id, u.role_id, u.full_name, u.username, u.email,
           u.password_hash, u.is_active, u.last_login_at, u.created_at, u.updated_at,
           r.role_name, b.branch_name
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN branches b ON b.branch_id = u.branch_id
    WHERE u.user_id = $1 AND u.deleted_at IS NULL;
  `;
  const { rows } = await client.query(query, [userId]);
  return rows[0];
};

exports.findUserByEmail = async (email, client = db) => {
  const query = `
    SELECT user_id, username, email
    FROM users
    WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
    LIMIT 1;
  `;
  const { rows } = await client.query(query, [email]);
  return rows[0];
};

exports.findUserByUsernameOrEmail = async (usernameOrEmail, client = db) => {
  const query = `
    SELECT user_id, username, email
    FROM users
    WHERE (username = $1 OR email = $1) AND deleted_at IS NULL
    LIMIT 1;
  `;
  const { rows } = await client.query(query, [usernameOrEmail]);
  return rows[0];
};

exports.listUsers = async ({ branchId, roleId, isActive, page = 1, limit = 25 } = {}, client = db) => {
  const conditions = [];
  const values = [];

  if (branchId) { values.push(branchId); conditions.push(`u.branch_id = $${values.length}`); }
  if (roleId)   { values.push(roleId);   conditions.push(`u.role_id = $${values.length}`); }
  if (isActive !== undefined) { values.push(isActive); conditions.push(`u.is_active = $${values.length}`); }
  conditions.push('u.deleted_at IS NULL');

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.min(Number(limit) || 25, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const safeOffset = (safePage - 1) * safeLimit;

  const query = `
    SELECT u.user_id, u.branch_id, u.role_id, u.full_name, u.username, u.email,
           u.is_active, u.last_login_at, u.created_at,
           r.role_name, b.branch_name
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN branches b ON b.branch_id = u.branch_id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset};
  `;
  const { rows } = await client.query(query, values);
  return rows;
};

exports.countUsers = async ({ branchId, roleId, isActive } = {}, client = db) => {
  const conditions = [];
  const values = [];

  if (branchId) { values.push(branchId); conditions.push(`branch_id = $${values.length}`); }
  if (roleId)   { values.push(roleId);   conditions.push(`role_id = $${values.length}`); }
  if (isActive !== undefined) { values.push(isActive); conditions.push(`is_active = $${values.length}`); }
  conditions.push('deleted_at IS NULL');

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT COUNT(*) FROM users ${whereClause};`;
  const { rows } = await client.query(query, values);
  return Number(rows[0].count);
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

exports.updateUser = async (userId, { fullName, email, branchId } = {}, client = db) => {
  const fields = [];
  const values = [];

  if (fullName !== undefined) { values.push(fullName); fields.push(`full_name = $${values.length}`); }
  if (email !== undefined) { values.push(email); fields.push(`email = $${values.length}`); }
  if (branchId !== undefined) { values.push(branchId); fields.push(`branch_id = $${values.length}`); }

  if (fields.length === 0) {
    return exports.findUserById(userId, client);
  }

  values.push(userId);
  const query = `
    UPDATE users SET ${fields.join(', ')}
    WHERE user_id = $${values.length} AND deleted_at IS NULL
    RETURNING user_id, branch_id, role_id, full_name, username, email, is_active, updated_at;
  `;

  const { rows } = await client.query(query, values);
  return rows[0];
};

exports.updateUserRole = async (userId, roleId, client = db) => {
  const query = `
    UPDATE users SET role_id = $1
    WHERE user_id = $2 AND deleted_at IS NULL
    RETURNING user_id, role_id, full_name, username, email, is_active;
  `;
  const { rows } = await client.query(query, [roleId, userId]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Update password (used by password reset flows)
// ---------------------------------------------------------------------------
exports.updatePassword = async (userId, passwordHash, client = db) => {
  const query = `
    UPDATE users SET password_hash = $1, updated_at = now()
    WHERE user_id = $2
    RETURNING user_id, username, email, updated_at;
  `;
  const { rows } = await client.query(query, [passwordHash, userId]);
  return rows[0];
};

exports.setActiveStatus = async (userId, isActive, client = db) => {
  const query = `
    UPDATE users SET is_active = $1
    WHERE user_id = $2 AND deleted_at IS NULL
    RETURNING user_id, full_name, username, email, is_active;
  `;
  const { rows } = await client.query(query, [isActive, userId]);
  return rows[0];
};

exports.deleteUser = async (userId, client = db) => {
  const query = `
    UPDATE users
    SET is_active = FALSE, deleted_at = now()
    WHERE user_id = $1 AND deleted_at IS NULL
    RETURNING user_id, full_name, username, email, is_active, deleted_at;
  `;
  const { rows } = await client.query(query, [userId]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

// See file header — placeholder until branch.repository.js exists.
exports.branchExistsAndActive = async (branchId, client = db) => {
  const query = `SELECT 1 FROM branches WHERE branch_id = $1 AND is_active = TRUE;`;
  const { rows } = await client.query(query, [branchId]);
  return rows.length > 0;
};
