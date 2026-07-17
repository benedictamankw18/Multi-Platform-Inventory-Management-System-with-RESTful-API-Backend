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
const cookieParser = require('cookie-parser');

const swaggerSpec   = require('./config/swagger');
const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const roleRoutes    = require('./routes/role.routes');
const permissionRoutes = require('./routes/permission.routes');
const productRoutes = require('./routes/product.routes');
const productImageRoutes = require('./routes/productImage.routes');
const categoryRoutes = require('./routes/category.routes');
const uomRoutes = require('./routes/uom.routes');
const supplierRoutes = require('./routes/supplier.routes');
const supplierPaymentRoutes = require('./routes/supplierPayment.routes');
const customerRoutes = require('./routes/customer.routes');
const customerPaymentRoutes = require('./routes/customerPayment.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const inventoryTransferRoutes = require('./routes/inventoryTransfer.routes');
const inventoryTransactionRoutes = require('./routes/inventoryTransaction.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const salesRoutes = require('./routes/sales.routes');
const notificationRoutes = require('./routes/notification.routes');
const reportRoutes = require('./routes/report.routes');
const priceHistoryRoutes = require('./routes/priceHistory.routes');
const syncRoutes = require('./routes/sync.routes');
const branchRoutes = require('./routes/branch.routes');
const businessRoutes = require('./routes/business.routes');
const expenseCategoryRoutes = require('./routes/expenseCategory.routes');
const expenseRoutes = require('./routes/expense.routes');
const systemRoutes = require('./routes/system.routes');
const auditRoutes = require('./routes/audit.routes');
const userBranchRoutes = require('./routes/userBranch.routes');
const sessionsRoutes = require('./routes/sessions.routes');
const productBranchInventoryRoutes = require('./routes/productBranchInventory.routes');
const adminQueueRoutes = require('./routes/adminQueue.routes');
const adminSmsRoutes = require('./routes/adminSms.routes');

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
app.use('/uploads', express.static('uploads'));

// parse cookies (needed for refresh-token cookie handling)
app.use(cookieParser());

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
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/product-images', productImageRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/units-of-measure', uomRoutes);
app.use('/api/v1/uoms', uomRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/supplier-payments', supplierPaymentRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/customer-payments', customerPaymentRoutes);
app.use('/api/v1/inventories', inventoryRoutes);
app.use('/api/v1/inventory-transfers', inventoryTransferRoutes);
app.use('/api/v1/inventory/transactions', inventoryTransactionRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/price-history', priceHistoryRoutes);
app.use('/api/v1/business', businessRoutes);
app.use('/api/v1/business-settings', businessRoutes);
app.use('/api/v1/expense-categories', expenseCategoryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/system-settings', systemRoutes);
app.use('/api/v1/system', systemRoutes);
// app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/sessions', sessionsRoutes);
app.use('/api/v1/user-branches', userBranchRoutes);
app.use('/api/v1/product-branch-inventory', productBranchInventoryRoutes);
app.use('/api/v1/admin/queue', adminQueueRoutes);
app.use('/api/v1/admin/sms', adminSmsRoutes);

// ---------------------------------------------------------------------------
// 7. 404 catch-all — must come AFTER all routes
// ---------------------------------------------------------------------------
app.use(notFound);

// ---------------------------------------------------------------------------
// 8. Global error handler — must be last, Express identifies it by 4 params
// ---------------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
