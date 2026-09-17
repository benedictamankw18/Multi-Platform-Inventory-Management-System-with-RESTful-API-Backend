/**
 * Owner Middleware
 *
 * Allows access if:
 * 1. The authenticated user owns the resource.
 * 2. The authenticated user has one of the allowed roles.
 *
 * Example:
 * router.put(
 *   "/:userId",
 *   authenticate,
 *   owner("Administrator"),
 *   userController.updateUser
 * );
 */

module.exports = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required."
                });
            }

            const resourceOwnerId =
                req.params.userId ||
                req.params.id ||
                req.body.userId;

            // User owns the resource
            if (
                resourceOwnerId &&
                String(req.user.sub) === String(resourceOwnerId)
            ) {
                return next();
            }

            // User has an allowed role
            if (
                allowedRoles.length &&
                allowedRoles.includes(req.user.role)
            ) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action."
            });

        } catch (error) {
            console.error("Owner middleware error:", error);

            return res.status(500).json({
                success: false,
                message: "Authorization failed."
            });
        }
    };
};