/**
 * audit.controller.js  (thin)
 *
 * HTTP mapping only — Request → Service → Response.
 * All query logic lives in audit.service.js.
 *
 * Routes (wired in audit.routes.js):
 *   GET /api/v1/audit                              getLogs
 *   GET /api/v1/audit/:auditId                     getLogById
 *   GET /api/v1/audit/users/:userId                getLogsByUser
 *   GET /api/v1/audit/entity/:entityType/:entityId getLogsByEntity
 */

const auditService = require('../services/audit.service');

function handleError(res, err) {
  console.error('[audit.controller]', err.message);
  return res.status(err.status || 500).json({ message: err.message || 'An unexpected error occurred.' });
}

// ---------------------------------------------------------------------------
// GET /api/v1/audit
// Query: ?userId=&action=&entityType=&entityId=&startDate=&endDate=&page=&limit=
// ---------------------------------------------------------------------------

exports.getLogs = async (req, res) => {
  try {
    const result = await auditService.getLogs(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/audit/:auditId
// ---------------------------------------------------------------------------

exports.getLogById = async (req, res) => {
  try {
    const log = await auditService.getLogById(req.params.auditId);
    return res.status(200).json({ log });
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/audit/users/:userId
// Query: ?action=&startDate=&endDate=&page=&limit=
// ---------------------------------------------------------------------------

exports.getLogsByUser = async (req, res) => {
  try {
    const result = await auditService.getLogsByUser(req.params.userId, req.query);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/audit/entity/:entityType/:entityId
// Query: ?action=&startDate=&endDate=&page=&limit=
// ---------------------------------------------------------------------------

exports.getLogsByEntity = async (req, res) => {
  try {
    const result = await auditService.getLogsByEntity(
      req.params.entityType,
      req.params.entityId,
      req.query
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};
