
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

async function getLogs (rawFilters = {})  {
  const { page, limit } = normalisePagination(rawFilters.page, rawFilters.limit);
  const filters = { ...rawFilters, page, limit };

  const [logs, total] = await Promise.all([
    auditRepo.findAll(filters),
    auditRepo.count(filters),
  ]);

  return { logs, pagination: { page, limit, total } };
}

async function getLogById(auditId) {
  const log = await auditRepo.findById(auditId);
  if (!log) {
    throw new AppError('Audit log entry not found.', { code: 'AUDIT_LOG_NOT_FOUND', status: 404 });
  }
  return log;
};

async function getLogsByUser(userId, rawFilters = {}) {
  const { page, limit } = normalisePagination(rawFilters.page, rawFilters.limit);
  const filters = { ...rawFilters, userId, page, limit };

  const [logs, total] = await Promise.all([
    auditRepo.findAll(filters),
    auditRepo.count(filters),
  ]);

  return { logs, pagination: { page, limit, total } };
};

async function getLogsByEntity(entityType, entityId, rawFilters = {}) {
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

async function findById(auditId) {
  return auditRepo.findById(auditId);
}

async function findAll(filters) {
  return auditRepo.findAll(filters);
}

async function count(filters) {
  return auditRepo.count(filters);
}


async function listAudits (filters = {}) {
  const items = await auditRepo.findAll(filters);
  const total = await auditRepo.count(filters);
  return { items, total };
}

async function getAuditById(auditId) {
  return auditRepo.findById(auditId);
}

// For export we delegate to repository and let controller stream the rows
async function findForExport(filters = {}) {
  // set a high limit for exports (caller may override)
  filters.limit = Math.min(Number(filters.limit) || 10000, 100000);
  filters.page = 1;
  return auditRepo.findAll(filters);
}

module.exports = {
  // high-level query API used by controllers
  getLogs,
  getLogById,
  getLogsByUser,
  getLogsByEntity,
findForExport,
  listAudits,
  getAuditById,

  // low-level query API used by other services
  findForExport,
  // lower-level helpers (kept for backwards compatibility)
  findById,
  findAll,
  count,
};