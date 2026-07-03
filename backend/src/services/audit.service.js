/**
 * audit.service.js
 *
 * Read-only business logic for the audit log (NFR-018, NFR-019).
 * Writes are handled by every other service calling
 * auditRepo.writeLog() directly — centralised writing lives in the
 * repository, not here. This service is purely for querying the log.
 *
 *   getLogs(filters)                  paginated list with optional filters
 *   getLogById(auditId)               single entry, 404 if not found
 *   getLogsByUser(userId, filters)    all actions by a specific user
 *   getLogsByEntity(type, id, filters) all actions on a specific entity
 *
 * § Error contract
 * Throws AppError on business-rule violations so the controller only needs:
 *   try { ... }
 *   catch (err) { res.status(err.status || 500).json({ message: err.message }); }
 */

const auditRepo = require('../repositories/audit.repository');
const AppError  = require('../utils/AppError');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalisePagination(page, limit) {
  return {
    page:  Math.max(Number(page)  || 1,   1),
    limit: Math.min(Number(limit) || 25, 100),
  };
}

// ---------------------------------------------------------------------------
// § Read
// ---------------------------------------------------------------------------

exports.getLogs = async (rawFilters = {}) => {
  const { page, limit } = normalisePagination(rawFilters.page, rawFilters.limit);
  const filters = { ...rawFilters, page, limit };

  const [logs, total] = await Promise.all([
    auditRepo.findAll(filters),
    auditRepo.count(filters),
  ]);

  return { logs, pagination: { page, limit, total } };
};

exports.getLogById = async (auditId) => {
  const log = await auditRepo.findById(auditId);
  if (!log) {
    throw new AppError('Audit log entry not found.', { code: 'AUDIT_LOG_NOT_FOUND', status: 404 });
  }
  return log;
};

exports.getLogsByUser = async (userId, rawFilters = {}) => {
  const { page, limit } = normalisePagination(rawFilters.page, rawFilters.limit);
  const filters = { ...rawFilters, userId, page, limit };

  const [logs, total] = await Promise.all([
    auditRepo.findAll(filters),
    auditRepo.count(filters),
  ]);

  return { logs, pagination: { page, limit, total } };
};

exports.getLogsByEntity = async (entityType, entityId, rawFilters = {}) => {
  if (!entityType) {
    throw new AppError('entityType is required.', { code: 'VALIDATION_ERROR', status: 400 });
  }

  const { page, limit } = normalisePagination(rawFilters.page, rawFilters.limit);
  const filters = { ...rawFilters, entityType, entityId, page, limit };

  const [logs, total] = await Promise.all([
    auditRepo.findAll(filters),
    auditRepo.count(filters),
  ]);

  return { logs, pagination: { page, limit, total } };
};
