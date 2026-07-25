/**
 * user.controller.js  (thin)
 *
 * HTTP mapping only — Request -> Validation -> Service -> Response. All
 * password hashing, role/branch checks, self-protection rules, session
 * revocation, and audit logging live in user.service.js.
 *
 * Routes:
 *   POST   /api/users                  (FR-004)
 *   GET    /api/users                  (FR-004)
 *   GET    /api/users/:userId          (FR-004)
 *   PATCH  /api/users/:userId          (FR-004)
 *   PATCH  /api/users/:userId/role     (FR-003)
 *   PATCH  /api/users/:userId/deactivate    (FR-004)
 *   PATCH  /api/users/:userId/reactivate    (FR-004, symmetric action)
 *
 * These routes are intended to sit behind auth + role-checking middleware so
 * that only an Administrator / Business Owner can reach them, e.g.:
 *   router.post('/users', authenticate, authorize('Administrator', 'Business Owner'), userController.createUser);
 */

const userService = require('../services/user.service');
const authService = require('../services/auth.service');
const userBranchRepo = require('../repositories/userBranch.repository');

function handleError(res, err) {
  console.error('[user.controller]', err);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

function actorId(req) {
  return req.user && req.user.sub;
}

function userId(req) {
  return req.params.id || req.params.userId;
}

// ---------------------------------------------------------------------------
// POST /api/users                                                  (FR-004)
// Body: { fullName, username, email, password, roleId, branchId? }
// ---------------------------------------------------------------------------

exports.createUser = async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body, actorId(req));
    return res.status(201).json({ user: newUser });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/users                            (supports FR-004: browse/search)
// Query: ?branchId=&roleId=&isActive=true|false&page=1&limit=25
// ---------------------------------------------------------------------------

exports.listUsers = async (req, res) => {
  try {
    const { q, branch_id, branchId, role_id, roleId, is_active, isActive, page, limit } = req.query;
    const result = await userService.listUsers({
      q,
      branch_id,
      branchId,
      role_id,
      roleId,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/users/:userId
// ---------------------------------------------------------------------------

exports.getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(userId(req));
    return res.status(200).json({ user });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/users/:userId                                         (FR-004)
// Body: any of { fullName, email, branchId }
// ---------------------------------------------------------------------------

exports.updateUser = async (req, res) => {
  try {
    const updated = await userService.updateUser(userId(req), req.body, actorId(req));
    return res.status(200).json({ user: updated });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/users/:userId/role                                    (FR-003)
// Body: { roleId }
// ---------------------------------------------------------------------------

exports.assignRole = async (req, res) => {
  try {
    const updated = await userService.assignRole(userId(req), req.body.role_id || req.body.roleId, actorId(req));
    return res.status(200).json({ user: updated });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/users/:userId/deactivate                              (FR-004)
// ---------------------------------------------------------------------------

exports.deactivateUser = async (req, res) => {
  try {
    const result = await userService.deactivateUser(userId(req), actorId(req));
    if (result.alreadyInState) {
      return res.status(200).json({ message: 'User is already deactivated.', user: result.user });
    }
    return res.status(200).json({ user: result.user });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/users/:userId/reactivate                  (FR-004, symmetric action)
// ---------------------------------------------------------------------------

exports.reactivateUser = async (req, res) => {
  try {
    const result = await userService.reactivateUser(userId(req), actorId(req));
    if (result.alreadyInState) {
      return res.status(200).json({ message: 'User is already active.', user: result.user });
    }
    return res.status(200).json({ user: result.user });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/v1/users/:id
// ---------------------------------------------------------------------------

exports.deleteUser = async (req, res) => {
  try {
    const deleted = await userService.deleteUser(userId(req), actorId(req));
    return res.status(200).json({ user: deleted });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/users/:userId/sessions
// Admins can inspect sessions for a given user
// ---------------------------------------------------------------------------
exports.listUserSessions = async (req, res) => {
  try {
    const id = userId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const sessions = await authService.listSessionsForUser(id, { limit, offset });
    return res.status(200).json({ sessions });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/users/:userId/branches
// List branches assigned to a user
// ---------------------------------------------------------------------------
exports.listUserBranches = async (req, res) => {
  try {
    const id = userId(req);
    const branches = await userBranchRepo.listBranchesForUser(id);
    return res.status(200).json({ branches });
  } catch (err) {
    return handleError(res, err);
  }
};
