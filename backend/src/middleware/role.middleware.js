/**
 * role.middleware.js   (FR-003: role-based access control)
 *
 * Restricts a route to one or more roles, checked against req.user.role —
 * the role NAME carried in the JWT payload (see auth.service.js's
 * signAccessToken), not a database lookup. Must run after auth.middleware.js
 * so req.user exists.
 *
 * Usage:
 *   router.post('/', authenticate, authorize('Administrator'), controller.create);
 *   router.get('/', authenticate, authorize('Administrator', 'Business Owner'), controller.list);
 */

module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    return next();
  };
};
