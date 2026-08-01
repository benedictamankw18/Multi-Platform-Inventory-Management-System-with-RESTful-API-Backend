const pool = require('../config/db');

const TABLE = 'sync_logs';

// URL/resource names (client-side) -> actual database tables.
// Entities not in this list are rejected, which also blocks SQL injection
// via the entity path parameter.
const ENTITY_TABLE_MAP = {
  products: 'products',
  categories: 'categories',
  suppliers: 'suppliers',
  customers: 'customers',
  branches: 'branches',
  expenses: 'expenses',
  'expense-categories': 'expense_categories',
  purchases: 'purchase_orders',
  sales: 'sales',
  users: 'users',
  roles: 'roles',
  inventories: 'product_branch_inventory',
  'inventory-transfers': 'inventory_transfers',
  inventory: 'product_branch_inventory',
  transfers: 'inventory_transfers',
  notifications: 'notifications',
};

function resolveTable(entity) {
  const table = ENTITY_TABLE_MAP[entity];
  if (!table) throw new Error(`Unsupported sync entity: ${entity}`);
  return table;
}

async function createSyncLog({ sync_id, device_id, local_transaction_id, entity_type, sync_status = 'PENDING', synced_at = null, error_message = null, retry_count = 0, sync_duration_ms = null } = {}) {
  const q = `
    INSERT INTO ${TABLE} (sync_id, device_id, local_transaction_id, entity_type, sync_status, synced_at, error_message, retry_count, sync_duration_ms, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now(), now())
    RETURNING *`;
  const vals = [sync_id || null, device_id, local_transaction_id, entity_type, sync_status, synced_at, error_message, retry_count, sync_duration_ms];
  const { rows } = await pool.query(q, vals);
  return rows[0];
}

async function getSyncLogById(syncId) {
  const q = `SELECT * FROM ${TABLE} WHERE sync_id = $1 LIMIT 1`;
  const { rows } = await pool.query(q, [syncId]);
  return rows[0] || null;
}

