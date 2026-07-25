/**
 * audit.repository.js
 *
 * Shared data-access layer for the `audit_logs` table (NFR-018, NFR-019).
 * Every service in this codebase writes audit entries through here rather
 * than each one embedding its own INSERT — one place to change if the
 * table schema or retention policy ever needs updating.
 *
 * writeLog() is intentionally fire-and-forget friendly: callers can
 * await it to guarantee the write before responding, or they can call it
 * without await if they'd rather not slow down the happy path. Either way,
 * errors here must never crash the caller — they're swallowed and logged
 * to the console, since a failed audit entry should never roll back a
 * legitimate business operation.
 *
 * The optional `client` parameter (defaulting to the shared pool) supports
 * service-layer transaction scenarios where the audit entry needs to be
 * written inside the same transaction as the business operation — e.g. a
 * service that wants "role deleted" in the audit log to roll back alongside
 * the role deletion itself if something goes wrong.
 */

const db = require('../config/db');

exports.writeLog = async (
  userId,
  action,
  entityType,
  entityId,
  details = null,
  client = db
) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING audit_id, created_at;
    `;
    const { rows } = await client.query(query, [
      userId   || null,
      action,
      entityType,
      entityId || null,
      details  !== null ? JSON.stringify(details) : null,
    ]);
    return rows[0];
  } catch (err) {
    // Audit failures must never propagate — log and move on.
    console.error(`[audit.repository] Failed to write audit log (action=${action}):`, err.message);
    return null;
  }
};

// ============================================================================
// Extended: read methods + ip_address write support
// Added to support audit.service.js, audit.controller.js (NFR-018, NFR-019)
// ============================================================================

// ---------------------------------------------------------------------------
// Internal helper — builds WHERE clause from optional filters
// ---------------------------------------------------------------------------
function buildFilters({ userId, action, entityType, entityId, startDate, endDate } = {}) {
  const conditions = [];
  const values = [];

  if (userId)     { values.push(userId);                    conditions.push(`a.user_id = $${values.length}`); }
  if (action)     { values.push(`%${action}%`);             conditions.push(`a.action ILIKE $${values.length}`); }
  if (entityType) { values.push(entityType.toUpperCase());  conditions.push(`a.entity_type = $${values.length}`); }
  if (entityId)   { values.push(entityId);                  conditions.push(`a.entity_id = $${values.length}`); }
  if (startDate)  { values.push(startDate);                 conditions.push(`a.created_at >= $${values.length}`); }
  if (endDate)    { values.push(endDate);                   conditions.push(`a.created_at <= $${values.length}`); }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

// ---------------------------------------------------------------------------
// writeLogFull — like writeLog() but also captures ip_address.
// Used by audit.middleware.js so HTTP requests get their source IP recorded.
// The original writeLog() signature is kept unchanged for backward compat.
// ---------------------------------------------------------------------------
exports.writeLogFull = async (
  { userId, action, entityType, entityId, details = null, ipAddress = null },
  client = db
) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING audit_id, created_at;
    `;
    const { rows } = await client.query(query, [
      userId     || null,
      action,
      entityType || null,
      entityId   || null,
      details    !== null ? JSON.stringify(details) : null,
      ipAddress  || null,
    ]);
    return rows[0];
  } catch (err) {
    console.error(`[audit.repository] writeLogFull failed (action=${action}):`, err.message);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Read methods
// ---------------------------------------------------------------------------

exports.findById = async (auditId, client = db) => {
  const query = `
    SELECT a.audit_id, a.user_id, a.action, a.entity_type, a.entity_id,
           a.details, a.ip_address, a.created_at,
           u.username, u.full_name
    FROM audit_logs a
    LEFT JOIN users u ON u.user_id = a.user_id
    WHERE a.audit_id = $1;
  `;
  const { rows } = await client.query(query, [auditId]);
  return rows[0];
};

exports.findAll = async (filters = {}, client = db) => {
  const { whereClause, values } = buildFilters(filters);
  const safeLimit  = Math.min(Number(filters.limit)  || 25, 10000);
  const safePage   = Math.max(Number(filters.page)   ||  1,   1);
  const safeOffset = (safePage - 1) * safeLimit;
  const query = `
    SELECT a.audit_id, a.user_id, a.action, a.entity_type, a.entity_id,
           a.details, a.ip_address, a.created_at,
           u.username
    FROM audit_logs a
    LEFT JOIN users u ON u.user_id = a.user_id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset};
  `;
  const { rows } = await client.query(query, values);
  return rows;
};

exports.count = async (filters = {}, client = db) => {
  const { whereClause, values } = buildFilters(filters);
  const query = `SELECT COUNT(*) FROM audit_logs a ${whereClause};`;
  const { rows } = await client.query(query, values);
  return Number(rows[0].count);
};
