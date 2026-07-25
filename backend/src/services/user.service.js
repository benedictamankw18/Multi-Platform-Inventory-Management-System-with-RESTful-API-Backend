const bcrypt = require('bcrypt');
const userRepo = require('../repositories/user.repository');
const roleRepo = require('../repositories/role.repository');
const authRepo = require('../repositories/auth.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;
const UNIQUE_VIOLATION = '23505';
const MIN_PASSWORD_LENGTH = 8;

function splitName(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
  };
}

function sanitizeUser(row) {
  if (!row) return null;

  const { password_hash, role_id, role_name, full_name, ...safe } = row;
  const names = splitName(full_name);

  return {
    ...safe,
    full_name,
    first_name: names.first_name,
    last_name: names.last_name,
    role_id,
    role_name,
    roles: role_id ? [role_id] : [],
  };
}

function getActorId(actorId) {
  return actorId || null;
}

function buildFullName({ first_name, last_name, fullName, full_name } = {}) {
  if (fullName) return fullName.trim();
  if (full_name) return full_name.trim();

  const full = [first_name, last_name].filter(Boolean).join(' ').trim();
  return full || undefined;
}

function generateUsername(email) {
  const localPart = String(email).split('@')[0] || 'user';
  const cleaned = localPart.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 32) || 'user';
  return `${cleaned}-${Date.now().toString(36)}`.slice(0, 50);
}

function normalizeRoles(input) {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) {
    throw new AppError('roles must be an array.', { code: 'VALIDATION_ERROR', status: 400 });
  }
  if (input.length === 0) {
    throw new AppError('roles must contain at least one role id.', { code: 'VALIDATION_ERROR', status: 400 });
  }
  return [...new Set(input)];
}

async function requireUser(userId) {
  const user = await userRepo.findUserById(userId);
  if (!user) throw new AppError('User not found.', { code: 'USER_NOT_FOUND', status: 404 });
  return user;
}

async function requireValidRoles(roleIds = []) {
  await Promise.all(roleIds.map(async (roleId) => {
    if (!(await roleRepo.roleExists(roleId))) {
      throw new AppError(`Role ${roleId} does not exist.`, { code: 'ROLE_NOT_FOUND', status: 400 });
    }
  }));
}

async function requireValidBranch(branchId) {
  if (branchId && !(await userRepo.branchExistsAndActive(branchId))) {
    throw new AppError('branch_id does not match an existing, active branch.', {
      code: 'BRANCH_NOT_FOUND',
      status: 400,
    });
  }
}