async function listSyncLogs({ entity, status, deviceId, since, limit = 50, offset = 0 } = {}) {
  let base = `SELECT * FROM ${TABLE}`;
  const params = [];
  const where = [];
  if (entity) { params.push(`%${entity}%`); where.push(`entity_type ILIKE $${params.length}`); }
  if (status) { params.push(status); where.push(`sync_status = $${params.length}`); }
  if (deviceId) { params.push(deviceId); where.push(`device_id = $${params.length}`); }
  if (since) { params.push(since); where.push(`created_at >= $${params.length}`); }
  if (where.length) base += ` WHERE ` + where.join(' AND ');
  params.push(limit); params.push(offset);
  base += ` ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await pool.query(base, params);
  return rows;
}

async function markSyncSuccess(syncId, syncedAt = null, durationMs = null) {
  const q = `UPDATE ${TABLE} SET sync_status = 'SUCCESS', synced_at = COALESCE($2, now()), sync_duration_ms = $3, updated_at = now() WHERE sync_id = $1 RETURNING *`;
  const { rows } = await pool.query(q, [syncId, syncedAt, durationMs]);
  return rows[0] || null;
}

async function markSyncFailed(syncId, errorMessage = null) {
  const q = `UPDATE ${TABLE} SET sync_status = 'FAILED', error_message = $2, retry_count = COALESCE(retry_count,0) + 1, updated_at = now() WHERE sync_id = $1 RETURNING *`;
  const { rows } = await pool.query(q, [syncId, errorMessage]);
  return rows[0] || null;
}

async function incrementRetry(syncId) {
  const q = `UPDATE ${TABLE} SET retry_count = COALESCE(retry_count,0) + 1, updated_at = now() WHERE sync_id = $1 RETURNING retry_count`;
  const { rows } = await pool.query(q, [syncId]);
  return rows[0] || null;
}

async function updateSyncLog(syncId, patch = {}) {
  const allowed = ['device_id','local_transaction_id','entity_type','sync_status','synced_at','error_message','retry_count','sync_duration_ms'];
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      params.push(patch[key]);
      idx++;
    }
  }
  if (!fields.length) return getSyncLogById(syncId);
  params.push(syncId);
  const q = `UPDATE ${TABLE} SET ${fields.join(', ')}, updated_at = now() WHERE sync_id = $${idx} RETURNING *`;
  const { rows } = await pool.query(q, params);
  return rows[0] || null;
}

async function getPendingSyncs({ limit = 100, olderThanSeconds = null } = {}) {
  let q = `SELECT * FROM ${TABLE} WHERE sync_status = 'PENDING'`;
  const params = [];
  if (olderThanSeconds) { params.push(olderThanSeconds); q += ` AND extract(epoch FROM now() - created_at) >= $${params.length}`; }
  params.push(limit);
  q += ` ORDER BY created_at ASC LIMIT $${params.length}`;
  const { rows } = await pool.query(q, params);
  return rows;
}

// Keep generic pull/push helpers for other entities — unchanged
async function pullChanges(entity, since) {
  const table = resolveTable(entity);
  const q = `SELECT * FROM "${table}" WHERE updated_at > $1 ORDER BY updated_at ASC`;
  const { rows } = await pool.query(q, [since]);
  return rows;
}

async function pushChanges(entity, items) {
    const client = await pool.connect();

    try {
        // Resolve entity to a real table via the allow-list to prevent SQL injection
        const table = resolveTable(entity);

        if (!Array.isArray(items) || items.length === 0) {
            return {
                success: true,
                processed: 0
            };
        }

        await client.query("BEGIN");

        for (const item of items) {
            if (!item || typeof item !== "object") {
                continue;
            }

            // Find primary key
            const idKey =
                Object.keys(item).find(k => k.endsWith("_id")) ||
                Object.keys(item).find(k => k === "id");

            if (!idKey) {
                throw new Error(`No primary key found for entity '${entity}'.`);
            }

            const id = item[idKey];

            if (id == null) {
                throw new Error(`'${idKey}' cannot be null.`);
            }

            const keys = Object.keys(item).filter(k => k !== idKey);

            const insertColumns = [idKey, ...keys];
            const insertValues = [id, ...keys.map(k => item[k])];
            const placeholders = insertColumns.map((_, i) => `$${i + 1}`);

            let sql;

            if (keys.length > 0) {
                const updateClause = keys
                    .map(k => `"${k}" = EXCLUDED."${k}"`)
                    .join(", ");

                sql = `
                    INSERT INTO "${table}"
                    (${insertColumns.map(c => `"${c}"`).join(", ")})
                    VALUES (${placeholders.join(", ")})
                    ON CONFLICT ("${idKey}")
                    DO UPDATE SET ${updateClause};
                `;
            } else {
                sql = `
                    INSERT INTO "${table}"
                    ("${idKey}")
                    VALUES ($1)
                    ON CONFLICT ("${idKey}")
                    DO NOTHING;
                `;
            }

            // Uncomment for debugging
            // console.log(sql);
            // console.log(insertValues);

            await client.query(sql, insertValues);
        }

        await client.query("COMMIT");

        return {
            success: true,
            processed: items.length
        };

    } catch (err) {
        await client.query("ROLLBACK");

        console.error("pushChanges Error:", {
            entity,
            message: err.message
        });

        throw err;

    } finally {
        client.release();
    }
}

async function getLastSync(entity) {
  const q = `SELECT * FROM ${TABLE} WHERE entity_type = $1 ORDER BY synced_at DESC LIMIT 1`;
  const { rows } = await pool.query(q, [entity]);
  return rows[0] || null;
}


module.exports = {
  createSyncLog,
  getSyncLogById,
  listSyncLogs,
  markSyncSuccess,
  markSyncFailed,
  incrementRetry,
  updateSyncLog,
  getPendingSyncs,
  pullChanges,
  getLastSync,
  pushChanges,
  resolveTable,
};
