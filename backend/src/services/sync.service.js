const syncRepo = require('../repositories/sync.repository');

async function getLastSync(entity) {
  return syncRepo.getLastSync(entity);
}

async function pull(entity, since) {
  // validate inputs minimally
  const sinceTs = since || '1970-01-01T00:00:00Z';
  const rows = await syncRepo.pullChanges(entity, sinceTs);
  await syncRepo.createSyncLog({ sync_id: null, device_id: null, local_transaction_id: null, entity_type: entity, sync_status: 'SUCCESS', synced_at: new Date().toISOString(), error_message: `pulled ${rows.length} rows` });
  return rows;
}

async function push(entity, items) {
  if (!Array.isArray(items)) throw new Error('items must be an array');
  const result = await syncRepo.pushChanges(entity, items);
  await syncRepo.createSyncLog({ sync_id: null, device_id: null, local_transaction_id: null, entity_type: entity, sync_status: 'SUCCESS', synced_at: new Date().toISOString(), error_message: `pushed ${items.length} items` });
  return result;
}

module.exports = {
  getLastSync,
  pull,
  push,
};

// ---- Global sync helpers -------------------------------------------------
async function pushGlobal({ source = null, target = null, batch_id = null, sync_payload = [] } = {}) {
  if (!sync_payload || !Array.isArray(sync_payload)) throw new Error('sync_payload must be an array');
  // create a sync log per item in payload
  const logs = [];
  for (const it of sync_payload) {
    const sync_id = it.sync_id || it.batch_id || batch_id || null;
    const device_id = source || null;
    const local_transaction_id = it.local_transaction_id || null;
    const entity_type = it.entity || it.entity_type || null;
    const created = await syncRepo.createSyncLog({ sync_id, device_id, local_transaction_id, entity_type, sync_status: 'PENDING' });
    logs.push(created);
    // optionally push changes immediately for supported entities
    if (entity_type && it.items && Array.isArray(it.items)) {
      try {
        await syncRepo.pushChanges(entity_type, it.items);
        await syncRepo.markSyncSuccess(created.sync_id);
      } catch (e) {
        await syncRepo.markSyncFailed(created.sync_id, e.message);
      }
    }
  }
  return logs;
}

async function pullGlobal({ source = null, target = null, entity = null, since = null } = {}) {
  if (!entity) throw new Error('entity is required');
  const rows = await syncRepo.pullChanges(entity, since || '1970-01-01T00:00:00Z');
  await syncRepo.createSyncLog({ sync_id: null, device_id: source || null, local_transaction_id: null, entity_type: entity, sync_status: 'SUCCESS', synced_at: new Date().toISOString(), error_message: `pulled ${rows.length} rows` });
  return rows;
}

async function listSyncLogs(filters = {}) {
  return syncRepo.listSyncLogs(filters);
}

async function retrySync(sync_id) {
  const log = await syncRepo.getSyncLogById(sync_id);
  if (!log) throw new Error('Sync log not found');
  // For retry, mark status back to PENDING and increment retry_count
  await syncRepo.incrementRetry(sync_id);
  const updated = await syncRepo.updateSyncLog(sync_id, { sync_status: 'PENDING' });
  return updated;
}

// Export new helpers
module.exports.pushGlobal = pushGlobal;
module.exports.pullGlobal = pullGlobal;
module.exports.listSyncLogs = listSyncLogs;
module.exports.retrySync = retrySync;

