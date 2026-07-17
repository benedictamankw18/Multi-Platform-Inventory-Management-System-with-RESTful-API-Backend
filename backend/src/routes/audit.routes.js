// Restrict audit endpoints to administrators

/**
 * audit.routes.js  (NFR-018, NFR-019)
 *
 * Mounted at /api/v1/audit in the main app.
 * All routes are read-only and restricted to Administrator / Business Owner.
 *
 * Route ORDER matters — static paths (/users/:userId, /entity/:type/:id)
 * must be registered BEFORE /:auditId, otherwise Express matches "users"
 * and "entity" as values for the :auditId UUID param.
 */

const express = require('express');
const router  = express.Router();

const authenticate    = require('../middleware/auth.middleware');
const auditController = require('../controllers/audit.controller');
const authorize       = require('../middleware/role.middleware');
const validate        = require('../middleware/validation.middleware');

const {
  listLogsValidation,
  auditIdValidation,
  userAuditValidation,
  entityAuditValidation,
  exportAuditsValidation,
  listAuditsValidation,
} = require('../validations/audit.validation');

// All audit routes: must be authenticated + admin-level role (NFR-018)
router.use(authenticate, authorize('Administrator', 'Business Owner'));

// --- Static paths BEFORE /:auditId ---
router.get('/users/:userId',  userAuditValidation,   validate, auditController.getLogsByUser);
router.get('/entity/:entityType/:entityId',  entityAuditValidation, validate, auditController.getLogsByEntity);

// --- Collection ---
router.get('/', listLogsValidation, validate, auditController.getLogs);
router.get('/count', authenticate, validate, auditController.count);
router.get('/export', exportAuditsValidation, validate, auditController.exportAudits);

// --- Single entry — registered last so "users" / "entity" aren't captured here ---
router.get('/:auditId', auditIdValidation, validate, auditController.getLogById);

// router.get('/getAudits', listAuditsValidation, validate, auditController.getAudits);
// router.get('/:id', auditIdValidation, validate, auditController.getAuditById);
// router.get('/', authenticate, validate, auditController.list);
// router.get('/:auditId', authenticate, validate, auditController.getById);


module.exports = router;
