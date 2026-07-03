/**
 * role.service.js
 *
 * Business logic for roles and the permissions attached to them. This is
 * the layer between role.repository.js / permission.repository.js (pure SQL)
 * and the thin role.controller.js (HTTP mapping only).
 *
 * Responsibilities handled here and nowhere else:
 *   - Existence checks    ("does this role/permission actually exist?")
 *   - Duplicate-name checks
 *   - System-role protection ("Administrator" can't be renamed or deleted)
 *   - canDeleteRole composition (isSystemRole + roleInUse)
 *   - Transactions  (replaceRolePermissions needs atomic remove+insert)
 *   - Audit logging via audit.repository.js
 *   - Cache invalidation stubs (see § Cache below)
 *
 * What is NOT here:
 *   - HTTP status codes / res.json() — controller's job
 *   - Raw SQL / pool calls  — repository's job
 *   - Password hashing / JWT — auth.service.js's job
 *
 * § Cache
 * Several read results (dropdown lists, role summaries) are good candidates
 * for an in-memory or Redis cache, especially on a multi-branch deployment
 * where role data rarely changes. Each mutating function calls
 * _invalidateRoleCache() before returning. That function is currently a
 * no-op stub; replace its body with your cache client's flush/del call when
 * you add caching, without touching anything else in this file.
 *
 * § Error contract
 * All exported functions throw AppError on business-rule violations. The
 * controller only needs:
 *
 *   try { ... }
 *   catch (err) { res.status(err.status || 500).json({ message: err.message }); }
 */

