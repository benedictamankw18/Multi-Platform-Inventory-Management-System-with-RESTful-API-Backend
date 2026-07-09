/**
 * audit.validation.js  (NFR-018, NFR-019)
 *
 * Validates every audit route's inputs — query params, route params, and
 * date formats. All routes are read-only, so there are no body validators.
 *
 * Date strings must be ISO 8601 format (YYYY-MM-DD or full ISO timestamp).
 * PostgreSQL accepts both for TIMESTAMP comparisons.
 */

const { query, param } = require('express-validator');
const { uuidParam }    = require('./common.validation');

// Shared pagination + date-range query params, reused across several routes.
const paginationAndDateFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date (e.g. 2025-01-01).'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date (e.g. 2025-12-31).'),

  query('action')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('action filter cannot exceed 100 characters.'),
];

// ---------------------------------------------------------------------------
// GET /api/v1/audit
// ---------------------------------------------------------------------------

exports.listLogsValidation = [
  ...paginationAndDateFilters,

  query('userId')
    .optional()
    .isUUID()
    .withMessage('userId must be a valid UUID.'),

  query('entityType')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('entityType cannot exceed 50 characters.'),

  query('entityId')
    .optional()
    .isUUID()
    .withMessage('entityId must be a valid UUID.'),
];

// ---------------------------------------------------------------------------
// GET /api/v1/audit/:auditId
// ---------------------------------------------------------------------------

exports.auditIdValidation = [
  uuidParam('auditId', 'audit log ID'),
];

// ---------------------------------------------------------------------------
// GET /api/v1/audit/users/:userId
// ---------------------------------------------------------------------------

exports.userAuditValidation = [
  uuidParam('userId', 'user ID'),
  ...paginationAndDateFilters,
];

// ---------------------------------------------------------------------------
// GET /api/v1/audit/entity/:entityType/:entityId
// ---------------------------------------------------------------------------

exports.entityAuditValidation = [
  param('entityType')
    .trim()
    .notEmpty()
    .withMessage('entityType is required.')
    .isLength({ max: 50 })
    .withMessage('entityType cannot exceed 50 characters.'),

  uuidParam('entityId', 'entity ID'),

  ...paginationAndDateFilters,
];


exports.listAuditsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('user_id').optional().isUUID(),
];

exports.exportAuditsValidation = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('user_id').optional().isUUID(),
  query('format').optional().isIn(['csv', 'xlsx']),
  query('fields').optional(),
];
