/**
 * idempotency.middleware.js
 *
 * Server-side idempotency guard for offline-queued client mutations.
 *
 * Clients stamp every queued mutation with an idempotency key and re-send the
 * same body on every retry, so a replay can be recognized and deduplicated.
 * This middleware claims the key in the existing sync_logs table
 * (UNIQUE (device_id, local_transaction_id)); if the key was already applied
 * it answers 200 with duplicate:true and the mutation never runs a second time.
 *
 * The key field is configurable: non-sale mutations use client_mutation_id
 * (the default), while POST /sales keys on local_transaction_id via
 * idempotency('sales', { keyField: 'local_transaction_id' }).
 *
 * It is opt-in: requests WITHOUT a body key are passed through untouched, so
 * normal online traffic is unaffected.
 */

const syncRepo = require('../repositories/sync.repository');

module.exports = function idempotency(entity, { keyField = 'client_mutation_id' } = {}) {
  return async (req, res, next) => {
    const key = req.body?.[keyField];
    if (!key || typeof key !== 'string' || key.length === 0) {
      return next();
    }

    const deviceId = req.headers['x-device-id'] || 'unknown-device';

    try {
      const existing = await syncRepo.getSyncLogByDeviceAndKey(deviceId, key);
      if (existing) {
        if (existing.sync_status === 'FAILED') {
          // A previous attempt was rejected (validation/domain error) and the
          // user chose Retry — delete the old record and try once more.
          await syncRepo.deleteSyncLog(existing.sync_id);
        } else {
          // SUCCESS (already applied) or PENDING (concurrent replay in flight)
          // — never apply twice.
          return res.status(200).json({
            success: true,
            duplicate: true,
            message: 'Duplicate request ignored.',
          });
        }
      }

      const log = await syncRepo.claimIdempotencyKey(deviceId, key, entity);
      if (!log) {
        // Lost a race against another request carrying the same key.
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Duplicate request ignored.',
        });
      }

      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          syncRepo.markSyncSuccess(log.sync_id).catch(() => {});
        } else if (res.statusCode >= 400 && res.statusCode < 500) {
          // Permanent client error — the entry will be surfaced as FAILED and
          // the user can Retry (which deletes this record and re-runs).
          syncRepo.markSyncFailed(log.sync_id, 'Replayed mutation rejected by API.').catch(() => {});
        }
        // >=500 stays PENDING so the client auto-retries later.
      });

      next();
    } catch (err) {
      // Idempotency infra failure must never block the mutation itself.
      next();
    }
  };
};