const db        = require('../config/db');
const roleRepo  = require('../repositories/role.repository');
const permRepo  = require('../repositories/permission.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError  = require('../utils/AppError');

// ---------------------------------------------------------------------------
// Cache invalidation stub (§ Cache above)
// ---------------------------------------------------------------------------

function _invalidateRoleCache() {
  // TODO: await redisClient.del('roles:dropdown', 'roles:all', ...);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _requireRole(roleId) {
  const role = await roleRepo.getRoleById(roleId);
  if (!role) throw new AppError('Role not found.', { code: 'ROLE_NOT_FOUND', status: 404 });
  return role;
}

async function _requirePermission(permissionId) {
  const perm = await permRepo.getPermissionById(permissionId);
  if (!perm) throw new AppError('Permission not found.', { code: 'PERMISSION_NOT_FOUND', status: 404 });
  return perm;
}

// Validates every ID in the array exists and returns the full permission rows.
// Collecting all missing IDs before throwing gives the caller one actionable
// error ("IDs X, Y not found") rather than failing on the first bad one.
async function _requireAllPermissions(permissionIds) {
  if (!permissionIds || permissionIds.length === 0) return [];

  const checks = await Promise.all(
    permissionIds.map(id => permRepo.getPermissionById(id).then(p => ({ id, found: !!p })))
  );
  const missing = checks.filter(c => !c.found).map(c => c.id);
  if (missing.length > 0) {
    throw new AppError(
      `The following permission IDs do not exist: ${missing.join(', ')}`,
      { code: 'PERMISSION_NOT_FOUND', status: 400 }
    );
  }
  return checks.map(c => c.id);
}

function _assertNotSystemRole(role, action = 'modified') {
  if (role.is_system) {
    throw new AppError(
      `System roles cannot be ${action}.`,
      { code: 'SYSTEM_ROLE_PROTECTED', status: 403 }
    );
  }
}

// ---------------------------------------------------------------------------
// § Role CRUD
// ---------------------------------------------------------------------------

exports.createRole = async ({ roleName, description = null } = {}, actorId = null) => {
  if (!roleName || !roleName.trim()) {
    throw new AppError('roleName is required.', { code: 'VALIDATION_ERROR', status: 400 });
  }

  const existing = await roleRepo.getRoleByName(roleName);
  if (existing) {
    throw new AppError(
      `A role named "${roleName}" already exists.`,
      { code: 'DUPLICATE_ROLE_NAME', status: 409 }
    );
  }

  const role = await roleRepo.createRole({ roleName: roleName.trim(), description });

  await auditRepo.writeLog(actorId, 'CREATE_ROLE', 'ROLE', role.role_id, { roleName });
  _invalidateRoleCache();

  return role;
};

exports.getRoleById = async (roleId) => {
  return _requireRole(roleId);
};

exports.getRoleByName = async (roleName) => {
  const role = await roleRepo.getRoleByName(roleName);
  if (!role) throw new AppError('Role not found.', { code: 'ROLE_NOT_FOUND', status: 404 });
  return role;
};

// Thin delegation — no business rules on reads.
exports.getAllRoles    = (filters)          => roleRepo.getAllRoles(filters);
exports.searchRoles   = (q)                => roleRepo.searchRoles(q);
exports.paginateRoles = (paginationOpts)   => roleRepo.paginateRoles(paginationOpts);
exports.countRoles    = (filters)          => roleRepo.countRoles(filters);

exports.updateRole = async (roleId, { roleName, description } = {}, actorId = null) => {
  const role = await _requireRole(roleId);

  // System roles can have their description edited, but not renamed — a name
  // change would silently break any authorize('Administrator') middleware
  // checking by role_name.
  if (roleName !== undefined && roleName !== role.role_name) {
    _assertNotSystemRole(role, 'renamed');

    const conflict = await roleRepo.getRoleByName(roleName);
    if (conflict) {
      throw new AppError(
        `A role named "${roleName}" already exists.`,
        { code: 'DUPLICATE_ROLE_NAME', status: 409 }
      );
    }
  }

  const updated = await roleRepo.updateRole(roleId, { roleName, description });

  await auditRepo.writeLog(actorId, 'UPDATE_ROLE', 'ROLE', roleId, {
    previousName: role.role_name,
    roleName,
    description,
  });
  _invalidateRoleCache();

  return updated;
};

exports.deleteRole = async (roleId, actorId = null) => {
  const role = await _requireRole(roleId);

  _assertNotSystemRole(role, 'deleted');

  if (await roleRepo.roleInUse(roleId)) {
    const count = await roleRepo.countUsersInRole(roleId);
    throw new AppError(
      `This role is still assigned to ${count} user(s). Reassign them before deleting.`,
      { code: 'ROLE_IN_USE', status: 409 }
    );
  }

  const deleted = await roleRepo.deleteRole(roleId);

  await auditRepo.writeLog(actorId, 'DELETE_ROLE', 'ROLE', roleId, {
    roleName: role.role_name,
  });
  _invalidateRoleCache();

  return deleted;
};

// ---------------------------------------------------------------------------
// § Permission management
// ---------------------------------------------------------------------------

exports.assignPermissionToRole = async (roleId, permissionId, actorId = null) => {
  await _requireRole(roleId);
  await _requirePermission(permissionId);

  const result = await roleRepo.assignPermission(roleId, permissionId);

  await auditRepo.writeLog(actorId, 'ASSIGN_PERMISSION_TO_ROLE', 'ROLE', roleId, { permissionId });

  return result;
};

exports.assignMultiplePermissionsToRole = async (roleId, permissionIds = [], actorId = null) => {
  await _requireRole(roleId);
  await _requireAllPermissions(permissionIds);

  const result = await roleRepo.assignMultiplePermissions(roleId, permissionIds);

  await auditRepo.writeLog(actorId, 'ASSIGN_PERMISSIONS_TO_ROLE', 'ROLE', roleId, {
    permissionIds,
    newlyAssignedCount: result.length,
  });

  return result;
};

exports.removePermissionFromRole = async (roleId, permissionId, actorId = null) => {
  await _requireRole(roleId);
  await _requirePermission(permissionId);

  const result = await roleRepo.removePermission(roleId, permissionId);

  await auditRepo.writeLog(actorId, 'REMOVE_PERMISSION_FROM_ROLE', 'ROLE', roleId, { permissionId });

  // removePermission returns undefined if the pair wasn't there — normalise
  // to a plain object so the controller always gets a consistent shape.
  return result || { role_id: roleId, permission_id: permissionId, wasAssigned: false };
};

exports.removeAllPermissionsFromRole = async (roleId, actorId = null) => {
  await _requireRole(roleId);

  const removedIds = await roleRepo.removeAllPermissions(roleId);

  await auditRepo.writeLog(actorId, 'REMOVE_ALL_PERMISSIONS_FROM_ROLE', 'ROLE', roleId, {
    removedCount: removedIds.length,
    removedIds,
  });

  return removedIds;
};

// The only function in this service that explicitly controls a transaction,
// because replacePermissions() in the repo does two separate statements
// (delete, then insert) and we need them to succeed or fail together.
// Validation runs before the transaction begins so we don't hold a DB
// connection while doing network calls.
exports.replaceRolePermissions = async (roleId, permissionIds = [], actorId = null) => {
  const role = await _requireRole(roleId);
  const validatedIds = await _requireAllPermissions(permissionIds);

  const previousIds = await roleRepo.getPermissionIds(roleId);

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await roleRepo.replacePermissions(roleId, validatedIds, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await auditRepo.writeLog(actorId, 'REPLACE_ROLE_PERMISSIONS', 'ROLE', roleId, {
    roleName: role.role_name,
    previousPermissionCount: previousIds.length,
    newPermissionCount: validatedIds.length,
    added: validatedIds.filter(id => !previousIds.includes(id)),
    removed: previousIds.filter(id => !validatedIds.includes(id)),
  });

  return roleRepo.getRolePermissions(roleId);
};

exports.getRolePermissions = async (roleId) => {
  await _requireRole(roleId);
  return roleRepo.getRolePermissions(roleId);
};

exports.copyRolePermissions = async (sourceRoleId, targetRoleId, actorId = null) => {
  await _requireRole(sourceRoleId);
  await _requireRole(targetRoleId);

  // copyRolePermissions is a single INSERT...SELECT and is atomic on its own.
  const copiedIds = await roleRepo.copyRolePermissions(sourceRoleId, targetRoleId);

  await auditRepo.writeLog(actorId, 'COPY_ROLE_PERMISSIONS', 'ROLE', sourceRoleId, {
    targetRoleId,
    copiedCount: copiedIds.length,
  });

  return copiedIds;
};

// ---------------------------------------------------------------------------
// § Statistics & helpers
// ---------------------------------------------------------------------------

// Composed from two repository primitives rather than being a repo function,
// because "can this role be deleted" is a business decision, not a query.
exports.canDeleteRole = async (roleId) => {
  const [isSystem, inUse] = await Promise.all([
    roleRepo.isSystemRole(roleId),
    roleRepo.roleInUse(roleId),
  ]);
  return { canDelete: !isSystem && !inUse, isSystem, inUse };
};

exports.getUsersByRole = async (roleId) => {
  await _requireRole(roleId);
  return roleRepo.getUsersByRole(roleId);
};

exports.getRoleStatistics = () => roleRepo.getRoleStatistics();

exports.getRolesDropdown = () => roleRepo.getRolesDropdown();

exports.getRoleSummary = async (roleId) => {
  const summary = await roleRepo.getRoleSummary(roleId);
  if (!summary) throw new AppError('Role not found.', { code: 'ROLE_NOT_FOUND', status: 404 });
  return summary;
};

exports.hasPermission = (roleId, permissionId) => roleRepo.hasPermission(roleId, permissionId);
