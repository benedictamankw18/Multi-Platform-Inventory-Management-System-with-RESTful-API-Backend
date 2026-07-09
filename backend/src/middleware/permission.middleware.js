/**
 * permission.middleware.js
 *
 * Fine-grained permission guard. Checks whether the authenticated user's
 * role holds ALL of the named permissions before allowing the request
 * through. Sits after auth.middleware.js so req.user is guaranteed.
 *
 * Usage:
 *   const checkPermission = require('../middleware/permission.middleware');
 *
 *   // Single permission required:
 *   router.get('/', authenticate, checkPermission('VIEW_REPORTS'), controller.list);
 *
 *   // Multiple permissions ALL required:
 *   router.post('/', authenticate, checkPermission('CREATE_PRODUCT', 'MANAGE_USERS'), controller.create);
 *
 * Permission names must match the permission_name values stored in the
 * `permissions` table exactly (stored uppercase by permission.service.js,
 * e.g. 'VIEW_REPORTS', 'CREATE_PRODUCT').
 *
 * Administrator bypass: the 'Business Owner' and 'Administrator' roles
 * bypass the DB check entirely and are always allowed through, since those
 * roles are expected to have unrestricted access. Remove the bypass or
 * tighten the role list if your business rules require even Administrators
 * to be explicitly granted permissions.
 *
 * Performance note: this hits the database on every request it guards. If
 * latency is critical, consider caching the permission set per roleId in
 * Redis (invalidated by permission.service.js's _invalidatePermissionCache
 * stub) rather than fetching it fresh each time.
 *
 * Fix vs. uploaded version: the uploaded permission.middleware.js queried
 * `p.id` and `p.permission_key` — neither column exists in this schema.
 * The correct columns are `permission_id` and `permission_name`. The
 * Administrator bypass also checked `req.user.role === "Administrator"`
 * (singular string) instead of handling both admin roles.
 */

const db = require('../config/db');
const cache = require('../utils/cache.utils');

const BYPASS_ROLES = ['Business Owner', 'Administrator'];
const ROLE_PERMISSIONS_KEY = (roleId) => `role-permissions:${roleId}`;

module.exports = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // Bypass for high-privilege roles — no DB hit needed.
    if (BYPASS_ROLES.includes(req.user.role)) {
      return next();
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return next();
    }

    try {
      const cacheKey = ROLE_PERMISSIONS_KEY(req.user.roleId);
      const cached = await cache.get(cacheKey);
      let permissionNames = cached;

      if (!permissionNames) {
        const { rows } = await db.query(
          `SELECT p.permission_name
           FROM role_permissions rp
           JOIN permissions p ON p.permission_id = rp.permission_id
           WHERE rp.role_id = $1`,
          [req.user.roleId]
        );

        permissionNames = rows.map(r => r.permission_name);
        await cache.set(cacheKey, permissionNames, 300);
      }

      const grantedPermissions = new Set(permissionNames);
      const allGranted = requiredPermissions.every(p => grantedPermissions.has(p));

      if (!allGranted) {
        return res.status(403).json({ message: 'Permission denied.' });
      }

      return next();
    } catch (err) {
      console.error('[permission.middleware]', err);
      return res.status(500).json({ message: 'Permission check failed.' });
    }
  };
};
