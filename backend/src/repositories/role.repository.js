/**
 * role.repository.js  (Part 1 of 3 — Role CRUD)
 *
 * Pure data-access layer for the `roles` table. No bcrypt, no JWT, no
 * validation, no business rules, no audit logging — all of that belongs in
 * role.service.js. Every exported function is a thin wrapper around one SQL
 * statement.
 *
 * Requires migration_roles_is_system.sql AND migration_roles_soft_delete.sql.
 *
 * Soft delete: deleteRole() sets deleted_at rather than removing the row, so
 * anything that already references a deleted role_id (audit logs, etc.)
 * keeps resolving. Every read function here filters deleted_at IS NULL by
 * default — a deleted role is invisible to normal reads unless you go
 * looking for it directly by ID with full knowledge of what you're doing.
 *
 * Whether a role is *allowed* to be deleted (system role? still assigned to
 * users?) is a business rule, not a data-access concern — that decision
 * lives in role.service.js's canDeleteRole(), which will be built on top of
 * isSystemRole() and roleInUse() from Part 3. deleteRole() itself will
 * soft-delete any role_id it's given, no questions asked.
 *
 * On getAllRoles() / searchRoles() / paginateRoles(): these three need the
 * same underlying WHERE-clause logic (optional name/description search,
 * optional is_system filter, optional pagination), so rather than write
 * that three times, getAllRoles(filters) is the one real implementation and
 * the other two are thin wrappers over it. This also means a single
 * `GET /roles?q=&page=` request can call getAllRoles({ q, page, limit })
 * directly with everything combined, rather than the service layer having
 * to stitch together three separate calls.
 *
 * Transactions: every write function takes an optional `client` as its last
 * argument, defaulting to the shared pool. That's what lets role.service.js
 * compose multiple repository calls inside one transaction in Part 2 (e.g.
 * replacePermissions() needs removeAllPermissions() +
 * assignMultiplePermissions() to either both succeed or both roll back) —
 * the service checks out a client, runs BEGIN, passes that same client into
 * each repository call, then COMMIT/ROLLBACK. This file never has to know
 * what a transaction is to support that.
 */

const db = require('../config/db');

// ---------------------------------------------------------------------------
// Internal helper — SQL construction only, not a business rule
// ---------------------------------------------------------------------------

