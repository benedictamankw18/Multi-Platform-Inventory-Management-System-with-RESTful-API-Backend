/**
 * app.js
 *
 * Express application setup.
 *
 * Middleware registration ORDER matters — this file follows the rule:
 *   1. Security + parsing (helmet, cors, body parsers)
 *   2. Request logging
 *   3. Rate limiting
 *   4. Routes              <-- must come BEFORE 404/error handlers
 *   5. 404 catch-all
 *   6. Global error handler (must be last, has 4 params)
 *
 * Fixes vs. the uploaded app.js:
 *   - notFound and errorHandler were registered on lines 22–25, BEFORE
 *     any routes — every request hit the 404 handler immediately.
 *   - authRoutes and userRoutes were used but never imported.
 *   - permissionRoutes was never mounted.
 *   - loginLimiter was destructured from a wrong path ("../middleware/...")
 *     AND from a file with the export-loss bug; see rateLimiter.middleware.js.
 *   - const express was declared twice (hard SyntaxError).
 *   - A stray router.post + router.use block from auth.routes.js was pasted
 *     into this file.
 *   - module.exports was set twice (router then app), so only app exported.
 *   - Health check and Swagger were registered after the 404 handler
 *     (unreachable).
 */
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const swaggerUI  = require('swagger-ui-express');

const swaggerSpec   = require('./config/swagger');
const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const roleRoutes    = require('./routes/role.routes');
const permissionRoutes = require('./routes/permission.routes');
const auditRoutes = require('./routes/audit.routes');

const logger        = require('./middleware/logger.middleware');
const rateLimiter   = require('./middleware/rateLimiter.middleware');
const notFound      = require('./middleware/notFound.middleware');
const errorHandler  = require('./middleware/error.middleware');

const app = express();

// ---------------------------------------------------------------------------
// 1. Security headers + CORS
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cors());

// ---------------------------------------------------------------------------
// 2. Body parsers
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------------------------------
// 3. Request logging
// ---------------------------------------------------------------------------
app.use(logger);         // file-based combined log (logger.middleware.js)
app.use(morgan('dev'));  // console output during development

// ---------------------------------------------------------------------------
// 4. General rate limiting (login-specific limiting is applied inside auth.routes.js)
// ---------------------------------------------------------------------------
app.use(rateLimiter);

// ---------------------------------------------------------------------------
// 5. Health check + API docs  — registered BEFORE routes so they're reachable
// ---------------------------------------------------------------------------
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Inventory Management API is running.' });
});

app.use('/api/v1/docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// ---------------------------------------------------------------------------
// 6. Routes
// ---------------------------------------------------------------------------
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/users',       userRoutes);
app.use('/api/v1/roles',       roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/v1/audit', auditRoutes);

// ---------------------------------------------------------------------------
// 7. 404 catch-all — must come AFTER all routes
// ---------------------------------------------------------------------------
app.use(notFound);

// ---------------------------------------------------------------------------
// 8. Global error handler — must be last, Express identifies it by 4 params
// ---------------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
