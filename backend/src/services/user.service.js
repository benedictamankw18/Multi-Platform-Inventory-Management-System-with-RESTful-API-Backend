/**
 * user.service.js
 *
 * Business logic for user management (FR-003, FR-004). Sits between
 * user.repository.js / role.repository.js / auth.repository.js (all pure
 * SQL) and the thin user.controller.js (HTTP mapping only).
 *
 * Responsibilities handled here:
 *   - Password hashing (bcrypt)
 *   - Validation (required fields, password strength)
 *   - Role/branch existence checks (delegated to role.repository.js's
 *     roleExists() and user.repository.js's branchExistsAndActive())
 *   - Self-protection rules (can't change your own role, can't deactivate
 *     yourself)
 *   - Session revocation on role change / deactivation, via
 *     auth.repository.js (so a user's outstanding sessions can't keep
 *     operating under stale claims)
 *   - Audit logging via audit.repository.js
 *   - Stripping password_hash before anything reaches the controller
 *
 * § Error contract
 * All exported functions throw AppError on business-rule violations:
 *   try { ... }
 *   catch (err) { res.status(err.status || 500).json({ message: err.message }); }
 */

const bcrypt    = require('bcrypt');
const userRepo  = require('../repositories/user.repository');
const roleRepo  = require('../repositories/role.repository');
const authRepo  = require('../repositories/auth.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError  = require('../utils/AppError');

const SALT_ROUNDS = 10;
const UNIQUE_VIOLATION = '23505';
const MIN_PASSWORD_LENGTH = 8;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sanitizeUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

async function _requireUser(userId) {
  const user = await userRepo.findUserById(userId);
  if (!user) throw new AppError('User not found.', { code: 'USER_NOT_FOUND', status: 404 });
  return user;
}

async function _requireValidRole(roleId) {
  if (!(await roleRepo.roleExists(roleId))) {
    throw new AppError('roleId does not match an existing role.', { code: 'ROLE_NOT_FOUND', status: 400 });
  }
}

async function _requireValidBranch(branchId) {
  if (branchId && !(await userRepo.branchExistsAndActive(branchId))) {
    throw new AppError(
      'branchId does not match an existing, active branch.',
      { code: 'BRANCH_NOT_FOUND', status: 400 }
    );
  }
}

// ---------------------------------------------------------------------------
// § createUser                                                      (FR-004)
// ---------------------------------------------------------------------------

exports.createUser = async ({ fullName, username, email, password, roleId, branchId } = {}, actorId = null) => {
  if (!fullName || !username || !email || !password || !roleId) {
    throw new AppError(
      'fullName, username, email, password, and roleId are required.',
      { code: 'VALIDATION_ERROR', status: 400 }
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      { code: 'WEAK_PASSWORD', status: 400 }
    );
  }

  await _requireValidRole(roleId);
  await _requireValidBranch(branchId);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let newUser;
  try {
    newUser = await userRepo.createUser({ branchId, roleId, fullName, username, email, passwordHash });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      throw new AppError('A user with that username or email already exists.', { code: 'DUPLICATE_USER', status: 409 });
    }
    throw err;
  }

  await auditRepo.writeLog(actorId, 'CREATE_USER', 'USER', newUser.user_id, { username, roleId });

  return newUser; // createUser's RETURNING clause never includes password_hash
};

// ---------------------------------------------------------------------------
// § Read
// ---------------------------------------------------------------------------

exports.listUsers = async (filters = {}) => {
  const [users, total] = await Promise.all([
    userRepo.listUsers(filters),
    userRepo.countUsers(filters),
  ]);

  const safeLimit = Math.min(Number(filters.limit) || 25, 100);
  const safePage = Math.max(Number(filters.page) || 1, 1);
  return { users, pagination: { page: safePage, limit: safeLimit, total } };
};

exports.getUserById = async (userId) => {
  const user = await _requireUser(userId);
  return sanitizeUser(user);
};

// ---------------------------------------------------------------------------
// § updateUser                                                      (FR-004)
//
// Deliberately excludes role changes — see assignRole() below for why that
// is its own endpoint with its own session-revocation behaviour.
// ---------------------------------------------------------------------------

exports.updateUser = async (userId, { fullName, email, branch_id } = {}, actorId = null) => {
  if (fullName === undefined && email === undefined && branch_id === undefined ) {
    throw new AppError('No updatable fields were provided.', { code: 'VALIDATION_ERROR', status: 400 });
  }

  await _requireUser(userId);
  await _requireValidBranch(branch_id);

  let updated;
  try {
    updated = await userRepo.updateUser(userId, { fullName, email, branch_id });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      throw new AppError('That email is already in use by another user.', { code: 'DUPLICATE_EMAIL', status: 409 });
    }
    throw err;
  }

  await auditRepo.writeLog(actorId, 'UPDATE_USER', 'USER', userId, { fullName, email, branch_id });

  return updated;
};

// ---------------------------------------------------------------------------
// § assignRole                                                      (FR-003)
//
// A role change is security-sensitive: it gets its own audit entry, and any
// sessions already issued for this user are revoked so the new role takes
// effect immediately rather than waiting for their access token to expire.
// ---------------------------------------------------------------------------

exports.assignRole = async (userId, roleId, actorId = null) => {
  if (!roleId) {
    throw new AppError('roleId is required.', { code: 'VALIDATION_ERROR', status: 400 });
  }
  if (actorId && actorId === userId) {
    throw new AppError(
      'You cannot change your own role. Ask another administrator to do this.',
      { code: 'SELF_ROLE_CHANGE', status: 400 }
    );
  }

  const existing = await _requireUser(userId);
  const newRole = await roleRepo.getRoleById(roleId);
  if (!newRole) {
    throw new AppError('roleId does not match an existing role.', { code: 'ROLE_NOT_FOUND', status: 400 });
  }

  const updated = await userRepo.updateUserRole(userId, roleId);

  // Force re-authentication so the new role takes effect immediately.
  await authRepo.revokeAllSessionsForUser(userId);

  await auditRepo.writeLog(actorId, 'ASSIGN_ROLE', 'USER', userId, {
    previousRole: existing.role_name,
    newRole: newRole.role_name,
  });

  return updated;
};

// ---------------------------------------------------------------------------
// § deactivateUser / reactivateUser                                 (FR-004)
// ---------------------------------------------------------------------------

exports.deactivateUser = async (userId, actorId = null) => {
  if (actorId && actorId === userId) {
    throw new AppError('You cannot deactivate your own account.', { code: 'SELF_DEACTIVATE', status: 400 });
  }

  const existing = await _requireUser(userId);
  if (!existing.is_active) {
    return { alreadyInState: true, user: sanitizeUser(existing) };
  }

  const updated = await userRepo.setActiveStatus(userId, false);

  // Deactivating a user should immediately cut off any session they're
  // still holding, not just block future logins.
  await authRepo.revokeAllSessionsForUser(userId);

  await auditRepo.writeLog(actorId, 'DEACTIVATE_USER', 'USER', userId);

  return { alreadyInState: false, user: updated };
};

exports.reactivateUser = async (userId, actorId = null) => {
  const existing = await _requireUser(userId);
  if (existing.is_active) {
    return { alreadyInState: true, user: sanitizeUser(existing) };
  }

  const updated = await userRepo.setActiveStatus(userId, true);

  await auditRepo.writeLog(actorId, 'REACTIVATE_USER', 'USER', userId);

  return { alreadyInState: false, user: updated };
};