function buildRoleFilters({ q, isSystem } = {}) {
  const conditions = ['deleted_at IS NULL'];
  const values = [];

  if (q) {
    values.push(`%${q}%`);
    conditions.push(`(role_name ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }
  if (isSystem !== undefined) {
    values.push(isSystem);
    conditions.push(`is_system = $${values.length}`);
  }

  return { whereClause: `WHERE ${conditions.join(' AND ')}`, values };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

exports.createRole = async ({ roleName, description = null, isSystem = false }, client = db) => {
  const query = `
    INSERT INTO roles (role_name, description, is_system)
    VALUES ($1, $2, $3)
    RETURNING role_id, role_name, description, is_system, deleted_at;
  `;
  const { rows } = await client.query(query, [roleName, description, isSystem]);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

exports.getRoleById = async (roleId, client = db) => {
  const query = `
    SELECT role_id, role_name, description, is_system, deleted_at
    FROM roles
    WHERE role_id = $1 AND deleted_at IS NULL;
  `;
  const { rows } = await client.query(query, [roleId]);
  return rows[0];
};

exports.getRoleByName = async (roleName, client = db) => {
  const query = `
    SELECT role_id, role_name, description, is_system, deleted_at
    FROM roles
    WHERE role_name = $1 AND deleted_at IS NULL;
  `;
  const { rows } = await client.query(query, [roleName]);
  return rows[0];
};

// filters: { q?, isSystem?, page?, limit? } — all optional. Calling this
// with no arguments returns every non-deleted role, unpaginated.
exports.getAllRoles = async (filters = {}, client = db) => {
  const { whereClause, values } = buildRoleFilters(filters);
  let limitClause = '';

  if (filters.page || filters.limit) {
    const safeLimit = Math.min(Number(filters.limit) || 25, 10000);
    const safePage = Math.max(Number(filters.page) || 1, 1);
    const safeOffset = (safePage - 1) * safeLimit;
    limitClause = `LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  }

  const query = `
    SELECT role_id, role_name, description, is_system, deleted_at
    FROM roles
    ${whereClause}
    ORDER BY role_name
    ${limitClause};
  `;
  const { rows } = await client.query(query, values);
  return rows;
};

// Thin wrapper over getAllRoles() — see file header.
exports.searchRoles = async (searchTerm, client = db) => {
  return exports.getAllRoles({ q: searchTerm }, client);
};

// Thin wrapper over getAllRoles() — see file header.
exports.paginateRoles = async ({ page = 1, limit = 25 } = {}, client = db) => {
  return exports.getAllRoles({ page, limit }, client);
};

exports.roleExists = async (roleId, client = db) => {
  const query = `SELECT 1 FROM roles WHERE role_id = $1 AND deleted_at IS NULL;`;
  const { rows } = await client.query(query, [roleId]);
  return rows.length > 0;
};

// Mirrors the same filters as getAllRoles() so pagination metadata
// (total count) always matches whatever filtered page was requested.
exports.countRoles = async (filters = {}, client = db) => {
  const { whereClause, values } = buildRoleFilters(filters);
  const query = `SELECT COUNT(*) FROM roles ${whereClause};`;
  const { rows } = await client.query(query, values);
  return Number(rows[0].count);
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

// Deliberately accepts only roleName/description. is_system is set once at
// creation and never changed here — role.service.js enforces the "system
// roles can't be renamed" rule on top of this, by simply never passing
// roleName through for a role where isSystemRole() is true.
exports.updateRole = async (roleId, { roleName, description } = {}, client = db) => {
  const fields = [];
  const values = [];

  if (roleName !== undefined) { values.push(roleName); fields.push(`role_name = $${values.length}`); }
  if (description !== undefined) { values.push(description); fields.push(`description = $${values.length}`); }

  if (fields.length === 0) {
    return exports.getRoleById(roleId, client);
  }

  values.push(roleId);
  const query = `
    UPDATE roles
    SET ${fields.join(', ')}
    WHERE role_id = $${values.length} AND deleted_at IS NULL
    RETURNING role_id, role_name, description, is_system, deleted_at;
  `;
  const { rows } = await client.query(query, values);
  return rows[0];
};

// ---------------------------------------------------------------------------
// Delete (soft)
// ---------------------------------------------------------------------------

exports.deleteRole = async (roleId, client = db) => {
  const query = `
    UPDATE roles
    SET deleted_at = now()
    WHERE role_id = $1 AND deleted_at IS NULL
    RETURNING role_id, role_name, deleted_at;
  `;
  const { rows } = await client.query(query, [roleId]);
  return rows[0];
};

// ============================================================================
// Part 2 — Role Permissions (the `role_permissions` junction table)
//
// None of these functions check that roleId/permissionId actually exist
// before writing — that's what the FK constraints on role_permissions are
// for. An invalid ID surfaces as a foreign-key-violation error (code 23503)
// from the INSERT, which role.service.js is responsible for catching and
// translating into a meaningful response. Re-checking existence here would
// just be the repository re-implementing what the schema already enforces.
//
// hasPermission() is the one exception worth reading carefully: it joins
// against roles and requires deleted_at IS NULL. Soft-deleting a role does
// NOT cascade-delete its role_permissions rows (that only happens on a hard
// delete, via ON DELETE CASCADE) — the rows are left in place deliberately,
// in case the permission set is ever needed for audit/recovery purposes.
// That means a naive "does this junction row exist" check would keep
// granting access through a role that's supposed to be gone. Every other
// function below reads role_permissions by role_id directly without that
// check, since they're admin/inspection reads, not access-control gates.
// ============================================================================

// Upsert: if the pair already exists, this is a no-op that still returns
// the row (via the ON CONFLICT DO UPDATE no-op trick — ON CONFLICT DO
// NOTHING wouldn't return anything on a repeat call, which would make
// "was this newly assigned or already there" indistinguishable from "the
// insert silently failed").
exports.assignPermission = async (roleId, permissionId, client = db) => {
  const query = `
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES ($1, $2)
    ON CONFLICT (role_id, permission_id) DO UPDATE SET permission_id = EXCLUDED.permission_id
    RETURNING role_id, permission_id;
  `;
  const { rows } = await client.query(query, [roleId, permissionId]);
  return rows[0];
};

// Bulk insert via UNNEST rather than one round trip per permission.
// Already-assigned permissions in the list are silently skipped (ON
// CONFLICT DO NOTHING is fine here, unlike assignPermission above, since
// the return value is "which rows ended up newly inserted", not "give me
// back every row I asked for").
exports.assignMultiplePermissions = async (roleId, permissionIds = [], client = db) => {
  if (permissionIds.length === 0) return [];

  const query = `
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT $1, perm_id FROM UNNEST($2::uuid[]) AS perm_id
    ON CONFLICT (role_id, permission_id) DO NOTHING
    RETURNING role_id, permission_id;
  `;
  const { rows } = await client.query(query, [roleId, permissionIds]);
  return rows;
};

exports.removePermission = async (roleId, permissionId, client = db) => {
  const query = `
    DELETE FROM role_permissions
    WHERE role_id = $1 AND permission_id = $2
    RETURNING role_id, permission_id;
  `;
  const { rows } = await client.query(query, [roleId, permissionId]);
  return rows[0];
};

// Returns the permission_ids that were removed, so the service layer can
// log exactly what changed without a separate read beforehand.
exports.removeAllPermissions = async (roleId, client = db) => {
  const query = `
    DELETE FROM role_permissions
    WHERE role_id = $1
    RETURNING permission_id;
  `;
  const { rows } = await client.query(query, [roleId]);
  return rows.map(r => r.permission_id);
};

// NOT atomic by itself — this runs two separate statements (delete, then
// insert) against whatever `client` it's given. Called with the default
// pool, a failure between the two would leave the role with an empty
// permission set instead of its old or new one. role.service.js's
// replaceRolePermissions() is expected to check out a client, BEGIN, call
// this with that client, then COMMIT/ROLLBACK — see the file header.
exports.replacePermissions = async (roleId, permissionIds = [], client = db) => {
  await exports.removeAllPermissions(roleId, client);
  return exports.assignMultiplePermissions(roleId, permissionIds, client);
};

exports.getRolePermissions = async (roleId, client = db) => {
  const query = `
    SELECT p.permission_id, p.permission_name, p.description
    FROM role_permissions rp
    JOIN permissions p ON p.permission_id = rp.permission_id
    WHERE rp.role_id = $1
    ORDER BY p.permission_name;
  `;
  const { rows } = await client.query(query, [roleId]);
  return rows;
};

// Lighter-weight than getRolePermissions() — just the IDs, no join. Mainly
// for the service layer to diff "current permission set" against "desired
// permission set" without parsing full permission objects.
exports.getPermissionIds = async (roleId, client = db) => {
  const query = `SELECT permission_id FROM role_permissions WHERE role_id = $1;`;
  const { rows } = await client.query(query, [roleId]);
  return rows.map(r => r.permission_id);
};

// The access-control gate — see the Part 2 header comment on why this is
// the one function here that checks roles.deleted_at.
exports.hasPermission = async (roleId, permissionId, client = db) => {
  const query = `
    SELECT 1
    FROM role_permissions rp
    JOIN roles r ON r.role_id = rp.role_id AND r.deleted_at IS NULL
    WHERE rp.role_id = $1 AND rp.permission_id = $2;
  `;
  const { rows } = await client.query(query, [roleId, permissionId]);
  return rows.length > 0;
};

exports.countPermissions = async (roleId, client = db) => {
  const query = `SELECT COUNT(*) FROM role_permissions WHERE role_id = $1;`;
  const { rows } = await client.query(query, [roleId]);
  return Number(rows[0].count);
};

// Single INSERT...SELECT statement, so unlike replacePermissions() this one
// IS atomic on its own — no transaction needed regardless of which client
// it's called with. Existing permissions on the target role are left alone;
// this only adds whatever the source role has that the target doesn't.
exports.copyRolePermissions = async (sourceRoleId, targetRoleId, client = db) => {
  const query = `
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT $2, permission_id FROM role_permissions WHERE role_id = $1
    ON CONFLICT (role_id, permission_id) DO NOTHING
    RETURNING permission_id;
  `;
  const { rows } = await client.query(query, [sourceRoleId, targetRoleId]);
  return rows.map(r => r.permission_id);
};

// ============================================================================
// Part 3 — Statistics & Helper Methods
//
// canDeleteRole() from the original plan is intentionally NOT implemented
// here. It reduces to `!isSystemRole && !roleInUse` — pure boolean logic
// over two other functions' results, with no SQL of its own. That makes it
// a business rule, not a query, so it belongs in role.service.js, composed
// from isSystemRole() and roleInUse() below:
//
//   const canDeleteRole = async (roleId) =>
//     !(await roleRepo.isSystemRole(roleId)) && !(await roleRepo.roleInUse(roleId));
// ============================================================================

exports.getUsersByRole = async (roleId, client = db) => {
  const query = `
    SELECT user_id, full_name, username, email, branch_id, is_active
    FROM users
    WHERE role_id = $1
    ORDER BY full_name;
  `;
  const { rows } = await client.query(query, [roleId]);
  return rows;
};

exports.countUsersInRole = async (roleId, client = db) => {
  const query = `SELECT COUNT(*) FROM users WHERE role_id = $1;`;
  const { rows } = await client.query(query, [roleId]);
  return Number(rows[0].count);
};

// Slightly redundant with getRoleById() (Part 1) already returning
// is_system on the row — kept anyway because `if (await isSystemRole(id))`
// reads better in service code than fetching and destructuring a whole row
// just to check one flag.
exports.isSystemRole = async (roleId, client = db) => {
  const query = `SELECT is_system FROM roles WHERE role_id = $1 AND deleted_at IS NULL;`;
  const { rows } = await client.query(query, [roleId]);
  return rows.length > 0 && rows[0].is_system === true;
};

// Thin wrapper over getAllRoles() — same reasoning as searchRoles/paginateRoles in Part 1.
exports.getSystemRoles = async (client = db) => {
  return exports.getAllRoles({ isSystem: true }, client);
};

// Thin wrapper over getAllRoles().
exports.getCustomRoles = async (client = db) => {
  return exports.getAllRoles({ isSystem: false }, client);
};

exports.getRoleStatistics = async (client = db) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM roles WHERE deleted_at IS NULL) AS total_roles,
      (SELECT COUNT(*) FROM roles WHERE deleted_at IS NULL AND is_system = TRUE) AS system_roles,
      (SELECT COUNT(*) FROM roles WHERE deleted_at IS NULL AND is_system = FALSE) AS custom_roles,
      (SELECT COUNT(*) FROM role_permissions) AS total_permission_assignments,
      (SELECT COUNT(*) FROM roles r WHERE r.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.role_id)
      ) AS roles_with_no_permissions,
      (SELECT COUNT(*) FROM roles r WHERE r.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM users u WHERE u.role_id = r.role_id)
      ) AS roles_with_no_users;
  `;
  const { rows } = await client.query(query);
  const row = rows[0];
  return {
    totalRoles: Number(row.total_roles),
    systemRoles: Number(row.system_roles),
    customRoles: Number(row.custom_roles),
    totalPermissionAssignments: Number(row.total_permission_assignments),
    rolesWithNoPermissions: Number(row.roles_with_no_permissions),
    rolesWithNoUsers: Number(row.roles_with_no_users),
  };
};

// Minimal { role_id, role_name } pairs — nothing a dropdown doesn't need.
exports.getRolesDropdown = async (client = db) => {
  const query = `SELECT role_id, role_name FROM roles WHERE deleted_at IS NULL ORDER BY role_name;`;
  const { rows } = await client.query(query);
  return rows;
};

// Boolean primitive for role.service.js's canDeleteRole() — see the Part 3
// header. Uses EXISTS-style LIMIT 1 rather than a full COUNT, since this is
// purely a yes/no check and a role could in principle have many users.
exports.roleInUse = async (roleId, client = db) => {
  const query = `SELECT 1 FROM users WHERE role_id = $1 LIMIT 1;`;
  const { rows } = await client.query(query, [roleId]);
  return rows.length > 0;
};

exports.getRoleSummary = async (roleId, client = db) => {
  const query = `
    SELECT r.role_id, r.role_name, r.description, r.is_system, r.deleted_at,
           COUNT(DISTINCT u.user_id) AS user_count,
           COUNT(DISTINCT rp.permission_id) AS permission_count
    FROM roles r
    LEFT JOIN users u ON u.role_id = r.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
    WHERE r.role_id = $1 AND r.deleted_at IS NULL
    GROUP BY r.role_id;
  `;
  const { rows } = await client.query(query, [roleId]);
  if (!rows[0]) return undefined;
  return {
    ...rows[0],
    user_count: Number(rows[0].user_count),
    permission_count: Number(rows[0].permission_count),
  };
};
