/**
 * permission.repository.js
 *
 * Pure data-access layer for the `permissions` table. Same conventions as
 * role.repository.js: no validation, no business rules, no audit logging —
 * those belong in permission.service.js. Every write function takes an
 * optional `client` as its last argument (default = the pool) so it can be
 * composed into a transaction by a service that also needs to touch
 * role_permissions in the same call (e.g. "create this permission and
 * immediately assign it to role X" via role.repository.js's
 * assignPermission()).
 *
 * Permissions don't have an is_system flag or soft delete the way roles do
 * — there was no requirement calling for either, and unlike a role, nothing
 * downstream identifies a permission by name for authorization purposes
 * (role.repository.js's hasPermission() checks by permission_id), so
 * there's no equivalent "renaming this breaks middleware" risk to guard
 * against. deletePermission() is a real hard delete; role_permissions has
 * ON DELETE CASCADE on permission_id, so removing a permission definition
 * automatically removes it from every role that had it — which is the
 * correct behavior here, not a footgun like it would be for a branch or
 * category (see those files for why those needed an in-use guard and this
 * one doesn't).
 *
 * On getAllPermissions() / searchPermissions() / paginatePermissions(): same
 * pattern as role.repository.js Part 1 — one real query, two thin wrappers.
 */

const db = require('../config/db');

// ---------------------------------------------------------------------------
// Internal helper — SQL construction only, not a business rule
// ---------------------------------------------------------------------------

function buildPermissionFilters({ q } = {}) {
  const conditions = [];
  const values = [];

  if (q) {
    values.push(`%${q}%`);
    conditions.push(`(permission_name ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

exports.createPermission = async ({ permissionName, description = null }, client = db) => {
  const query = `
    INSERT INTO permissions (permission_name, description)
    VALUES ($1, $2)
    RETURNING permission_id, permission_name, description;
  `;
  const { rows } = await client.query(query, [permissionName, description]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

exports.getPermissionById = async (permissionId, client = db) => {
  const query = `
    SELECT permission_id, permission_name, description
    FROM permissions
    WHERE permission_id = $1;
  `;
  const { rows } = await client.query(query, [permissionId]);
  return rows[0];
};

exports.getPermissionByName = async (permissionName, client = db) => {
  const query = `
    SELECT permission_id, permission_name, description
    FROM permissions
    WHERE permission_name = $1;
  `;
  const { rows } = await client.query(query, [permissionName]);
  return rows[0];
};

// filters: { q?, page?, limit? } — all optional. Calling this with no
// arguments returns every permission, unpaginated.
exports.getAllPermissions = async (filters = {}, client = db) => {
  const { whereClause, values } = buildPermissionFilters(filters);
  let limitClause = '';

  if (filters.page || filters.limit) {
    const safeLimit = Math.min(Number(filters.limit) || 25, 100);
    const safePage = Math.max(Number(filters.page) || 1, 1);
    const safeOffset = (safePage - 1) * safeLimit;
    limitClause = `LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  }

  const query = `
    SELECT permission_id, permission_name, description
    FROM permissions
    ${whereClause}
    ORDER BY permission_name
    ${limitClause};
  `;
  const { rows } = await client.query(query, values);
  return rows;
};

// Thin wrapper over getAllPermissions() — see file header.
exports.searchPermissions = async (searchTerm, client = db) => {
  return exports.getAllPermissions({ q: searchTerm }, client);
};

// Thin wrapper over getAllPermissions() — see file header.
exports.paginatePermissions = async ({ page = 1, limit = 25 } = {}, client = db) => {
  return exports.getAllPermissions({ page, limit }, client);
};

exports.permissionExists = async (permissionId, client = db) => {
  const query = `SELECT 1 FROM permissions WHERE permission_id = $1;`;
  const { rows } = await client.query(query, [permissionId]);
  return rows.length > 0;
};

// Mirrors the same filters as getAllPermissions() so pagination metadata
// (total count) always matches whatever filtered page was requested.
//
// Note: role.repository.js also exports a countPermissions(), but that one
// takes a roleId and counts permissions assigned to that specific role.
// This one takes no roleId and counts permissions in the whole system.
// They're in different modules so there's no actual naming clash in code —
// just don't get the two confused when wiring up permission.service.js.
exports.countPermissions = async (filters = {}, client = db) => {
  const { whereClause, values } = buildPermissionFilters(filters);
  const query = `SELECT COUNT(*) FROM permissions ${whereClause};`;
  const { rows } = await client.query(query, values);
  return Number(rows[0].count);
};

// Which roles currently have this permission — useful for an "are you sure?
// N roles will lose this permission" confirmation before deletePermission().
exports.getRolesUsingPermission = async (permissionId, client = db) => {
  const query = `
    SELECT r.role_id, r.role_name
    FROM role_permissions rp
    JOIN roles r ON r.role_id = rp.role_id
    WHERE rp.permission_id = $1
    ORDER BY r.role_name;
  `;
  const { rows } = await client.query(query, [permissionId]);
  return rows;
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

exports.updatePermission = async (permissionId, { permissionName, description } = {}, client = db) => {
  const fields = [];
  const values = [];

  if (permissionName !== undefined) { values.push(permissionName); fields.push(`permission_name = $${values.length}`); }
  if (description !== undefined) { values.push(description); fields.push(`description = $${values.length}`); }

  if (fields.length === 0) {
    return exports.getPermissionById(permissionId, client);
  }

  values.push(permissionId);
  const query = `
    UPDATE permissions
    SET ${fields.join(', ')}
    WHERE permission_id = $${values.length}
    RETURNING permission_id, permission_name, description;
  `;
  const { rows } = await client.query(query, values);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Delete (hard — see file header for why this one doesn't soft-delete)
// ---------------------------------------------------------------------------

exports.deletePermission = async (permissionId, client = db) => {
  const query = `
    DELETE FROM permissions
    WHERE permission_id = $1
    RETURNING permission_id, permission_name;
  `;
  const { rows } = await client.query(query, [permissionId]);
  return rows[0];
};
