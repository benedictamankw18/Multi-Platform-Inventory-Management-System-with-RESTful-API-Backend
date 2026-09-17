/**
 * permission.service.js
 *
 * Business logic for permissions. Sits between permission.repository.js
 * (pure SQL) and the thin permission.controller.js (HTTP mapping only).
 *
 * Responsibilities:
 *   - Existence checks  ("does this permission actually exist?")
 *   - Duplicate-name checks on create and rename
 *   - Validation (empty name, etc.)
 *   - Audit logging via audit.repository.js
 *   - Cache invalidation stub (§ Cache below)
 *
 * What is NOT here:
 *   - HTTP status codes / res.json() — controller's job
 *   - Raw SQL / pool calls  — repository's job
 *
 * § Deletion vs. role deletion
 * deletePermission() does NOT block when the permission is assigned to
 * roles. This is intentional and differs from deleteRole()'s ROLE_IN_USE
 * guard. The schema's ON DELETE CASCADE on role_permissions.permission_id
 * is the designed behaviour for permissions: removing a permission
 * definition removes it from every role that held it — equivalent to
 * "this feature no longer exists in the system". The service captures
 * which roles will lose the permission BEFORE deleting so the audit log
 * contains a full record of what changed, but it does not block the
 * operation. If you want a "are you sure? N roles will lose this" UX
 * confirmation step, call canDeletePermission() from the controller and
 * present the returned rolesAffected to the user before calling
 * deletePermission().
 *
 * § Cache
 * Permission lists are good candidates for caching (they change rarely and
 * are read on every permission check). _invalidatePermissionCache() is a
 * no-op stub; replace its body with your cache client's flush/del call
 * when you add caching.
 *
 * § Error contract
 * All exported functions throw AppError on business-rule violations so
 * the controller only needs:
 *   try { ... }
 *   catch (err) { res.status(err.status || 500).json({ message: err.message }); }
 */

const permRepo  = require('../repositories/permission.repository');
const auditRepo = require('../repositories/audit.repository');
const AppError  = require('../utils/AppError');
const cache     = require('../utils/cache.utils');

const PERMISSIONS_ALL_KEY = 'permissions:all';
const PERMISSIONS_DROPDOWN_KEY = 'permissions:dropdown';

// ---------------------------------------------------------------------------
// Cache invalidation helper (§ Cache above)
// ---------------------------------------------------------------------------

async function _invalidatePermissionCache() {
  await Promise.all([
    cache.del(PERMISSIONS_ALL_KEY),
    cache.del(PERMISSIONS_DROPDOWN_KEY),
    cache.delByPattern('role-permissions:*'),
  ]);
}

function normalizePermissionCode(value) {
  return value && value.trim().toUpperCase();
}

