// Load environment variables early so modules that read process.env (eg. DB config)
// get the values when they are required.
require('dotenv').config();
const queueService = require('../services/queue.service');

async function runLoop() {
  const intervalMs = Number(process.env.QUEUE_WORKER_INTERVAL_MS || 30000);
  console.log('[queue.worker] starting, intervalMs=', intervalMs);
  while (true) {
    try {
      const r = await queueService.processPending({ limit: 50 });
      if (r && r.processed) console.log('[queue.worker] processed', r.processed);
    } catch (e) {
      console.error('[queue.worker] error', e && e.message);
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