exports.createUser = async (payload = {}, actorId = null) => {
  const fullName = buildFullName(payload);
  const roles = normalizeRoles(payload.roles);
  const branchId = payload.branch_id ?? payload.branchId;
  const username = payload.username || generateUsername(payload.email);

  if (!payload.email || !payload.password || !fullName || !roles) {
    throw new AppError('email, password, first_name, last_name, and roles are required.', {
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  }

  if (payload.password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`, {
      code: 'WEAK_PASSWORD',
      status: 400,
    });
  }

  if (await userRepo.findUserByEmail(payload.email)) {
    throw new AppError('A user with that email already exists.', { code: 'DUPLICATE_EMAIL', status: 409 });
  }

  await requireValidRoles(roles);
  await requireValidBranch(branchId);

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  try {
    const created = await userRepo.createUser({
      branchId,
      roleId: roles[0],
      fullName,
      username,
      email: payload.email,
      phone: payload.phone,
      passwordHash,
    });

    await auditRepo.writeLog(getActorId(actorId), 'CREATE_USER', 'USER', created.user_id, {
      email: payload.email,
      roles,
    });

    return sanitizeUser({ ...created, role_name: undefined });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      throw new AppError('A user with that username or email already exists.', {
        code: 'DUPLICATE_USER',
        status: 409,
      });
    }
    throw err;
  }
};

exports.listUsers = async (filters = {}) => {
  const normalized = {
    q: filters.q,
    branchId: filters.branch_id ?? filters.branchId,
    roleId: filters.role_id ?? filters.roleId,
    isActive: filters.is_active ?? filters.isActive,
    page: filters.page,
    limit: filters.limit,
  };

  const [users, total] = await Promise.all([
    userRepo.listUsers(normalized),
    userRepo.countUsers(normalized),
  ]);

  const limit = Math.min(Number(normalized.limit) || 25, 100);
  const page = Math.max(Number(normalized.page) || 1, 1);

  return {
    users: users.map(sanitizeUser),
    pagination: { page, limit, total },
  };
};

exports.getUserById = async (userId) => {
  return sanitizeUser(await requireUser(userId));
};

exports.updateUser = async (userId, payload = {}, actorId = null) => {
  const existing = await requireUser(userId);
  const fullName = buildFullName({
    first_name: payload.first_name ?? splitName(existing.full_name).first_name,
    last_name: payload.last_name ?? splitName(existing.full_name).last_name,
    fullName: payload.fullName,
    full_name: payload.full_name,
  });
  const branchId = payload.branch_id ?? payload.branchId;
  const roles = normalizeRoles(payload.roles);
  const roleId = payload.role_id || payload.roleId || (roles ? roles[0] : undefined);
  const hasProfilePatch = payload.email !== undefined || payload.first_name !== undefined ||
    payload.last_name !== undefined || payload.fullName !== undefined || payload.full_name !== undefined ||
    branchId !== undefined || payload.phone !== undefined;

  if (!hasProfilePatch && roleId === undefined) {
    throw new AppError('No updatable fields were provided.', { code: 'VALIDATION_ERROR', status: 400 });
  }

  if (payload.email && payload.email.toLowerCase() !== String(existing.email || '').toLowerCase()) {
    const emailUser = await userRepo.findUserByEmail(payload.email);
    if (emailUser && emailUser.user_id !== userId) {
      throw new AppError('That email is already in use by another user.', {
        code: 'DUPLICATE_EMAIL',
        status: 409,
      });
    }
  }

  await requireValidBranch(branchId);
  if (roles) await requireValidRoles(roles);
  if (roleId && !roles) await requireValidRoles([roleId]);

  let updated = existing;
  if (hasProfilePatch) {
    try {
      updated = await userRepo.updateUser(userId, {
        fullName,
        email: payload.email,
        branchId,
        phone: payload.phone,
      });
    } catch (err) {
      if (err.code === UNIQUE_VIOLATION) {
        throw new AppError('That email is already in use by another user.', {
          code: 'DUPLICATE_EMAIL',
          status: 409,
        });
      }
      throw err;
    }
  }

  if (roleId !== undefined && roleId !== existing.role_id) {
    if (actorId && actorId === userId) {
      throw new AppError('You cannot change your own role.', { code: 'SELF_ROLE_CHANGE', status: 400 });
    }

    updated = await userRepo.updateUserRole(userId, roleId);
    await authRepo.revokeAllSessionsForUser(userId);
  }

  await auditRepo.writeLog(getActorId(actorId), 'UPDATE_USER', 'USER', userId, {
    email: payload.email,
    branch_id: branchId,
    roles: roles || (roleId ? [roleId] : undefined),
  });

  return sanitizeUser(await userRepo.findUserById(updated.user_id || userId));
};

exports.assignRole = async (userId, roleId, actorId = null) => {
  return exports.updateUser(userId, { roles: [roleId] }, actorId);
};

exports.deleteUser = async (userId, actorId = null) => {
  if (actorId && actorId === userId) {
    throw new AppError('You cannot delete your own account.', { code: 'SELF_DELETE', status: 400 });
  }

  await requireUser(userId);
  const deleted = await userRepo.deleteUser(userId);
  await authRepo.revokeAllSessionsForUser(userId);
  await auditRepo.writeLog(getActorId(actorId), 'DELETE_USER', 'USER', userId);

  return sanitizeUser(deleted);
};

exports.deactivateUser = async (userId, actorId = null) => {
  if (actorId && actorId === userId) {
    throw new AppError('You cannot deactivate your own account.', { code: 'SELF_DEACTIVATE', status: 400 });
  }

  const existing = await requireUser(userId);
  if (!existing.is_active) {
    return { alreadyInState: true, user: sanitizeUser(existing) };
  }

  const updated = await userRepo.setActiveStatus(userId, false);
  await authRepo.revokeAllSessionsForUser(userId);
  await auditRepo.writeLog(getActorId(actorId), 'DEACTIVATE_USER', 'USER', userId);

  return { alreadyInState: false, user: sanitizeUser(updated) };
};

exports.reactivateUser = async (userId, actorId = null) => {
  const existing = await requireUser(userId);
  if (existing.is_active) {
    return { alreadyInState: true, user: sanitizeUser(existing) };
  }

  const updated = await userRepo.setActiveStatus(userId, true);
  await auditRepo.writeLog(getActorId(actorId), 'REACTIVATE_USER', 'USER', userId);

  return { alreadyInState: false, user: sanitizeUser(updated) };
};
