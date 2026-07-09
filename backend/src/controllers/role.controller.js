/**
 * role.controller.js  (thin)
 *
 * HTTP mapping only — Request -> Validation -> Service -> Response. All
 * business rules (duplicate-name checks, system-role protection,
 * canDeleteRole composition, the replacePermissions transaction, audit
 * logging) live in role.service.js.
 *
 * Routes (from the original plan):
 *   GET     /roles
 *   GET     /roles/:id
 *   POST    /roles
 *   PUT     /roles/:id
 *   DELETE  /roles/:id
 *   GET     /roles/:id/permissions
 *   PUT     /roles/:id/permissions
 *   POST    /roles/:id/permissions
 *   DELETE  /roles/:id/permissions/:permissionId
 *   GET     /roles/:id/users
 *   GET     /roles/dropdown
 *
 * A couple of routes beyond the original list are included because the
 * service already supports them and a real admin UI needs them:
 *   GET   /roles/statistics            -> roleService.getRoleStatistics()
 *   GET   /roles/:id/summary           -> roleService.getRoleSummary()
 *   GET   /roles/:id/can-delete        -> roleService.canDeleteRole()
 *   POST  /roles/:id/permissions/copy-from/:sourceId -> roleService.copyRolePermissions()
 * Omit these route registrations in role.routes.js if you don't need them
 * yet — the handlers cost nothing sitting unused here.
 */

const roleService = require('../services/role.service');

function handleError(res, err) {
  console.error('[role.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

function actorId(req) {
  return req.user && req.user.sub;
}

// ---------------------------------------------------------------------------
// GET /roles
// Query: ?q=&isSystem=true|false&page=&limit=
// ---------------------------------------------------------------------------

exports.getAllRoles = async (req, res) => {
  try {
    const { q, isSystem, page, limit } = req.query;
    const filters = {
      q,
      isSystem: isSystem !== undefined ? isSystem === 'true' : undefined,
      page,
      limit,
    };
    const [roles, total] = await Promise.all([
      roleService.getAllRoles(filters),
      roleService.countRoles(filters),
    ]);
    return res.status(200).json({
      roles,
      pagination: { page: Number(page) || 1, limit: Number(limit) || 25, total },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /roles/dropdown
//
// Registered BEFORE /roles/:id in role.routes.js so the literal path
// "dropdown" isn't swallowed by the :id param.
// ---------------------------------------------------------------------------

exports.getRolesDropdown = async (req, res) => {
  try {
    const dropdown = await roleService.getRolesDropdown();
    return res.status(200).json({ roles: dropdown });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /roles/statistics
// ---------------------------------------------------------------------------

exports.getRoleStatistics = async (req, res) => {
  try {
    const stats = await roleService.getRoleStatistics();
    return res.status(200).json({ statistics: stats });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /roles/:id
// ---------------------------------------------------------------------------

exports.getRoleById = async (req, res) => {
  try {
    console.log(req.params.id);
    const role = await roleService.getRoleById(req.params.id);
    return res.status(200).json({ role });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /roles/:id/summary
// ---------------------------------------------------------------------------

exports.getRoleSummary = async (req, res) => {
  try {
    const summary = await roleService.getRoleSummary(req.params.id);
    return res.status(200).json({ summary });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /roles/:id/can-delete
// ---------------------------------------------------------------------------

exports.canDeleteRole = async (req, res) => {
  try {
    const result = await roleService.canDeleteRole(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /roles
// Body: { roleName, description? }
// ---------------------------------------------------------------------------

exports.createRole = async (req, res) => {
  try {
    const role = await roleService.createRole(req.body, actorId(req));
    return res.status(201).json({ role });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// PUT /roles/:id
// Body: any of { roleName, description }
// ---------------------------------------------------------------------------

exports.updateRole = async (req, res) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.body, actorId(req));
    return res.status(200).json({ role });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /roles/:id
// ---------------------------------------------------------------------------

exports.deleteRole = async (req, res) => {
  try {
    await roleService.deleteRole(req.params.id, actorId(req));
    return res.status(200).json({ message: 'Role deleted.' });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /roles/:id/permissions
// ---------------------------------------------------------------------------

exports.getRolePermissions = async (req, res) => {
  try {
    const permissions = await roleService.getRolePermissions(req.params.id);
    return res.status(200).json({ permissions });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// PUT /roles/:id/permissions
// Body: { permissionIds: [] }
//
// Full replace, via roleService.replaceRolePermissions()'s transaction.
// ---------------------------------------------------------------------------

exports.replaceRolePermissions = async (req, res) => {
  try {
    const permissions = await roleService.replaceRolePermissions(
      req.params.id,
      req.body.permissionIds || req.body.permissions || [],
      actorId(req)
    );
    return res.status(200).json({ permissions });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /roles/:id/permissions
// Body: { permissionId } for a single assignment, OR { permissionIds: [] }
// for a bulk assignment — both share this route per the original plan.
// ---------------------------------------------------------------------------

exports.assignPermissionToRole = async (req, res) => {
  try {
    const permissionIds = req.body.permissionIds || req.body.permissions;
    const permissionId = req.body.permissionId || req.body.permission;

    if (Array.isArray(permissionIds)) {
      const result = await roleService.assignMultiplePermissionsToRole(
        req.params.id,
        permissionIds,
        actorId(req)
      );
      return res.status(200).json({ assigned: result });
    }
    const result = await roleService.assignPermissionToRole(req.params.id, permissionId, actorId(req));
    return res.status(200).json({ assigned: result });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /roles/:id/permissions/:permissionId
// ---------------------------------------------------------------------------

exports.removePermissionFromRole = async (req, res) => {
  try {
    const result = await roleService.removePermissionFromRole(
      req.params.id,
      req.params.permissionId,
      actorId(req)
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /roles/:id/permissions/copy-from/:sourceId
// ---------------------------------------------------------------------------

exports.copyRolePermissions = async (req, res) => {
  try {
    const copiedIds = await roleService.copyRolePermissions(req.params.sourceId, req.params.id, actorId(req));
    return res.status(200).json({ copiedPermissionIds: copiedIds });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /roles/:id/users
// ---------------------------------------------------------------------------

exports.getUsersByRole = async (req, res) => {
  try {
    const users = await roleService.getUsersByRole(req.params.id);
    return res.status(200).json({ users });
  } catch (err) {
    return handleError(res, err);
  }
};
