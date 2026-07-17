const syncRepo = require('../repositories/sync.repository');
const { v4: uuidv4 } = require('uuid');

async function getLastSync(entity) {
  return syncRepo.getLastSync(entity);
}

async function pull(entity, since) {
  // validate inputs minimally
  const sinceTs = since || '1970-01-01T00:00:00Z';
  const rows = await syncRepo.pullChanges(entity, sinceTs);
  const syncId = uuidv4();
  const localTransactionId = uuidv4(); // Could be passed in if needed
  const deviceId = uuidv4(); // In a real scenario, this could be passed in or determined from context
  await syncRepo.createSyncLog({ sync_id: syncId, device_id: deviceId, local_transaction_id: localTransactionId, entity_type: entity, sync_status: 'SUCCESS', synced_at: new Date().toISOString(), error_message: `pulled ${rows.length} rows` });
  return rows;
}

async function push(entity, items) {
  if (!Array.isArray(items)) throw new Error('items must be an array');
  const result = await syncRepo.pushChanges(entity, items);
  const syncId = uuidv4();
  const deviceId = uuidv4(); // In a real scenario, this could be passed in or determined from context
  const localTransactionId = uuidv4(); // Could be passed in if needed
  await syncRepo.createSyncLog({ sync_id: syncId, device_id: deviceId, local_transaction_id: localTransactionId, entity_type: entity, sync_status: 'SUCCESS', synced_at: new Date().toISOString(), error_message: `pushed ${items.length} items` });
  return result;
}

// ---- Global sync helpers -------------------------------------------------
async function pushGlobal({ source = null, target = null, batch_id = null, sync_payload = [] } = {}) {
  if (!sync_payload || !Array.isArray(sync_payload)) throw new Error('sync_payload must be an array');
  // create a sync log per item in payload
  const logs = [];
  for (const it of sync_payload) {
    const sync_id = it.sync_id || it.batch_id || batch_id || null;
    const device_id = source || uuidv4();
    const local_transaction_id = it.local_transaction_id || null;
    const entity_type = it.entity || it.entity_type || null;
    const syncId = uuidv4();
    const localTransactionId = uuidv4(); // Could be passed in if needed
    const created = await syncRepo.createSyncLog({ sync_id: syncId, device_id, local_transaction_id: localTransactionId, entity_type, sync_status: 'PENDING' });
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
  const syncId = uuidv4();
  const deviceId = source || uuidv4();
  const localTransactionId = uuidv4(); // Could be passed in if needed
  await syncRepo.createSyncLog({ sync_id: syncId, device_id: deviceId, local_transaction_id: localTransactionId, entity_type: entity, sync_status: 'SUCCESS', synced_at: new Date().toISOString(), error_message: `pulled ${rows.length} rows` });
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
module.exports = {
  getLastSync,
  pull,
  push,
  pushGlobal,
  pullGlobal,
  listSyncLogs,
  retrySync,
};

