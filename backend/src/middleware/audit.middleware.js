const { writeAuditLog } = require("../utils/auditLog");
const auditRepo = require('../repositories/audit.repository');

/**
 * Audit Middleware
 *
 * Usage:
 * router.post(
 *   "/",
 *   authenticate,
 *   audit("CREATE_PRODUCT"),
 *   productController.createProduct
 * );
 */

module.exports = (action) => {
    return async (req, res, next) => {
        const originalJson = res.json;

        res.json = async function (body) {
            try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    await writeAuditLog(
                        req.user?.sub || null,
                        action,
                        {
                            method: req.method,
                            endpoint: req.originalUrl,
                            ip: req.ip,
                            userAgent: req.get("User-Agent"),
                            body: req.body,
                            params: req.params,
                            query: req.query
                        }
                    );
                }
            } catch (err) {
                console.error("Audit Log Error:", err);
            }

            return originalJson.call(this, body);
        };

        next();
    };
};


/**
 * audit.middleware.js
 *
 * Route-level audit middleware. Intercepts res.json() and writes an audit
 * log entry whenever a route responds with a 2xx status — useful for routes
 * whose flat controller has no service-level audit logging yet (e.g. branch,
 * product, category until they get split into repo/service layers).
 *
 * Service-level logging (role, user, permission, auth) remains the primary
 * mechanism; this middleware is supplementary — it adds HTTP metadata (IP,
 * User-Agent, method, URL) that the service layer doesn't capture.
 *
 * Usage:
 *   const audit = require('../middleware/audit.middleware');
 *
 *   router.post('/', authenticate, audit('CREATE_PRODUCT'), controller.create);
 *
 * Fix vs. uploaded version:
 *   - Required '../utils/auditLog' which was a 0-byte empty file.
 *   - Made res.json async — Express doesn't support async res.json; the
 *     response would hang until the audit write resolved.
 *   - No restoration of the original res.json before calling it, causing
 *     infinite recursion on any controller that called res.json() twice.
 *
 * This version:
 *   - Uses audit.repository.js's writeLogFull() directly.
 *   - Keeps res.json synchronous; the audit write is fire-and-forget via
 *     setImmediate so the HTTP response is never delayed by the DB write.
 *   - Restores the original res.json before calling it to prevent recursion.
 */

module.exports = (action) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function auditedJson(body) {
      // Restore immediately — prevents infinite recursion if the controller
      // or any downstream middleware calls res.json() again.
      res.json = originalJson;

      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Fire-and-forget: let the response go out first, then write the log.
        // setImmediate pushes the DB write to the next iteration of the event
        // loop so it never delays the HTTP response reaching the client.
        setImmediate(() => {
          auditRepo.writeLogFull({
            userId:     req.user?.sub  || null,
            action,
            entityType: 'HTTP',
            entityId:   null,
            details: {
              method:    req.method,
              endpoint:  req.originalUrl,
              params:    req.params,
              query:     req.query,
              userAgent: req.get('User-Agent') || null,
            },
            ipAddress: req.ip || null,
          }).catch(err => {
            // Audit failures must never surface to callers.
            console.error('[audit.middleware] writeLogFull failed:', err.message);
          });
        });
      }

      return originalJson(body);
    };

    next();
  };
};
