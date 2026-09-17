const syncRepo = require('../repositories/sync.repository');
const { resolveTable } = require('../repositories/sync.repository');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

function assertSupportedEntity(entity) {
  try {
    resolveTable(entity);
  } catch (e) {
    throw new AppError(e.message, { code: 'INVALID_ENTITY', status: 400 });
  }
}

async function getLastSync(entity) {
  return syncRepo.getLastSync(entity);
}

async function pull(entity, since, branchId) {
  assertSupportedEntity(entity);
  try {
    const sinceTs = since || '1970-01-01T00:00:00Z';
    const rows = await syncRepo.pullChanges(entity, sinceTs, branchId);
    const syncId = uuidv4();
    const localTransactionId = uuidv4();
    const deviceId = uuidv4();
    await syncRepo.createSyncLog({ sync_id: syncId, device_id: deviceId, local_transaction_id: localTransactionId, entity_type: entity, sync_status: 'SUCCESS', synced_at: new Date().toISOString(), error_message: `pulled ${rows.length} rows` });
    return rows;
  } catch (e) {
    const syncId = uuidv4();
    const localTransactionId = uuidv4();
    const deviceId = uuidv4();
    await syncRepo.createSyncLog({ sync_id: syncId, device_id: deviceId, local_transaction_id: localTransactionId, entity_type: entity, sync_status: 'FAILED', synced_at: new Date().toISOString(), error_message: e.message });
    await notificationService.createSyncFailureNotification({ entity, errorMessage: e.message, performedBy: null }).catch(() => {});
    throw e;
  }
}

async function push(entity, items) {
  if (!Array.isArray(items)) throw new Error('items must be an array');
  assertSupportedEntity(entity);
  try {
    const result = await syncRepo.pushChanges(entity, items);
    const syncId = uuidv4();
    const deviceId = uuidv4();
    const localTransactionId = uuidv4();
    await syncRepo.createSyncLog({ sync_id: syncId, device_id: deviceId, local_transaction_id: localTransactionId, entity_type: entity, sync_status: 'SUCCESS', synced_at: new Date().toISOString(), error_message: `pushed ${items.length} items` });
    return result;
  } catch (e) {
    const syncId = uuidv4();
    const deviceId = uuidv4();
    const localTransactionId = uuidv4();
    await syncRepo.createSyncLog({ sync_id: syncId, device_id: deviceId, local_transaction_id: localTransactionId, entity_type: entity, sync_status: 'FAILED', synced_at: new Date().toISOString(), error_message: e.message });
    await notificationService.createSyncFailureNotification({ entity, errorMessage: e.message, performedBy: null }).catch(() => {});
    throw e;
  }
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
        await notificationService.createSyncFailureNotification({ entity: entity_type, errorMessage: e.message, performedBy: null }).catch(() => {});
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
  const { page = 1, limit = 50, ...rest } = filters;
  const offset = (Number(page) - 1) * Number(limit);
  return syncRepo.listSyncLogs({ ...rest, limit: Number(limit), offset });
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

