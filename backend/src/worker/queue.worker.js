// Load environment variables early so modules that read process.env (eg. DB config)
// get the values when they are required.
require('dotenv').config();
const queueService = require('../services/queue.service');
const notificationService = require('../services/notification.service');

const LOW_STOCK_SCAN_INTERVAL_MS =
  (Number(process.env.LOW_STOCK_SCAN_INTERVAL_MIN || 30) || 30) * 60 * 1000;

async function runLoop() {
  const intervalMs = Number(process.env.QUEUE_WORKER_INTERVAL_MS || 30000);
  let lastLowStockScanAt = 0;
  console.log('[queue.worker] starting, intervalMs=', intervalMs);
  while (true) {
    try {
      const r = await queueService.processPending({ limit: 50 });
      if (r && r.processed) console.log('[queue.worker] processed', r.processed);
    } catch (e) {
      console.error('[queue.worker] error', e && e.message);
    }
    // Periodic low-stock scan — the catch-all for states that never pass
    // through a stock transaction or sale (adjustments, transfers, stale-low).
    // 24h dedup inside the notification service prevents notification spam.
    if (Date.now() - lastLowStockScanAt >= LOW_STOCK_SCAN_INTERVAL_MS) {
      lastLowStockScanAt = Date.now();
      try {
        const result = await notificationService.scanLowStock();
        if (result && result.created) {
          console.log('[queue.worker] low-stock scan created', result.created);
        }
      } catch (e) {
        console.error('[queue.worker] low-stock scan error', e && e.message);
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}

if (require.main === module) {
  runLoop().catch((e) => {
    console.error('[queue.worker] fatal error', e && e.message);
    process.exit(1);
  });
}

module.exports = { runLoop };
