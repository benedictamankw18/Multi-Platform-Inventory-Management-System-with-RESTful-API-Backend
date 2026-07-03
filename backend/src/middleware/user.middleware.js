/**
 * user.middleware.js
 *
 * Owner-or-role guard. Allows a request through if EITHER:
 *   (a) the authenticated user IS the resource owner — their sub matches
 *       the userId from the route param, OR
 *   (b) they hold one of the listed allowed roles.
 *
 * This sits after auth.middleware.js so req.user is guaranteed to exist.
 *
 * Usage:
 *   const ownOrAdmin = require('../middleware/user.middleware');
 *
 *   // Only the user themselves, or an Administrator / Business Owner, can
 *   // read their own profile:
 *   router.get('/:userId', authenticate, ownOrAdmin('Administrator', 'Business Owner'), controller.getUserById);
 *
 *   // Any authenticated user can read their own profile, nobody else can:
 *   router.get('/:userId/profile', authenticate, ownOrAdmin(), controller.getProfile);
 *
 * Param resolution: userId is read from req.params.userId first, then
 * req.params.id as a fallback, covering both /users/:userId and generic
 * /:id route shapes.
 *
 * Why this lives in its own file and isn't just merged into role.middleware:
 * role.middleware.js is a pure role check with no concept of ownership.
 * Mixing the two would force every role-only route to also think about
 * param names. Keeping them separate means each middleware stays testable
 * and composable independently.
 */

module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const resourceOwnerId = req.params.userId || req.params.id || null;

    // Path (a): the caller IS the resource owner.
    if (resourceOwnerId && String(req.user.sub) === String(resourceOwnerId)) {
      return next();
    }

    // Path (b): the caller holds a permitted role.
    if (allowedRoles.length > 0 && allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      message: 'You do not have permission to perform this action.',
    });
  };
};
