/**
 * permission.controller.js  (thin)
 *
 * HTTP mapping only — Request -> Validation -> Service -> Response. All
 * business rules (duplicate-name checks, name normalisation, the
 * cascade-delete audit trail) live in permission.service.js.
 *
 * Routes:
 *   GET     /permissions
 *   GET     /permissions/:id
 *   POST    /permissions
 *   PUT     /permissions/:id
 *   DELETE  /permissions/:id
 *   GET     /permissions/:id/roles          -> which roles currently have it
 *   GET     /permissions/:id/can-delete     -> confirmation-UX hook before delete
 */

const permissionService = require('../services/permission.service');

function handleError(res, err) {
  console.error('[permission.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

function actorId(req) {
  return req.user && req.user.sub;
}

// ---------------------------------------------------------------------------
// GET /permissions
// Query: ?q=&page=&limit=
// ---------------------------------------------------------------------------

exports.getAllPermissions = async (req, res) => {
  try {
    const { q, page, limit } = req.query;
    const filters = { q, page, limit };
    const [permissions, total] = await Promise.all([
      permissionService.getAllPermissions(filters),
      permissionService.countPermissions(filters),
    ]);
    return res.status(200).json({
      permissions,
      pagination: { page: Number(page) || 1, limit: Number(limit) || 25, total },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /permissions/:id
// ---------------------------------------------------------------------------

exports.getPermissionById = async (req, res) => {
  try {
    const permission = await permissionService.getPermissionById(req.params.id);
    return res.status(200).json({ permission });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// POST /permissions
// Body: { permissionName, description? }
// ---------------------------------------------------------------------------

exports.createPermission = async (req, res) => {
  try {
    const permission = await permissionService.createPermission(req.body, actorId(req));
    return res.status(201).json({ permission });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// PUT /permissions/:id
// Body: any of { permissionName, description }
// ---------------------------------------------------------------------------

exports.updatePermission = async (req, res) => {
  try {
    const permission = await permissionService.updatePermission(req.params.id, req.body, actorId(req));
    return res.status(200).json({ permission });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /permissions/:id
//
// Never blocked by in-use (cascade is intentional — see
// permission.service.js's § Deletion). Response includes affectedRoles so
// the client can show what just lost this permission.
// ---------------------------------------------------------------------------

exports.deletePermission = async (req, res) => {
  try {
    const result = await permissionService.deletePermission(req.params.id, actorId(req));
    return res.status(200).json({ message: 'Permission deleted.', affectedRoles: result.affectedRoles });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /permissions/:id/roles
// ---------------------------------------------------------------------------

exports.getRolesUsingPermission = async (req, res) => {
  try {
    const roles = await permissionService.getRolesUsingPermission(req.params.id);
    return res.status(200).json({ roles });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /permissions/:id/can-delete
//
// Drives a confirmation step in the UI before calling deletePermission():
// "This will remove X from N roles. Confirm?"
// ---------------------------------------------------------------------------

exports.canDeletePermission = async (req, res) => {
  try {
    const result = await permissionService.canDeletePermission(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};