function toApiPermission(permission) {
  if (!permission) return permission;
  return {
    ...permission,
    name: permission.name || permission.permission_name,
    code: permission.code || permission.permission_name,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _requirePermission(permissionId) {
  const perm = await permRepo.getPermissionById(permissionId);
  if (!perm) {
    throw new AppError('Permission not found.', { code: 'PERMISSION_NOT_FOUND', status: 404 });
  }
  return perm;
}

// ---------------------------------------------------------------------------
// § CRUD
// ---------------------------------------------------------------------------

exports.createPermission = async ({ name, code, permissionName, description = null } = {}, actorId = null) => {
  permissionName = permissionName || code || name;

  if (!permissionName || !permissionName.trim()) {
    throw new AppError('name and code are required.', { code: 'VALIDATION_ERROR', status: 400 });
  }

  const trimmed = normalizePermissionCode(permissionName);

  const existing = await permRepo.getPermissionByName(trimmed);
  if (existing) {
    throw new AppError(
      `A permission with code "${trimmed}" already exists.`,
      { code: 'DUPLICATE_PERMISSION_NAME', status: 409 }
    );
  }

  const permission = await permRepo.createPermission({ permissionName: trimmed, description });

  await auditRepo.writeLog(actorId, 'CREATE_PERMISSION', 'PERMISSION', permission.permission_id, {
    permissionName: trimmed,
  });
  await _invalidatePermissionCache();

  return toApiPermission(permission);
};

exports.getPermissionById = async (permissionId) => {
  return toApiPermission(await _requirePermission(permissionId));
};

exports.getPermissionByName = async (permissionName) => {
  const perm = await permRepo.getPermissionByName(permissionName);
  if (!perm) {
    throw new AppError('Permission not found.', { code: 'PERMISSION_NOT_FOUND', status: 404 });
  }
  return toApiPermission(perm);
};

// Thin delegation — no business rules on reads.
exports.getAllPermissions = async (filters) => {
  if (!filters || Object.keys(filters).length === 0) {
    const cacheKey = PERMISSIONS_ALL_KEY;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const permissions = (await permRepo.getAllPermissions(filters)).map(toApiPermission);
    await cache.set(cacheKey, permissions);
    return permissions;
  }

  return (await permRepo.getAllPermissions(filters)).map(toApiPermission);
};
exports.searchPermissions   = async (q)       => (await permRepo.searchPermissions(q)).map(toApiPermission);
exports.paginatePermissions = async (opts)    => (await permRepo.paginatePermissions(opts)).map(toApiPermission);
exports.countPermissions    = (filters) => permRepo.countPermissions(filters);

exports.updatePermission = async (permissionId, { name, code, permissionName, description } = {}, actorId = null) => {
  const existing = await _requirePermission(permissionId);
  permissionName = permissionName || code || name;

  if (permissionName !== undefined) {
    if (!permissionName.trim()) {
      throw new AppError('code cannot be blank.', { code: 'VALIDATION_ERROR', status: 400 });
    }

    const trimmed = normalizePermissionCode(permissionName);

    if (trimmed !== existing.permission_name) {
      const conflict = await permRepo.getPermissionByName(trimmed);
      if (conflict) {
        throw new AppError(
          `A permission with code "${trimmed}" already exists.`,
          { code: 'DUPLICATE_PERMISSION_NAME', status: 409 }
        );
      }
      permissionName = trimmed;
    } else {
      // Same name after normalisation — no rename needed, skip the update
      // for this field to avoid a pointless write.
      permissionName = undefined;
    }
  }

  if (permissionName === undefined && description === undefined) {
    return toApiPermission(existing);
  }

  const updated = await permRepo.updatePermission(permissionId, { permissionName, description });

  await auditRepo.writeLog(actorId, 'UPDATE_PERMISSION', 'PERMISSION', permissionId, {
    previousName: existing.permission_name,
    permissionName,
    description,
  });
  await _invalidatePermissionCache();

  return toApiPermission(updated);
};

// See § Deletion above. Never blocks on in-use — cascade is intentional.
exports.deletePermission = async (permissionId, actorId = null) => {
  const existing = await _requirePermission(permissionId);

  // Capture which roles will lose this permission BEFORE the delete so the
  // audit entry is complete. After deletePermission() executes, those
  // role_permissions rows will no longer exist (ON DELETE CASCADE).
  const affectedRoles = await permRepo.getRolesUsingPermission(permissionId);

  const deleted = await permRepo.deletePermission(permissionId);

  await auditRepo.writeLog(actorId, 'DELETE_PERMISSION', 'PERMISSION', permissionId, {
    permissionName: existing.permission_name,
    affectedRoleCount: affectedRoles.length,
    affectedRoles: affectedRoles.map(r => ({ role_id: r.role_id, role_name: r.role_name })),
  });
  await _invalidatePermissionCache();

  return { ...deleted, affectedRoles };
};

// ---------------------------------------------------------------------------
// § Helpers
// ---------------------------------------------------------------------------

exports.getRolesUsingPermission = async (permissionId) => {
  await _requirePermission(permissionId);
  return permRepo.getRolesUsingPermission(permissionId);
};

exports.permissionInUse = async (permissionId) => {
  await _requirePermission(permissionId);
  const roles = await permRepo.getRolesUsingPermission(permissionId);
  return roles.length > 0;
};

// Returns { canDelete: true, rolesAffected } — permissions can always be
// deleted (no system-permission concept), but rolesAffected lets the
// controller drive a confirmation UX if desired.
exports.canDeletePermission = async (permissionId) => {
  await _requirePermission(permissionId);
  const rolesAffected = await permRepo.getRolesUsingPermission(permissionId);
  return { canDelete: true, rolesAffected };
};
